/**
 * "O Timão pelo mapa": onde o Corinthians jogou, no Brasil (por cidade e
 * estado) e no mundo (por país). Mapa desenhado em SVG com as cores do tema.
 *
 * /mapa (Brasil) · /mapa?visao=mundo
 */

import { api } from '../core/api.js';
import { html } from '../core/html.js';
import { replaceQuery } from '../core/router.js';
import { CORES, criarTooltip, svgEl, tabelaDoGrafico } from '../components/charts.js';
import { card, pageHeader } from '../components/layout.js';
import { barrasDesempenho, corAproveitamento, rankList } from '../components/stats.js';
import { formatarNumero, formatarPorcentagem, plural } from '../utils/format.js';

const RAIO_MAX = 22;
const RAIO_MIN = 2.5;
const OPACIDADE = { min: 0.05, max: 0.42 };
const DURACAO_ZOOM_MS = 450;
/** A partir deste zoom, mostra o nome das cidades com pelo menos MIN_JOGOS_ROTULO jogos. */
const ZOOM_ROTULOS = 2.5;
const MIN_JOGOS_ROTULO = 20;

/** Base geográfica (arquivos estáticos, com cache do navegador). */
const bases = new Map();
async function base(nome, signal) {
    if (!bases.has(nome)) {
        const resposta = await fetch(`/assets/geo/${nome}.json`, { signal });
        if (!resposta.ok) throw new Error('Não foi possível carregar o mapa.');
        bases.set(nome, await resposta.json());
    }
    return bases.get(nome);
}

/** Escala logarítmica de 0 a 1 (São Paulo tem 3.688 jogos; a maioria das cidades, poucos). */
const escalaLog = (valor, maximo) => (valor > 0 ? Math.log1p(valor) / Math.log1p(maximo) : 0);

function textoResumo(item) {
    return `${item.vitorias}V ${item.empates}E ${item.derrotas}D · ${formatarPorcentagem(item.aproveitamento)}`;
}

function detalhe(item, titulo) {
    if (!item) {
        return html`<p class="text-gray-400 text-sm">
            Passe o mouse ou toque em uma cidade, estado ou país para ver o retrospecto.
        </p>`;
    }
    return html`
        <div class="space-y-4">
            <div>
                <p class="text-xs text-gray-400 uppercase font-bold">${titulo}</p>
                <p class="text-2xl font-display font-bold text-white">${item.nome ?? item.uf}</p>
                <p class="text-sm text-gray-400">
                    ${plural(item.jogos, 'jogo')}${item.estadios ? ` · ${plural(item.estadios, 'estádio')}` : ''} ·
                    <span class="${corAproveitamento(item.aproveitamento)}"
                        >${formatarPorcentagem(item.aproveitamento)}</span
                    >
                </p>
            </div>
            ${barrasDesempenho(item)}
        </div>
    `;
}

function abas(visao) {
    const aba = (id, rotulo) => html`
        <a
            href="/mapa${id === 'mundo' ? '?visao=mundo' : ''}"
            class="px-4 py-2 rounded-lg text-sm font-bold transition ${visao === id ? 'bg-white text-black' : 'text-gray-300 hover:text-white hover:bg-white/5'}"
            aria-current="${visao === id ? 'page' : 'false'}"
            >${rotulo}</a
        >
    `;
    return html`<nav
        class="inline-flex gap-1 p-1 rounded-xl border border-gray-800 bg-gray-900"
        aria-label="Escolher mapa"
    >
        ${aba('brasil', 'Brasil')} ${aba('mundo', 'Mundo')}
    </nav>`;
}

