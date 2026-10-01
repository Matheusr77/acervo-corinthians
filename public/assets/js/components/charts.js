/**
 * Gráficos em SVG puro (sem bibliotecas), desenhados no tamanho real do
 * container e redesenhados quando ele muda de largura.
 *
 * Padrões seguidos:
 *  - Linha de 2px, colunas de no máximo 24px com topo arredondado (4px),
 *    2px de respiro entre segmentos empilhados, grade discreta de 1px.
 *  - Tooltip com crosshair (linha) ou por coluna (barras), listando todas as
 *    séries daquele ponto. Texto sempre via textContent (dados do banco).
 *  - Cores de V/E/D e gols consistentes com o resto do site; o texto usa
 *    tons de cinza, nunca a cor da série.
 *
 * Cada função devolve uma função de limpeza (desconecta o ResizeObserver).
 */

import { html } from '../core/html.js';

const SVG_NS = 'http://www.w3.org/2000/svg';

/**
 * Cores dos gráficos. As que mudam com o tema usam as variáveis CSS do site;
 * V/E/D são fixas e valem nos dois temas.
 */
export const CORES = Object.freeze({
    vitoria: '#16a34a',
    empate: '#737373',
    derrota: '#dc2626',
    destaque: 'rgb(var(--ouro))',
    superficie: 'rgb(var(--cinza-900))',
    grade: 'rgb(var(--cinza-800))',
    eixo: 'rgb(var(--cinza-400))',
    linha: 'rgb(var(--cinza-200))',
    textoForte: 'rgb(var(--branco))',
});

const MARGEM = { topo: 16, direita: 16, base: 28, esquerda: 40 };

/**
 * Cria um elemento SVG com atributos.
 * Cores com var() vão no style (atributos SVG não entendem var()): assim o
 * desenho acompanha a troca de tema sozinho, sem precisar ser refeito.
 * @param {string} tag
 * @param {Record<string, string | number>} [attrs]
 */
export function svgEl(tag, attrs = {}) {
    const el = document.createElementNS(SVG_NS, tag);
    for (const [k, v] of Object.entries(attrs)) {
        if ((k === 'fill' || k === 'stroke') && String(v).includes('var(')) el.style.setProperty(k, String(v));
        else el.setAttribute(k, String(v));
    }
    return el;
}

/** Valores "redondos" para o eixo Y (0, 25, 50...). */
export function ticksBonitos(max, quantidade = 4) {
    if (max <= 0) return [0];
    const bruto = max / quantidade;
    const magnitude = 10 ** Math.floor(Math.log10(bruto));
    const passo = [1, 2, 2.5, 5, 10].map((m) => m * magnitude).find((p) => p >= bruto) ?? bruto;
    const ticks = [];
    for (let v = 0; v <= max + passo * 0.001; v += passo) ticks.push(Math.round(v * 100) / 100);
    if (ticks[ticks.length - 1] < max) ticks.push(ticks[ticks.length - 1] + passo);
    return ticks;
}

/**
 * Tooltip compartilhado de um gráfico.
 * @param {HTMLElement} container
 */
export function criarTooltip(container) {
    const tip = document.createElement('div');
    tip.className =
        'pointer-events-none absolute z-10 hidden min-w-[140px] rounded-lg border border-gray-700 bg-sccp-black/95 px-3 py-2 text-xs shadow-xl';
    tip.setAttribute('role', 'status');
    container.appendChild(tip);

    return {
        /**
         * @param {{ titulo: string, linhas: { cor?: string, valor: string, rotulo: string }[], nota?: string }} conteudo
         * @param {number} x - posição em px dentro do container
         * @param {number} y
         */
        mostrar(conteudo, x, y) {
            tip.replaceChildren();
            const titulo = document.createElement('p');
            titulo.className = 'text-gray-400 font-bold mb-1';
            titulo.textContent = conteudo.titulo;
            tip.appendChild(titulo);

            for (const linha of conteudo.linhas) {
                const row = document.createElement('p');
                row.className = 'flex items-center gap-2';
                if (linha.cor) {
                    const key = document.createElement('span');
                    key.className = 'inline-block w-3 h-0.5 rounded';
                    key.style.background = linha.cor;
                    row.appendChild(key);
                }
                const valor = document.createElement('strong');
                valor.className = 'text-white';
                valor.textContent = linha.valor;
                const rotulo = document.createElement('span');
                rotulo.className = 'text-gray-400';
                rotulo.textContent = linha.rotulo;
                row.append(valor, rotulo);
                tip.appendChild(row);
            }

            if (conteudo.nota) {
                const nota = document.createElement('p');
                nota.className = 'text-sccp-gold mt-1';
                nota.textContent = conteudo.nota;
                tip.appendChild(nota);
            }

            tip.classList.remove('hidden');
            const largura = container.clientWidth;
            const w = tip.offsetWidth;
            const left = x + 12 + w > largura ? x - 12 - w : x + 12;
            tip.style.left = `${Math.max(0, left)}px`;
            tip.style.top = `${Math.max(0, y - tip.offsetHeight / 2)}px`;
        },
        esconder() {
            tip.classList.add('hidden');
        },
    };
}

