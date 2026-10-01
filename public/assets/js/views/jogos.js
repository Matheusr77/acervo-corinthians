/**
 * Listagem de jogos com filtros (sincronizados com a URL) e paginação.
 *
 * Os filtros ficam na query string (/jogos?ano=2012&resultado=V), então
 * qualquer busca pode ser compartilhada por link ou recuperada com "voltar".
 */

import { api } from '../core/api.js';
import { html } from '../core/html.js';
import { replaceQuery } from '../core/router.js';
import { emptyState } from '../components/feedback.js';
import { gameCard } from '../components/game.js';
import { debounce } from '../utils/debounce.js';
import { formatarNumero } from '../utils/format.js';

const POR_PAGINA = 20;
const DEBOUNCE_BUSCA_MS = 300;

/** Filtros aceitos e seus valores padrão. */
const CAMPOS = ['ano', 'campeonato', 'adversario', 'resultado', 'mando', 'ordem'];

/** @param {URLSearchParams} query */
function lerFiltros(query) {
    return Object.fromEntries(CAMPOS.map((campo) => [campo, query.get(campo) ?? '']));
}

/**
 * @param {string} id
 * @param {string} rotulo
 * @param {unknown} opcoes - <option>s
 */
function campoSelect(id, rotulo, opcoes) {
    return html`
        <div>
            <label for="filtro-${id}" class="block text-xs font-semibold text-gray-400 uppercase mb-1">${rotulo}</label>
            <select id="filtro-${id}" name="${id}" class="form-control">
                ${opcoes}
            </select>
        </div>
    `;
}

/**
 * @param {string} valor
 * @param {string} rotulo
 * @param {string} atual
 */
function opcao(valor, rotulo, atual) {
    return html`<option value="${valor}" ${valor === atual ? 'selected' : ''}>${rotulo}</option>`;
}

function sidebar(filtros, opcoesFiltro) {
    return html`
        <aside class="w-full lg:w-64 flex-shrink-0">
            <form
                id="form-filtros"
                class="bg-sccp-gray p-5 rounded-xl border border-gray-800 lg:sticky lg:top-24"
                role="search"
                aria-label="Filtrar jogos"
            >
                <h3 class="font-display font-bold text-white mb-4 flex items-center gap-2">
                    <svg
                        class="w-4 h-4 text-gray-400"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        aria-hidden="true"
                    >
                        <path
                            stroke-linecap="round"
                            stroke-linejoin="round"
                            stroke-width="2"
                            d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z"
                        />
                    </svg>
                    Filtros
                </h3>

                <div class="grid grid-cols-2 lg:grid-cols-1 gap-4">
                    ${campoSelect(
                        'ano',
                        'Ano',
                        html`${opcao('', 'Todos', filtros.ano)}${opcoesFiltro.anos.map((ano) => opcao(String(ano), String(ano), filtros.ano))}`,
                    )}
                    ${campoSelect(
                        'campeonato',
                        'Competição',
                        html`${opcao('', 'Todas', filtros.campeonato)}${opcoesFiltro.campeonatos.map((c) => opcao(c.nome, c.nome, filtros.campeonato))}`,
                    )}
                    <div class="col-span-2 lg:col-span-1">
                        <label for="filtro-adversario" class="block text-xs font-semibold text-gray-400 uppercase mb-1"
                            >Adversário</label
                        >
                        <input
                            type="search"
                            id="filtro-adversario"
                            name="adversario"
                            value="${filtros.adversario}"
                            placeholder="Buscar time..."
                            autocomplete="off"
                            class="form-control"
                        />
                    </div>
                    ${campoSelect(
                        'resultado',
                        'Resultado',
                        html`${opcao('', 'Todos', filtros.resultado)}${opcao('V', 'Vitórias', filtros.resultado)}${opcao('E', 'Empates', filtros.resultado)}${opcao('D', 'Derrotas', filtros.resultado)}`,
                    )}
                    ${campoSelect(
                        'mando',
                        'Mando',
                        html`${opcao('', 'Todos', filtros.mando)}${opcao('casa', 'Mandante', filtros.mando)}${opcao('fora', 'Visitante', filtros.mando)}`,
                    )}
                    ${campoSelect(
                        'ordem',
                        'Ordenar',
                        html`${opcao('', 'Mais recentes', filtros.ordem)}${opcao('asc', 'Mais antigos', filtros.ordem)}`,
                    )}
                </div>

                <button type="button" id="limpar-filtros" class="btn-secondary w-full mt-5">Limpar Filtros</button>
            </form>
        </aside>
    `;
}

function contador(total) {
    return total === 1 ? '1 jogo encontrado' : `${formatarNumero(total)} jogos encontrados`;
}

