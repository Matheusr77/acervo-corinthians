/**
 * "O Timão na sua vida": o torcedor informa a data de nascimento e vê tudo o
 * que o Corinthians viveu desde então, com uma imagem pronta para o story.
 *
 * /minha-historia                          → formulário
 * /minha-historia?nascimento=AAAA-MM-DD    → resultado (o nome é opcional: &nome=)
 *
 * Nada é salvo no servidor: a data só serve para o cálculo.
 */

import { api } from '../core/api.js';
import { html } from '../core/html.js';
import { navegar } from '../core/router.js';
import { botaoCompartilhar, ligarCompartilhar } from '../components/compartilhar.js';
import { gameCard, miniEscudo } from '../components/game.js';
import { card } from '../components/layout.js';
import { corAproveitamento, kpi, sequenciaTile } from '../components/stats.js';
import {
    DESTAQUES,
    FORMATOS,
    FRASE_CORINTHIANO,
    MODELOS,
    gerarCartao,
    ordenarPorPrestigio,
    rotuloTitulo,
} from '../utils/cartaoStory.js';
import { debounce } from '../utils/debounce.js';
import { anoDe, formatarData, formatarNumero, formatarPorcentagem, hojeIso, plural } from '../utils/format.js';

const FORMATO_DATA = /^\d{4}-\d{2}-\d{2}$/;
const TAMANHO_MAX_NOME = 30;