/**
 * Prepara o container: limpa, cria o SVG e redesenha ao redimensionar.
 * @param {HTMLElement} container
 * @param {number} altura
 * @param {(svg: SVGSVGElement, largura: number, tooltip: ReturnType<typeof criarTooltip>) => void} desenhar
 * @param {string} descricao - texto para leitores de tela
 */
function montarGrafico(container, altura, desenhar, descricao) {
    container.classList.add('relative');
    let ultimaLargura = 0;

    const render = () => {
        const largura = Math.floor(container.clientWidth);
        if (!largura || largura === ultimaLargura) return;
        ultimaLargura = largura;

        container.replaceChildren();
        const svg = /** @type {SVGSVGElement} */ (
            svgEl('svg', { width: largura, height: altura, viewBox: `0 0 ${largura} ${altura}`, role: 'img' })
        );
        svg.setAttribute('aria-label', descricao);
        svg.style.display = 'block';
        container.appendChild(svg);
        desenhar(svg, largura, criarTooltip(container));
    };

    const observer = new ResizeObserver(render);
    observer.observe(container);
    render();
    return () => observer.disconnect();
}

/**
 * Grade horizontal + rótulos do eixo Y.
 * @param {SVGSVGElement} svg
 * @param {number[]} ticks
 * @param {(v: number) => number} y
 * @param {number} largura
 * @param {(v: number) => string} formatar
 */
function desenharEixoY(svg, ticks, y, largura, formatar) {
    for (const t of ticks) {
        svg.appendChild(
            svgEl('line', {
                x1: MARGEM.esquerda,
                x2: largura - MARGEM.direita,
                y1: y(t),
                y2: y(t),
                stroke: CORES.grade,
                'stroke-width': 1,
            }),
        );
        const label = svgEl('text', {
            x: MARGEM.esquerda - 8,
            y: y(t) + 4,
            'text-anchor': 'end',
            'font-size': 11,
            fill: CORES.eixo,
            style: 'font-variant-numeric: tabular-nums',
        });
        label.textContent = formatar(t);
        svg.appendChild(label);
    }
}

/**
 * Gráfico de linha com crosshair (ex.: aproveitamento por temporada).
 *
 * @param {HTMLElement} container
 * @param {{
 *   pontos: { x: number, y: number | null, tooltip: { titulo: string, linhas: any[], nota?: string }, marcado?: boolean }[],
 *   yMax?: number,
 *   formatarY: (v: number) => string,
 *   referencia?: { valor: number, rotulo: string },
 *   passoRotuloX?: number,
 *   altura?: number,
 *   descricao: string,
 * }} opcoes
 */