export default {
    async render({ query, signal }) {
        const filtros = lerFiltros(query);
        const [opcoesFiltro, pagina1] = await Promise.all([
            api.filtrosJogos(signal),
            api.jogos({ ...filtros, pagina: 1, limite: POR_PAGINA }, signal),
        ]);

        return {
            title: 'Jogos',
            content: html`
                <div class="flex flex-col lg:flex-row gap-8">
                    ${sidebar(filtros, opcoesFiltro)}

                    <div class="flex-1 min-w-0">
                        <div class="flex justify-between items-center mb-6 gap-4">
                            <h2 class="text-2xl font-bold text-white">Resultados</h2>
                            <span
                                id="contador-jogos"
                                class="text-gray-400 text-sm bg-gray-900 px-3 py-1 rounded-full border border-gray-800"
                                aria-live="polite"
                            >
                                ${contador(pagina1.paginacao.total)}
                            </span>
                        </div>

                        <div id="lista-jogos" class="space-y-3 transition-opacity">
                            ${pagina1.dados.length ? pagina1.dados.map(gameCard) : emptyState('Nenhum jogo encontrado com esses filtros.')}
                        </div>

                        <div class="mt-8 text-center">
                            <button
                                type="button"
                                id="carregar-mais"
                                class="btn-ghost"
                                ${pagina1.paginacao.totalPaginas > 1 ? '' : 'hidden'}
                            >
                                Carregar mais jogos
                                <svg
                                    class="w-4 h-4"
                                    fill="none"
                                    viewBox="0 0 24 24"
                                    stroke="currentColor"
                                    aria-hidden="true"
                                >
                                    <path
                                        stroke-linecap="round"
                                        stroke-linejoin="round"
                                        stroke-width="2"
                                        d="M19 9l-7 7-7-7"
                                    />
                                </svg>
                            </button>
                        </div>
                    </div>
                </div>
            `,
        };
    },

    mount(root, ctx) {
        const form = /** @type {HTMLFormElement} */ (root.querySelector('#form-filtros'));
        const lista = /** @type {HTMLElement} */ (root.querySelector('#lista-jogos'));
        const contadorEl = /** @type {HTMLElement} */ (root.querySelector('#contador-jogos'));
        const botaoMais = /** @type {HTMLButtonElement} */ (root.querySelector('#carregar-mais'));
        const botaoLimpar = /** @type {HTMLButtonElement} */ (root.querySelector('#limpar-filtros'));

        let filtros = lerFiltros(ctx.query);
        let pagina = 1;
        let controller = null;

        const lerFormulario = () =>
            Object.fromEntries(CAMPOS.map((c) => [c, String(new FormData(form).get(c) ?? '').trim()]));

        /**
         * Busca uma página e atualiza a lista.
         * @param {{ anexar: boolean }} opcoes - true = "carregar mais"; false = novo filtro
         */
        async function carregar({ anexar }) {
            controller?.abort();
            controller = new AbortController();
            const proxima = anexar ? pagina + 1 : 1;

            botaoMais.disabled = true;
            if (!anexar) lista.classList.add('opacity-50');

            try {
                const resposta = await api.jogos(
                    { ...filtros, pagina: proxima, limite: POR_PAGINA },
                    controller.signal,
                );
                pagina = proxima;

                const cards = String(html`${resposta.dados.map(gameCard)}`);
                if (anexar) {
                    lista.insertAdjacentHTML('beforeend', cards);
                } else {
                    lista.innerHTML = resposta.dados.length
                        ? cards
                        : String(emptyState('Nenhum jogo encontrado com esses filtros.'));
                }

                contadorEl.textContent = contador(resposta.paginacao.total);
                botaoMais.hidden = pagina >= resposta.paginacao.totalPaginas;
            } catch (err) {
                if (err.name === 'AbortError') return;
                console.error(err);
                lista.insertAdjacentHTML(
                    anexar ? 'beforeend' : 'afterbegin',
                    String(html`<p class="text-red-400 text-sm py-4 text-center">${err.message}</p>`),
                );
            } finally {
                botaoMais.disabled = false;
                lista.classList.remove('opacity-50');
            }
        }

        const aplicar = () => {
            filtros = lerFormulario();
            replaceQuery('/jogos', filtros);
            carregar({ anexar: false });
        };
        const aplicarComAtraso = debounce(aplicar, DEBOUNCE_BUSCA_MS);

        const onChange = (e) => {
            if (e.target.name !== 'adversario') aplicar();
        };
        const onInput = (e) => {
            if (e.target.name === 'adversario') aplicarComAtraso();
        };
        const onLimpar = () => {
            // form.reset() voltaria aos valores vindos da URL, então zeramos campo a campo
            for (const campo of CAMPOS) form.elements.namedItem(campo).value = '';
            aplicarComAtraso.cancel();
            aplicar();
        };
        const onSubmit = (e) => {
            e.preventDefault();
            aplicarComAtraso.cancel();
            aplicar();
        };
        const onMais = () => carregar({ anexar: true });

        form.addEventListener('change', onChange);
        form.addEventListener('input', onInput);
        botaoLimpar.addEventListener('click', onLimpar);
        form.addEventListener('submit', onSubmit);
        botaoMais.addEventListener('click', onMais);

        return () => {
            controller?.abort();
            aplicarComAtraso.cancel();
        };
    },
};