/** Nome opcional: só letras, espaços e alguns sinais, com limite de tamanho. */
function limparNome(nome) {
    return String(nome ?? '')
        .replace(/[^\p{L}\p{M} .'-]/gu, '')
        .trim()
        .slice(0, TAMANHO_MAX_NOME);
}

function formulario({ nascimento = '', nome = '', erro = null } = {}) {
    return html`
        <section class="relative overflow-hidden rounded-xl border border-gray-800 bg-black">
            <div class="absolute inset-0 bg-[url('/assets/img/arena-hero.jpg')] bg-cover bg-center opacity-30"></div>
            <div class="absolute inset-0 bg-gradient-to-t from-black via-black/70 to-black/30"></div>

            <div class="relative z-10 px-6 py-16 md:py-24 max-w-2xl mx-auto text-center space-y-6">
                <p class="text-sccp-gold text-xs font-bold uppercase tracking-[0.2em]">Descubra a sua história</p>
                <h2 class="text-5xl md:text-7xl font-display font-black text-white leading-[0.95] tracking-tight">
                    O Timão na <span class="text-sccp-gold">sua vida</span>
                </h2>
                <p class="text-gray-300 text-lg">
                    Coloque sua data de nascimento e veja quantos jogos, vitórias e títulos o Corinthians viveu com
                    você. No final, sua imagem pronta para o story.
                </p>

                <form
                    id="form-minha-historia"
                    class="bg-black/60 backdrop-blur border border-gray-800 rounded-xl p-5 md:p-6 text-left space-y-4"
                    novalidate
                >
                    <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label for="nascimento" class="block text-xs font-semibold text-gray-400 uppercase mb-1"
                                >Data de nascimento</label
                            >
                            <input
                                type="date"
                                id="nascimento"
                                name="nascimento"
                                required
                                min="1910-09-01"
                                max="${hojeIso()}"
                                value="${nascimento}"
                                class="form-control py-2.5"
                            />
                        </div>
                        <div>
                            <label for="nome" class="block text-xs font-semibold text-gray-400 uppercase mb-1"
                                >Seu nome
                                <span class="normal-case text-gray-500">(opcional, vai na imagem)</span></label
                            >
                            <input
                                type="text"
                                id="nome"
                                name="nome"
                                maxlength="${TAMANHO_MAX_NOME}"
                                autocomplete="given-name"
                                value="${nome}"
                                class="form-control py-2.5"
                                placeholder="Ex.: Matheus"
                            />
                        </div>
                    </div>
                    ${erro ? html`<p class="text-red-400 text-sm" role="alert">${erro}</p>` : ''}
                    <button type="submit" class="btn-hero-primary w-full">Descobrir minha história</button>
                    <p class="text-xs text-gray-400 text-center">
                        Nada é salvo: a data só é usada para fazer as contas.
                    </p>
                </form>
            </div>
        </section>
    `;
}

/** Veredito divertido do clássico. */
function veredito(c) {
    if (c.vitorias > c.derrotas) return 'Você viu mais vitórias! 😎';
    if (c.vitorias === c.derrotas) return 'Tudo igual no seu tempo.';
    return 'Esse aí ainda está te devendo… 😤';
}

function resultado(dados, nome) {
    const r = dados.resumo;
    const primeiro = dados.primeiroJogo;
    const nasceuEmDiaDeJogo = primeiro && primeiro.data === dados.desde;
    const saudacao = nome ? `${nome}, desde` : 'Desde';

    return html`
        <div class="space-y-10">
            <header class="text-center space-y-3 pt-4">
                <p class="text-gray-400 text-xs font-bold uppercase tracking-[0.2em]">O Timão na sua vida</p>
                <h2 class="text-3xl md:text-5xl font-display font-bold text-white leading-tight">
                    ${saudacao} ${formatarData(dados.desde)}, o Corinthians fez
                    <span class="text-sccp-gold">${formatarNumero(r.jogos)} jogos</span> com você
                </h2>
                <p class="text-gray-400">${plural(r.temporadas, 'temporada')} de Fiel Torcida.</p>
            </header>

            <div class="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
                ${kpi('Vitórias', formatarNumero(r.vitorias), 'text-green-500')}
                ${kpi('Gols marcados', formatarNumero(r.golsPro), 'text-white')}
                ${kpi('Títulos', formatarNumero(dados.titulos.total), 'text-sccp-gold')}
                ${kpi('Aproveitamento', formatarPorcentagem(r.aproveitamento), corAproveitamento(r.aproveitamento))}
            </div>

            <section class="grid grid-cols-1 lg:grid-cols-5 gap-6 items-start">
                <div class="lg:col-span-3 space-y-6">
                    ${card(
                        {
                            titulo: 'Títulos que você viveu',
                            subtitulo: dados.titulos.primeiro
                                ? `Seu primeiro: ${dados.titulos.primeiro.competicao} ${dados.titulos.primeiro.edicao}`
                                : 'Ainda não veio o primeiro… mas vai vir!',
                        },
                        dados.titulos.competicoes.length
                            ? html`
                                  <ul class="space-y-4">
                                      ${ordenarPorPrestigio(dados.titulos.competicoes).map(
                                          (c) => html`
                                              <li>
                                                  <p class="text-white font-bold">${rotuloTitulo(c)}</p>
                                                  <p class="text-sm text-gray-400">${c.edicoes.join(' · ')}</p>
                                              </li>
                                          `,
                                      )}
                                  </ul>
                              `
                            : html`<p class="text-gray-400 text-sm">Nenhum título grande desde essa data.</p>`,
                    )}
                    ${
                        primeiro
                            ? html`
                                  <div class="space-y-3">
                                      <h3 class="text-lg font-bold text-white">
                                          ${nasceuEmDiaDeJogo ? '⚽ O Timão jogou no dia em que você nasceu!' : 'O primeiro jogo da sua vida'}
                                      </h3>
                                      ${gameCard(primeiro)}
                                  </div>
                              `
                            : ''
                    }
                </div>

                <div class="lg:col-span-2 space-y-6">
                    ${card(
                        { titulo: 'Clássicos no seu tempo' },
                        html`
                            <ul class="space-y-4">
                                ${dados.classicos.map(
                                    (c) => html`
                                        <li>
                                            <a
                                                href="/classicos/${c.slug}"
                                                class="flex items-center justify-between gap-3 hover:text-gray-300 transition"
                                            >
                                                <span class="flex items-center gap-2 text-white font-medium"
                                                    >${miniEscudo(c.rival)} ${c.nome}</span
                                                >
                                                <span class="text-sm text-gray-300 whitespace-nowrap"
                                                    >${c.vitorias}V ${c.empates}E ${c.derrotas}D</span
                                                >
                                            </a>
                                            <p class="text-xs text-gray-400 mt-1">${veredito(c)}</p>
                                        </li>
                                    `,
                                )}
                            </ul>
                        `,
                    )}
                    <div class="grid grid-cols-1 gap-4">
                        ${sequenciaTile('Maior invencibilidade que você viu', dados.sequencias.invencibilidade, 'text-white')}
                        ${
                            dados.melhorTemporada
                                ? html`
                                      <a
                                          href="/temporadas/${dados.melhorTemporada.ano}"
                                          class="block bg-gray-800/50 rounded-lg p-4 border border-gray-700 hover:border-gray-600 transition"
                                      >
                                          <p class="text-xs text-gray-400 uppercase font-bold mb-1">
                                              Melhor temporada que você viu
                                          </p>
                                          <p class="text-3xl font-bold font-display text-white">
                                              ${dados.melhorTemporada.ano}
                                          </p>
                                          <p class="text-xs text-gray-400 mt-1">
                                              ${formatarPorcentagem(dados.melhorTemporada.aproveitamento)} de
                                              aproveitamento
                                          </p>
                                      </a>
                                  `
                                : ''
                        }
                        ${
                            dados.maiorVitoria
                                ? html`
                                      <a
                                          href="/jogos/${dados.maiorVitoria.id}"
                                          class="block bg-gray-800/50 rounded-lg p-4 border border-gray-700 hover:border-gray-600 transition"
                                      >
                                          <p class="text-xs text-gray-400 uppercase font-bold mb-1">
                                              Maior goleada que você viu
                                          </p>
                                          <p class="text-white font-bold">
                                              Corinthians ${dados.maiorVitoria.golsPro} x
                                              ${dados.maiorVitoria.golsContra} ${dados.maiorVitoria.adversario.nome}
                                          </p>
                                          <p class="text-xs text-gray-400 mt-1">
                                              ${formatarData(dados.maiorVitoria.data)} ·
                                              ${dados.maiorVitoria.campeonato?.nome ?? ''}
                                          </p>
                                      </a>
                                  `
                                : ''
                        }
                    </div>
                </div>
            </section>

            <section class="bg-sccp-gray border border-gray-700 rounded-xl p-5 md:p-10" id="editor-cartao">
                <div class="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_auto] gap-8 items-start">
                    <div class="space-y-6 min-w-0">
                        <div class="space-y-2">
                            <h3 class="text-3xl font-display font-bold text-white">Mostre para a Fiel</h3>
                            <p class="text-gray-400">
                                Escolha o modelo, o formato e o que aparece. A imagem é feita aqui no seu aparelho: nada
                                é enviado para o site, nem a sua foto.
                            </p>
                        </div>

                        <fieldset class="space-y-2 min-w-0">
                            <legend class="text-xs font-bold uppercase tracking-wider text-gray-400 mb-2">
                                Modelo
                            </legend>
                            <div class="flex gap-3 overflow-x-auto pb-2 -mx-1 px-1 snap-x" role="radiogroup">
                                ${MODELOS.map(
                                    (m, i) => html`
                                        <button
                                            type="button"
                                            role="radio"
                                            aria-checked="${i === 0}"
                                            data-modelo="${m.id}"
                                            class="group flex-shrink-0 snap-start w-[72px] text-center focus-visible:outline-none"
                                        >
                                            <img
                                                src="/assets/img/story/miniaturas/${m.id}.jpg"
                                                alt=""
                                                width="72"
                                                height="128"
                                                loading="lazy"
                                                class="w-[72px] h-[128px] object-cover rounded-lg border-2 border-transparent group-aria-checked:border-sccp-gold group-hover:border-gray-500 group-focus-visible:border-white transition"
                                            />
                                            <span
                                                class="block text-[11px] mt-1 text-gray-400 group-aria-checked:text-white group-aria-checked:font-bold"
                                                >${m.nome}</span
                                            >
                                        </button>
                                    `,
                                )}
                            </div>
                        </fieldset>

                        <fieldset>
                            <legend class="text-xs font-bold uppercase tracking-wider text-gray-400 mb-2">
                                Formato
                            </legend>
                            <div class="grid grid-cols-3 gap-2" role="radiogroup">
                                ${Object.entries(FORMATOS).map(
                                    ([id, f], i) => html`
                                        <button
                                            type="button"
                                            role="radio"
                                            aria-checked="${i === 0}"
                                            data-formato="${id}"
                                            class="rounded-lg border border-gray-700 px-3 py-2 text-left transition hover:border-gray-500 aria-checked:border-sccp-gold aria-checked:bg-white/5"
                                        >
                                            <span class="block text-sm font-bold text-white">${f.nome}</span>
                                            <span class="block text-[11px] text-gray-400 leading-tight"
                                                >${f.descricao}</span
                                            >
                                        </button>
                                    `,
                                )}
                            </div>
                        </fieldset>

                        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <label
                                    for="cartao-destaque"
                                    class="block text-xs font-bold uppercase tracking-wider text-gray-400 mb-2"
                                    >Destaque</label
                                >
                                <select id="cartao-destaque" class="form-control py-2.5">
                                    ${Object.entries(DESTAQUES).map(([id, rotulo]) => html`<option value="${id}">${rotulo}</option>`)}
                                </select>
                            </div>
                            <div>
                                <span class="block text-xs font-bold uppercase tracking-wider text-gray-400 mb-2"
                                    >Foto de fundo</span
                                >
                                <div class="flex flex-wrap gap-2">
                                    <label class="btn-secondary text-sm cursor-pointer">
                                        <input type="file" id="cartao-foto" accept="image/*" class="sr-only" />
                                        Usar minha foto
                                    </label>
                                    <button type="button" id="cartao-tirar-foto" class="btn-ghost text-sm" hidden>
                                        Tirar foto
                                    </button>
                                </div>
                            </div>
                        </div>

                        <div class="space-y-2">
                            ${
                                nome
                                    ? html`<label class="flex items-center gap-3 text-sm text-gray-300 cursor-pointer">
                                          <input
                                              type="checkbox"
                                              id="cartao-nome"
                                              checked
                                              class="w-4 h-4 accent-[#D4AF37]"
                                          />
                                          Mostrar meu nome (${nome})
                                      </label>`
                                    : ''
                            }
                            <label class="flex items-start gap-3 text-sm text-gray-300 cursor-pointer">
                                <input type="checkbox" id="cartao-frase" class="w-4 h-4 mt-0.5 accent-[#D4AF37]" />
                                <span
                                    >Incluir a frase “${FRASE_CORINTHIANO}”
                                    <span class="text-gray-500">(no story e no feed)</span></span
                                >
                            </label>
                        </div>

                        <div class="flex flex-wrap gap-3 pt-2">
                            <button type="button" id="baixar-imagem" class="btn-primary" disabled>
                                Gerando imagem…
                            </button>
                            ${botaoCompartilhar('compartilhar-historia', 'Compartilhar')}
                        </div>
                        <a href="/minha-historia" class="inline-block text-sm text-gray-400 hover:text-white transition"
                            >↺ Fazer com outra data</a
                        >
                    </div>

                    <div class="flex justify-center order-first lg:order-none lg:sticky lg:top-28">
                        <div
                            id="previa-moldura"
                            class="w-48 sm:w-64 md:w-72 aspect-[9/16] rounded-xl overflow-hidden border border-gray-700 bg-black shadow-2xl"
                        >
                            <img id="previa-story" alt="Prévia da imagem" class="w-full h-full object-cover hidden" />
                            <div
                                id="previa-carregando"
                                class="w-full h-full flex items-center justify-center text-gray-500 text-sm"
                            >
                                Gerando…
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            <p class="text-center text-xs text-gray-500">
                Contagem a partir de ${formatarData(dados.desde)} (${anoDe(dados.desde)}), com os jogos registrados no
                acervo.
            </p>
        </div>
    `;
}

export default {
    async render({ query, signal }) {
        const nascimento = query.get('nascimento') ?? '';
        const nome = limparNome(query.get('nome'));

        if (!FORMATO_DATA.test(nascimento)) {
            return { title: 'O Timão na sua vida', content: formulario({ nome }) };
        }

        try {
            const dados = await api.minhaHistoria(nascimento, signal);
            return { title: 'O Timão na sua vida', content: resultado(dados, nome) };
        } catch (err) {
            if (err.name === 'AbortError' || !err.status || err.status >= 500) throw err;
            return { title: 'O Timão na sua vida', content: formulario({ nascimento, nome, erro: err.message }) };
        }
    },

    async mount(root, ctx) {
        const form = /** @type {HTMLFormElement | null} */ (root.querySelector('#form-minha-historia'));
        if (form) {
            form.addEventListener('submit', (e) => {
                e.preventDefault();
                const dados = new FormData(form);
                const nascimento = String(dados.get('nascimento') ?? '');
                const nome = limparNome(dados.get('nome'));
                if (!FORMATO_DATA.test(nascimento)) {
                    form.querySelector('#nascimento')?.focus();
                    return;
                }
                const params = new URLSearchParams({ nascimento });
                if (nome) params.set('nome', nome);
                navegar(`/minha-historia?${params}`);
            });
            return undefined;
        }

        // Resultado: gera a imagem e liga os botões
        const nascimento = ctx.query.get('nascimento') ?? '';
        const nome = limparNome(ctx.query.get('nome'));
        const botaoBaixar = /** @type {HTMLButtonElement} */ (root.querySelector('#baixar-imagem'));
        const previa = /** @type {HTMLImageElement} */ (root.querySelector('#previa-story'));
        const carregando = root.querySelector('#previa-carregando');
        let arquivo = null;
        let urlPrevia = null;

        // O link compartilhado leva ao formulário (sem a data de quem compartilhou)
        const dadosCompartilhar = () => ({
            title: 'O Timão na minha vida',
            text: 'Descobri quantos jogos e títulos o Corinthians viveu comigo. Descubra o seu! 🦅',
            url: `${location.origin}/minha-historia`,
        });

        const botaoCompartilharEl = root.querySelector('#compartilhar-historia');
        botaoCompartilharEl?.addEventListener(
            'click',
            async (e) => {
                // Com a imagem pronta e suporte a arquivos (celular), compartilha a imagem junto
                if (arquivo && navigator.canShare?.({ files: [arquivo] })) {
                    e.stopImmediatePropagation();
                    try {
                        await navigator.share({ ...dadosCompartilhar(), files: [arquivo] });
                    } catch {
                        /* usuário cancelou */
                    }
                }
            },
            { capture: true },
        );
        ligarCompartilhar(root, 'compartilhar-historia', dadosCompartilhar);

        const moldura = /** @type {HTMLElement} */ (root.querySelector('#previa-moldura'));
        const ASPECTO = { story: 'aspect-[9/16]', feed: 'aspect-[4/5]', quadrado: 'aspect-square' };
        const opcoes = {
            modelo: MODELOS[0].id,
            formato: 'story',
            destaque: 'titulos',
            frase: false,
            mostrarNome: true,
        };
        let fotoPropria = /** @type {HTMLImageElement | null} */ (null);
        let urlFoto = null;
        let dados = null;
        let geracao = 0;

        const nomeArquivo = () => `timao-na-minha-vida-${opcoes.formato}.png`;

        const gerar = async () => {
            if (!dados) return;
            const minha = ++geracao;
            botaoBaixar.disabled = true;
            botaoBaixar.textContent = 'Gerando imagem…';
            try {
                const blob = await gerarCartao(dados, {
                    ...opcoes,
                    nome: opcoes.mostrarNome ? nome : '',
                    site: location.host,
                    fotoPropria,
                });
                if (minha !== geracao) return; // o usuário já mudou de opção
                arquivo = new File([blob], nomeArquivo(), { type: 'image/png' });
                if (urlPrevia) URL.revokeObjectURL(urlPrevia);
                urlPrevia = URL.createObjectURL(blob);
                previa.src = urlPrevia;
                previa.classList.remove('hidden');
                carregando?.classList.add('hidden');
                botaoBaixar.disabled = false;
                botaoBaixar.textContent = 'Baixar imagem';
            } catch (err) {
                console.error(err);
                botaoBaixar.textContent = 'Não foi possível gerar a imagem';
                if (carregando) carregando.textContent = 'Erro ao gerar';
            }
        };
        const gerarDepois = debounce(gerar, 120);

        /** Marca a opção escolhida num grupo de botões (modelo ou formato). */
        const escolher = (atributo, valor) => {
            root.querySelectorAll(`[${atributo}]`).forEach((b) =>
                b.setAttribute('aria-checked', String(b.getAttribute(atributo) === valor)),
            );
        };

        root.querySelector('#editor-cartao')?.addEventListener('click', (e) => {
            const alvo = /** @type {HTMLElement} */ (e.target);
            const m = alvo.closest('[data-modelo]');
            const f = alvo.closest('[data-formato]');
            if (m) {
                opcoes.modelo = m.getAttribute('data-modelo') ?? opcoes.modelo;
                escolher('data-modelo', opcoes.modelo);
                gerarDepois();
            } else if (f) {
                opcoes.formato = f.getAttribute('data-formato') ?? opcoes.formato;
                escolher('data-formato', opcoes.formato);
                moldura.classList.remove(...Object.values(ASPECTO));
                moldura.classList.add(ASPECTO[opcoes.formato]);
                gerarDepois();
            }
        });

        root.querySelector('#cartao-destaque')?.addEventListener('change', (e) => {
            opcoes.destaque = /** @type {HTMLSelectElement} */ (e.target).value;
            gerarDepois();
        });
        root.querySelector('#cartao-frase')?.addEventListener('change', (e) => {
            opcoes.frase = /** @type {HTMLInputElement} */ (e.target).checked;
            gerarDepois();
        });
        root.querySelector('#cartao-nome')?.addEventListener('change', (e) => {
            opcoes.mostrarNome = /** @type {HTMLInputElement} */ (e.target).checked;
            gerarDepois();
        });

        // Foto própria: lida só no navegador (não vai para o servidor)
        const inputFoto = /** @type {HTMLInputElement} */ (root.querySelector('#cartao-foto'));
        const botaoTirarFoto = /** @type {HTMLButtonElement} */ (root.querySelector('#cartao-tirar-foto'));
        inputFoto?.addEventListener('change', () => {
            const file = inputFoto.files?.[0];
            if (!file || !file.type.startsWith('image/')) return;
            if (urlFoto) URL.revokeObjectURL(urlFoto);
            urlFoto = URL.createObjectURL(file);
            const img = new Image();
            img.onload = () => {
                fotoPropria = img;
                botaoTirarFoto.hidden = false;
                gerar();
            };
            img.src = urlFoto;
        });
        botaoTirarFoto?.addEventListener('click', () => {
            fotoPropria = null;
            inputFoto.value = '';
            botaoTirarFoto.hidden = true;
            gerar();
        });

        botaoBaixar.addEventListener('click', () => {
            if (!urlPrevia) return;
            const link = document.createElement('a');
            link.href = urlPrevia;
            link.download = nomeArquivo();
            link.click();
        });

        try {
            dados = await api.minhaHistoria(nascimento); // vem do cache
            await gerar();
        } catch (err) {
            console.error(err);
            botaoBaixar.textContent = 'Não foi possível gerar a imagem';
            if (carregando) carregando.textContent = 'Erro ao gerar';
        }

        return () => {
            geracao++;
            if (urlPrevia) URL.revokeObjectURL(urlPrevia);
            if (urlFoto) URL.revokeObjectURL(urlFoto);
        };
    },
};