export function graficoLinha(container, opcoes) {
    const { pontos, formatarY, referencia, passoRotuloX = 10, altura = 280, descricao } = opcoes;

    return montarGrafico(
        container,
        altura,
        (svg, largura, tooltip) => {
            const valores = pontos.map((p) => p.y).filter((v) => v !== null);
            const ticks = ticksBonitos(opcoes.yMax ?? Math.max(...valores));
            const yMax = ticks[ticks.length - 1];
            const xMin = pontos[0].x;
            const xMax = pontos[pontos.length - 1].x;
            const larguraUtil = largura - MARGEM.esquerda - MARGEM.direita;
            const alturaUtil = altura - MARGEM.topo - MARGEM.base;
            const x = (v) => MARGEM.esquerda + ((v - xMin) / Math.max(1, xMax - xMin)) * larguraUtil;
            const y = (v) => MARGEM.topo + alturaUtil - (v / yMax) * alturaUtil;

            desenharEixoY(svg, ticks, y, largura, formatarY);

            // Rótulos do eixo X (décadas)
            for (let v = Math.ceil(xMin / passoRotuloX) * passoRotuloX; v <= xMax; v += passoRotuloX) {
                const label = svgEl('text', {
                    x: x(v),
                    y: altura - 8,
                    'text-anchor': 'middle',
                    'font-size': 11,
                    fill: CORES.eixo,
                });
                label.textContent = String(v);
                svg.appendChild(label);
            }

            // Linha de referência (média)
            if (referencia) {
                svg.appendChild(
                    svgEl('line', {
                        x1: MARGEM.esquerda,
                        x2: largura - MARGEM.direita,
                        y1: y(referencia.valor),
                        y2: y(referencia.valor),
                        stroke: CORES.eixo,
                        'stroke-width': 1,
                        opacity: 0.6,
                    }),
                );
                const ref = svgEl('text', {
                    x: largura - MARGEM.direita,
                    y: y(referencia.valor) - 6,
                    'text-anchor': 'end',
                    'font-size': 11,
                    fill: CORES.eixo,
                });
                ref.textContent = referencia.rotulo;
                svg.appendChild(ref);
            }

            // Área (10%) + linha (2px), interrompidas em anos sem dados
            const segmentos = [];
            let atual = [];
            for (const p of pontos) {
                if (p.y === null) {
                    if (atual.length) segmentos.push(atual);
                    atual = [];
                } else atual.push(p);
            }
            if (atual.length) segmentos.push(atual);

            for (const seg of segmentos) {
                const d = seg.map((p, i) => `${i ? 'L' : 'M'}${x(p.x).toFixed(1)},${y(p.y).toFixed(1)}`).join('');
                const base = y(0).toFixed(1);
                svg.appendChild(
                    svgEl('path', {
                        d: `${d}L${x(seg[seg.length - 1].x).toFixed(1)},${base}L${x(seg[0].x).toFixed(1)},${base}Z`,
                        fill: CORES.linha,
                        opacity: 0.08,
                    }),
                );
                svg.appendChild(
                    svgEl('path', {
                        d,
                        fill: 'none',
                        stroke: CORES.linha,
                        'stroke-width': 2,
                        'stroke-linejoin': 'round',
                        'stroke-linecap': 'round',
                    }),
                );
            }

            // Marcadores (ex.: anos com título), com anel na cor da superfície
            for (const p of pontos.filter((p) => p.marcado && p.y !== null)) {
                svg.appendChild(
                    svgEl('circle', {
                        cx: x(p.x),
                        cy: y(p.y),
                        r: 5,
                        fill: CORES.destaque,
                        stroke: CORES.superficie,
                        'stroke-width': 2,
                    }),
                );
            }

            // Crosshair + ponto ativo
            const cross = svgEl('line', {
                y1: MARGEM.topo,
                y2: MARGEM.topo + alturaUtil,
                stroke: CORES.eixo,
                'stroke-width': 1,
                visibility: 'hidden',
            });
            const ativo = svgEl('circle', {
                r: 5,
                fill: CORES.textoForte,
                stroke: CORES.superficie,
                'stroke-width': 2,
                visibility: 'hidden',
            });
            svg.append(cross, ativo);

            const hit = svgEl('rect', {
                x: MARGEM.esquerda,
                y: MARGEM.topo,
                width: larguraUtil,
                height: alturaUtil,
                fill: 'transparent',
            });
            svg.appendChild(hit);

            const mover = (evento) => {
                const rect = svg.getBoundingClientRect();
                const px = evento.clientX - rect.left;
                const alvo = xMin + ((px - MARGEM.esquerda) / larguraUtil) * (xMax - xMin);
                const p = pontos.reduce((a, b) => (Math.abs(b.x - alvo) < Math.abs(a.x - alvo) ? b : a));
                cross.setAttribute('x1', String(x(p.x)));
                cross.setAttribute('x2', String(x(p.x)));
                cross.setAttribute('visibility', 'visible');
                if (p.y !== null) {
                    ativo.setAttribute('cx', String(x(p.x)));
                    ativo.setAttribute('cy', String(y(p.y)));
                    ativo.setAttribute('visibility', 'visible');
                } else ativo.setAttribute('visibility', 'hidden');
                tooltip.mostrar(p.tooltip, x(p.x), p.y !== null ? y(p.y) : MARGEM.topo + alturaUtil / 2);
            };
            const sair = () => {
                cross.setAttribute('visibility', 'hidden');
                ativo.setAttribute('visibility', 'hidden');
                tooltip.esconder();
            };
            hit.addEventListener('pointermove', mover);
            hit.addEventListener('pointerdown', mover);
            hit.addEventListener('pointerleave', sair);
        },
        descricao,
    );
}