export default {
    async render({ query, signal }) {
        const visao = query.get('visao') === 'mundo' ? 'mundo' : 'brasil';
        const [dados] = await Promise.all([api.mapa(signal), base(visao, signal)]);
        const t = dados.totais;
        const exterior = dados.paises.filter((p) => p.iso !== 'BR');

        const ranking =
            visao === 'brasil'
                ? dados.cidades.slice(0, 10).map((c) => ({
                      nome: `${c.nome} (${c.uf})`,
                      valor: formatarNumero(c.jogos),
                      detalhe: textoResumo(c),
                  }))
                : exterior
                      .slice(0, 10)
                      .map((p) => ({ nome: p.nome, valor: formatarNumero(p.jogos), detalhe: textoResumo(p) }));

        return {
            title: 'O Timão pelo mapa',
            content: html`
                <div class="space-y-8">
                    <div class="flex flex-col md:flex-row md:items-end justify-between gap-4">
                        ${pageHeader(
                            'O Timão pelo mapa',
                            `${formatarNumero(t.jogosNoBrasil)} jogos em ${t.cidades} cidades de ${t.estados} estados brasileiros, e ${formatarNumero(t.jogosNoExterior)} jogos em ${exterior.length} outros países.`,
                        )}
                        ${abas(visao)}
                    </div>

                    <div class="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
                        <section
                            class="lg:col-span-2 bg-gray-900 border border-gray-800 rounded-xl p-3 md:p-5 space-y-3"
                        >
                            <div class="flex flex-wrap items-center justify-between gap-3 text-xs text-gray-400">
                                <div class="flex flex-wrap items-center gap-x-2 gap-y-1 whitespace-nowrap">
                                    <span>Menos jogos</span>
                                    <span
                                        class="h-2.5 w-24 rounded-full bg-gradient-to-r from-white/5 to-white/50"
                                        aria-hidden="true"
                                    ></span>
                                    <span>Mais jogos</span>
                                    ${
                                        visao === 'brasil'
                                            ? html`<span class="ml-3 inline-flex items-center gap-1.5"
                                                  ><span
                                                      class="w-3 h-3 rounded-full bg-white/80"
                                                      aria-hidden="true"
                                                  ></span>
                                                  cidade (tamanho = jogos)</span
                                              >`
                                            : ''
                                    }
                                </div>
                                ${
                                    visao === 'brasil'
                                        ? html`<button type="button" id="mapa-voltar" class="btn-ghost" hidden>
                                                  ← Brasil inteiro
                                              </button>
                                              <span id="mapa-dica">Clique em um estado para aproximar</span>`
                                        : ''
                                }
                            </div>
                            <div
                                id="mapa-area"
                                class="relative w-full ${visao === 'brasil' ? 'aspect-square' : 'aspect-[1000/520]'}"
                            ></div>
                        </section>

                        <div class="space-y-6">
                            ${card({ titulo: 'Detalhe' }, html`<div id="mapa-detalhe" aria-live="polite">${detalhe(null)}</div>`)}
                            ${card({ titulo: visao === 'brasil' ? 'Cidades com mais jogos' : 'Países com mais jogos' }, rankList(ranking))}
                        </div>
                    </div>

                    ${
                        visao === 'brasil'
                            ? tabelaDoGrafico(
                                  ['Cidade', 'UF', 'Jogos', 'V', 'E', 'D', '%'],
                                  dados.cidades.map((c) => [
                                      c.nome,
                                      c.uf,
                                      c.jogos,
                                      c.vitorias,
                                      c.empates,
                                      c.derrotas,
                                      formatarPorcentagem(c.aproveitamento),
                                  ]),
                              )
                            : tabelaDoGrafico(
                                  ['País', 'Jogos', 'V', 'E', 'D', '%'],
                                  dados.paises.map((p) => [
                                      p.nome,
                                      p.jogos,
                                      p.vitorias,
                                      p.empates,
                                      p.derrotas,
                                      formatarPorcentagem(p.aproveitamento),
                                  ]),
                              )
                    }
                </div>
            `,
        };
    },

    async mount(root, ctx) {
        const visao = ctx.query.get('visao') === 'mundo' ? 'mundo' : 'brasil';
        const [dados, geo] = await Promise.all([api.mapa(), base(visao)]); // ambos em cache
        const area = /** @type {HTMLElement} */ (root.querySelector('#mapa-area'));
        const painel = /** @type {HTMLElement} */ (root.querySelector('#mapa-detalhe'));
        replaceQuery('/mapa', visao === 'mundo' ? { visao } : {});

        const svg = /** @type {SVGSVGElement} */ (
            svgEl('svg', { viewBox: geo.viewBox.join(' '), class: 'w-full h-full', role: 'img' })
        );
        svg.setAttribute(
            'aria-label',
            visao === 'brasil'
                ? 'Mapa do Brasil com os jogos do Corinthians por estado e cidade'
                : 'Mapa-múndi com os jogos do Corinthians por país',
        );
        area.replaceChildren(svg);
        const tooltip = criarTooltip(area);

        const mostrar = (evento, item, titulo) => {
            const r = area.getBoundingClientRect();
            tooltip.mostrar(
                {
                    titulo: item.uf && item.nome ? `${item.nome} (${item.uf})` : (item.nome ?? item.uf),
                    linhas: [
                        { valor: formatarNumero(item.jogos), rotulo: item.jogos === 1 ? 'jogo' : 'jogos' },
                        {
                            valor: `${item.vitorias}V ${item.empates}E ${item.derrotas}D`,
                            rotulo: formatarPorcentagem(item.aproveitamento),
                        },
                    ],
                },
                evento.clientX - r.left,
                evento.clientY - r.top,
            );
            painel.innerHTML = String(detalhe(item, titulo));
        };

        /** Liga hover, toque e teclado de uma forma do mapa. */
        const interativo = (el, item, titulo, aoClicar) => {
            el.setAttribute('tabindex', '0');
            el.setAttribute('role', 'button');
            el.setAttribute('aria-label', `${item.nome ?? item.uf}: ${plural(item.jogos, 'jogo')}`);
            el.style.cursor = 'pointer';
            el.addEventListener('pointermove', (e) => mostrar(e, item, titulo));
            el.addEventListener('pointerleave', () => tooltip.esconder());
            el.addEventListener('focus', () => {
                const b = el.getBoundingClientRect();
                mostrar({ clientX: b.left + b.width / 2, clientY: b.top + b.height / 2 }, item, titulo);
            });
            el.addEventListener('blur', () => tooltip.esconder());
            el.addEventListener('click', (e) => {
                mostrar(e, item, titulo);
                aoClicar?.();
            });
            el.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    el.dispatchEvent(new MouseEvent('click', { clientX: 0, clientY: 0 }));
                }
            });
        };

        const corPreenchimento = (jogos, maximo) =>
            OPACIDADE.min + (OPACIDADE.max - OPACIDADE.min) * escalaLog(jogos, maximo);

        if (visao === 'mundo') {
            const porIso = new Map(dados.paises.filter((p) => p.iso).map((p) => [p.iso, p]));
            const maxExterior = Math.max(...dados.paises.filter((p) => p.iso !== 'BR').map((p) => p.jogos));
            for (const pais of geo.paises) {
                const item = porIso.get(pais.iso);
                const el = svgEl('path', {
                    d: pais.d,
                    fill: item ? (pais.iso === 'BR' ? CORES.destaque : CORES.textoForte) : CORES.textoForte,
                    'fill-opacity': item ? (pais.iso === 'BR' ? 0.9 : corPreenchimento(item.jogos, maxExterior)) : 0.03,
                    stroke: CORES.grade,
                    'stroke-width': 0.5,
                });
                svg.appendChild(el);
                if (item) interativo(el, { ...item, nome: item.nome }, 'País');
            }
            return undefined;
        }

        // ---- Brasil: estados (preenchimento) + cidades (bolhas) ----
        const porUf = new Map(dados.estados.map((e) => [e.uf, e]));
        const maxEstado = Math.max(...dados.estados.map((e) => e.jogos));
        const camadaEstados = svgEl('g');
        const camadaCidades = svgEl('g');
        const camadaRotulos = svgEl('g', { 'pointer-events': 'none', 'aria-hidden': 'true' });
        svg.append(camadaEstados, camadaCidades, camadaRotulos);
        const pathDoEstado = new Map();
        const rotulos = [];

        const viewBoxInicial = [...geo.viewBox];
        let viewBoxAtual = [...viewBoxInicial];
        const botaoVoltar = /** @type {HTMLButtonElement} */ (root.querySelector('#mapa-voltar'));
        const dica = root.querySelector('#mapa-dica');
        let animacao = 0;

        const raioBase = (jogos) => RAIO_MIN + (RAIO_MAX - RAIO_MIN) * Math.sqrt(jogos / dados.cidades[0].jogos);
        const circulos = [];

        const aplicarViewBox = (vb) => {
            viewBoxAtual = vb;
            svg.setAttribute('viewBox', vb.join(' '));
            // Mantém as bolhas com tamanho legível ao aproximar
            const zoom = viewBoxInicial[2] / vb[2];
            for (const { el, cidade } of circulos) {
                el.setAttribute('r', String(Math.max(1.2, raioBase(cidade.jogos) / Math.sqrt(zoom))));
                el.setAttribute('stroke-width', String(1.5 / zoom));
            }
            camadaRotulos.style.display = zoom >= ZOOM_ROTULOS ? '' : 'none';
            for (const { el, cidade } of rotulos) {
                const raio = Math.max(1.2, raioBase(cidade.jogos) / Math.sqrt(zoom));
                el.setAttribute('y', String(cidade.y - raio - 3 / zoom));
                el.setAttribute('font-size', String(12 / zoom));
                el.setAttribute('stroke-width', String(3 / zoom));
            }
        };

        /**
         * Esconde os nomes que ficariam por cima de outros (as cidades com mais
         * jogos têm prioridade). Roda só no fim do zoom, não a cada quadro.
         */
        const evitarSobreposicao = () => {
            if (camadaRotulos.style.display === 'none') return;
            const ocupados = [];
            for (const { el } of rotulos) {
                el.removeAttribute('visibility');
                const b = el.getBBox();
                const colide = ocupados.some(
                    (o) => b.x < o.x + o.width && b.x + b.width > o.x && b.y < o.y + o.height && b.y + b.height > o.y,
                );
                if (colide) el.setAttribute('visibility', 'hidden');
                else ocupados.push(b);
            }
        };

        const animarPara = (destino) => {
            cancelAnimationFrame(animacao);
            const origem = [...viewBoxAtual];
            const inicio = performance.now();
            const passo = (agora) => {
                const t = Math.min(1, (agora - inicio) / DURACAO_ZOOM_MS);
                const suave = 1 - (1 - t) ** 3;
                aplicarViewBox(origem.map((v, i) => v + (destino[i] - v) * suave));
                if (t < 1) animacao = requestAnimationFrame(passo);
                else evitarSobreposicao();
            };
            animacao = requestAnimationFrame(passo);
        };

        const aproximar = (el) => {
            const b = el.getBBox();
            const lado = Math.max(b.width, b.height) * 1.15 + 20;
            animarPara([b.x + b.width / 2 - lado / 2, b.y + b.height / 2 - lado / 2, lado, lado]);
            botaoVoltar.hidden = false;
            if (dica) dica.hidden = true;
        };

        for (const estado of geo.estados) {
            const item = porUf.get(estado.uf);
            const el = svgEl('path', {
                d: estado.d,
                fill: CORES.textoForte,
                'fill-opacity': item ? corPreenchimento(item.jogos, maxEstado) : 0.03,
                stroke: CORES.eixo,
                'stroke-opacity': 0.35,
                'stroke-width': 0.8,
                'vector-effect': 'non-scaling-stroke',
            });
            camadaEstados.appendChild(el);
            pathDoEstado.set(estado.uf, el);
            const dadosEstado = item
                ? { ...item, nome: estado.nome }
                : {
                      uf: estado.uf,
                      nome: estado.nome,
                      jogos: 0,
                      vitorias: 0,
                      empates: 0,
                      derrotas: 0,
                      aproveitamento: null,
                  };
            interativo(el, dadosEstado, 'Estado', () => aproximar(el));
        }

        // Cidades: maiores embaixo, menores por cima (todas ficam clicáveis)
        for (const cidade of [...dados.cidades].sort((a, b) => b.jogos - a.jogos)) {
            const el = svgEl('circle', {
                cx: cidade.x,
                cy: cidade.y,
                r: raioBase(cidade.jogos),
                fill: CORES.textoForte,
                'fill-opacity': 0.8,
                stroke: CORES.superficie,
                'stroke-width': 1.5,
            });
            el.addEventListener('pointerenter', () => el.style.setProperty('fill', CORES.destaque));
            el.addEventListener('pointerleave', () => el.style.setProperty('fill', CORES.textoForte));
            camadaCidades.appendChild(el);
            circulos.push({ el, cidade });
            interativo(el, cidade, 'Cidade', () => {
                const estado = pathDoEstado.get(cidade.uf);
                if (estado) aproximar(estado);
            });
            if (cidade.jogos >= MIN_JOGOS_ROTULO) {
                const rotulo = svgEl('text', {
                    x: cidade.x,
                    y: cidade.y,
                    'text-anchor': 'middle',
                    'font-weight': 700,
                    fill: CORES.textoForte,
                    stroke: CORES.superficie,
                    'paint-order': 'stroke',
                    'stroke-linejoin': 'round',
                });
                rotulo.textContent = cidade.nome;
                camadaRotulos.appendChild(rotulo);
                rotulos.push({ el: rotulo, cidade });
            }
        }
        aplicarViewBox(viewBoxInicial);

        botaoVoltar.addEventListener('click', () => {
            animarPara(viewBoxInicial);
            botaoVoltar.hidden = true;
            if (dica) dica.hidden = false;
        });

        return () => cancelAnimationFrame(animacao);
    },
};