/**
 * Colunas agrupadas ou empilhadas por categoria (ex.: gols por década, V/E/D por década).
 *
 * @param {HTMLElement} container
 * @param {{
 *   categorias: string[],
 *   series: { nome: string, cor: string, valores: number[] }[],
 *   empilhado?: boolean,
 *   formatarY?: (v: number) => string,
 *   tituloTooltip?: (categoria: string, i: number) => string,
 *   altura?: number,
 *   descricao: string,
 * }} opcoes
 */
export function graficoColunas(container, opcoes) {
    const {
        categorias,
        series,
        empilhado = false,
        formatarY = (v) => String(v),
        tituloTooltip = (c) => c,
        altura = 260,
        descricao,
    } = opcoes;
    const GAP = 2;
    const RAIO = 4;

    return montarGrafico(
        container,
        altura,
        (svg, largura, tooltip) => {
            const totais = categorias.map((_, i) => series.reduce((s, serie) => s + serie.valores[i], 0));
            const maxBruto = empilhado ? Math.max(...totais) : Math.max(...series.flatMap((s) => s.valores));
            const ticks = ticksBonitos(maxBruto);
            const yMax = ticks[ticks.length - 1];
            const larguraUtil = largura - MARGEM.esquerda - MARGEM.direita;
            const alturaUtil = altura - MARGEM.topo - MARGEM.base;
            const banda = larguraUtil / categorias.length;
            const y = (v) => MARGEM.topo + alturaUtil - (v / yMax) * alturaUtil;
            const h = (v) => (v / yMax) * alturaUtil;

            desenharEixoY(svg, ticks, y, largura, formatarY);

            const nBarras = empilhado ? 1 : series.length;
            const larguraBarra = Math.max(4, Math.min(24, (banda * 0.7 - GAP * (nBarras - 1)) / nBarras));
            const mostrarTodosRotulos = banda >= 34;

            categorias.forEach((categoria, i) => {
                const centro = MARGEM.esquerda + banda * i + banda / 2;
                const grupo = svgEl('g');
                const fundo = svgEl('rect', {
                    x: MARGEM.esquerda + banda * i,
                    y: MARGEM.topo,
                    width: banda,
                    height: alturaUtil,
                    fill: '#ffffff',
                    opacity: 0,
                });
                grupo.appendChild(fundo);

                if (empilhado) {
                    // Da base para cima; 2px de respiro entre segmentos; topo arredondado só no último
                    let acumulado = 0;
                    const visiveis = series.filter((s) => s.valores[i] > 0);
                    visiveis.forEach((serie, j) => {
                        const valor = serie.valores[i];
                        const topo = j === visiveis.length - 1;
                        const altSeg = Math.max(0, h(valor) - (topo ? 0 : GAP));
                        grupo.appendChild(
                            barra(
                                centro - larguraBarra / 2,
                                y(acumulado + valor),
                                larguraBarra,
                                altSeg,
                                serie.cor,
                                topo ? RAIO : 0,
                            ),
                        );
                        acumulado += valor;
                    });
                } else {
                    const larguraGrupo = nBarras * larguraBarra + (nBarras - 1) * GAP;
                    series.forEach((serie, j) => {
                        const valor = serie.valores[i];
                        const bx = centro - larguraGrupo / 2 + j * (larguraBarra + GAP);
                        grupo.appendChild(barra(bx, y(valor), larguraBarra, h(valor), serie.cor, RAIO));
                    });
                }

                if (mostrarTodosRotulos || i % 2 === 0) {
                    const label = svgEl('text', {
                        x: centro,
                        y: altura - 8,
                        'text-anchor': 'middle',
                        'font-size': 11,
                        fill: CORES.eixo,
                    });
                    label.textContent = categoria;
                    grupo.appendChild(label);
                }

                // Toda a faixa da categoria é área de hover (maior que a barra)
                const conteudo = {
                    titulo: tituloTooltip(categoria, i),
                    linhas: series.map((s) => ({ cor: s.cor, valor: formatarY(s.valores[i]), rotulo: s.nome })),
                };
                fundo.addEventListener('pointerenter', () => {
                    fundo.setAttribute('opacity', '0.04');
                    tooltip.mostrar(conteudo, centro, MARGEM.topo + alturaUtil / 3);
                });
                fundo.addEventListener('pointerdown', () =>
                    tooltip.mostrar(conteudo, centro, MARGEM.topo + alturaUtil / 3),
                );
                fundo.addEventListener('pointerleave', () => {
                    fundo.setAttribute('opacity', '0');
                    tooltip.esconder();
                });
                svg.appendChild(grupo);
            });

            // Mantém a faixa de hover por cima das barras
            svg.querySelectorAll('g > rect:first-child').forEach((r) => r.parentNode?.appendChild(r));
        },
        descricao,
    );
}

/**
 * Barra com topo arredondado e base reta.
 * @param {number} x
 * @param {number} y - topo
 * @param {number} w
 * @param {number} h
 * @param {string} cor
 * @param {number} raio
 */
function barra(x, y, w, h, cor, raio) {
    if (h <= 0) return svgEl('g');
    const r = Math.min(raio, w / 2, h);
    const d = [
        `M${x},${y + h}`,
        `V${y + r}`,
        `Q${x},${y} ${x + r},${y}`,
        `H${x + w - r}`,
        `Q${x + w},${y} ${x + w},${y + r}`,
        `V${y + h}`,
        'Z',
    ].join('');
    return svgEl('path', { d, fill: cor, 'pointer-events': 'none' });
}

/**
 * Agrega jogos por década em vitórias/empates/derrotas.
 * @param {{ data: string, resultado: 'V'|'E'|'D'|null }[]} jogos
 */
export function vedPorDecada(jogos) {
    const mapa = new Map();
    for (const j of jogos) {
        if (!j.resultado) continue;
        const decada = Math.floor(Number(j.data.slice(0, 4)) / 10) * 10;
        if (!mapa.has(decada)) mapa.set(decada, { V: 0, E: 0, D: 0 });
        mapa.get(decada)[j.resultado] += 1;
    }
    const decadas = [...mapa.keys()].sort((a, b) => a - b);
    return {
        categorias: decadas.map((d) => String(d)),
        decadas,
        series: [
            { nome: 'Vitórias', cor: CORES.vitoria, valores: decadas.map((d) => mapa.get(d).V) },
            { nome: 'Empates', cor: CORES.empate, valores: decadas.map((d) => mapa.get(d).E) },
            { nome: 'Derrotas', cor: CORES.derrota, valores: decadas.map((d) => mapa.get(d).D) },
        ],
    };
}

/**
 * Legenda em HTML (sempre presente com duas ou mais séries).
 * @param {{ cor: string, rotulo: string, forma?: 'barra' | 'linha' | 'ponto' }[]} itens
 */
export function legenda(itens) {
    const chave = (item) => {
        if (item.forma === 'linha')
            return html`<span class="inline-block w-4 h-0.5 rounded" style="background: ${item.cor}"></span>`;
        if (item.forma === 'ponto')
            return html`<span
                class="inline-block w-2.5 h-2.5 rounded-full ring-2 ring-sccp-gray"
                style="background: ${item.cor}"
            ></span>`;
        return html`<span class="inline-block w-3 h-3 rounded-sm" style="background: ${item.cor}"></span>`;
    };
    return html`
        <ul class="flex flex-wrap gap-x-5 gap-y-2 text-xs text-gray-400" aria-label="Legenda">
            ${itens.map((item) => html`<li class="flex items-center gap-2">${chave(item)} ${item.rotulo}</li>`)}
        </ul>
    `;
}

/**
 * Alternativa acessível ao gráfico: os mesmos dados em tabela, recolhida.
 * @param {string[]} cabecalho
 * @param {(string | number)[][]} linhas
 */
export function tabelaDoGrafico(cabecalho, linhas) {
    return html`
        <details class="mt-4 text-sm">
            <summary
                class="cursor-pointer text-gray-400 hover:text-gray-300 text-xs uppercase tracking-wider font-bold"
            >
                Ver dados em tabela
            </summary>
            <div class="max-h-72 overflow-auto mt-3">
                <table class="w-full text-right">
                    <thead class="sticky top-0 bg-sccp-gray">
                        <tr class="text-xs text-gray-400 uppercase">
                            ${cabecalho.map((c, i) => html`<th scope="col" class="${i === 0 ? 'text-left' : ''} font-bold py-1.5 px-2">${c}</th>`)}
                        </tr>
                    </thead>
                    <tbody class="text-gray-300" style="font-variant-numeric: tabular-nums">
                        ${linhas.map(
                            (l) =>
                                html`<tr class="border-t border-gray-800">
                                    ${l.map((v, i) => html`<td class="${i === 0 ? 'text-left text-white' : ''} py-1.5 px-2">${v}</td>`)}
                                </tr>`,
                        )}
                    </tbody>
                </table>
            </div>
        </details>
    `;
}
