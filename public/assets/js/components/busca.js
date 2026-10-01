/**
 * Busca geral (janela sobre a página).
 *
 * Abre pelo botão de lupa, pela tecla "/" ou por Ctrl/Cmd+K. Busca times,
 * estádios, campeonatos, temporadas (ex.: "1977") e páginas do site.
 * Setas ↑/↓ escolhem o resultado, Enter abre e Esc fecha.
 */

import { api } from '../core/api.js';
import { html } from '../core/html.js';
import { navegar } from '../core/router.js';
import { debounce } from '../utils/debounce.js';
import { plural } from '../utils/format.js';
import { miniEscudo } from './game.js';

const ATRASO_MS = 200;

/** Converte a resposta da API em grupos de links. */
function grupos(r) {
    return [
        { titulo: 'Páginas', itens: r.paginas.map((p) => ({ url: p.url, texto: p.titulo })) },
        {
            titulo: 'Temporadas',
            itens: r.temporadas.map((t) => ({
                url: `/temporadas/${t.ano}`,
                texto: `Temporada ${t.ano}`,
                detalhe: plural(t.jogos, 'jogo'),
            })),
        },
        {
            titulo: 'Times',
            itens: r.times.map((t) => ({
                url: `/adversarios/${t.id}`,
                texto: t.nome,
                detalhe: [t.cidade, plural(t.jogos, 'jogo')].filter(Boolean).join(' · '),
                time: t,
            })),
        },
        {
            titulo: 'Campeonatos',
            itens: r.campeonatos.map((c) => ({
                url: `/jogos?campeonato=${encodeURIComponent(c.nome)}`,
                texto: c.nome,
                detalhe: plural(c.jogos, 'jogo'),
            })),
        },
        {
            titulo: 'Estádios',
            itens: r.estadios.map((e) => ({
                url: `/estadios/${e.id}`,
                texto: e.nome,
                detalhe: [e.cidade, plural(e.jogos, 'jogo')].filter(Boolean).join(' · '),
            })),
        },
    ].filter((g) => g.itens.length);
}

function resultadosHtml(lista) {
    if (!lista.length) return html`<p class="px-5 py-8 text-center text-gray-400">Nada encontrado.</p>`;
    let indice = 0;
    return html`${lista.map(
        (g) => html`
            <div class="py-2">
                <p class="px-5 py-1 text-[11px] font-bold uppercase tracking-wider text-gray-400">${g.titulo}</p>
                <ul>
                    ${g.itens.map((item) => {
                        const i = indice++;
                        return html`
                            <li>
                                <a
                                    href="${item.url}"
                                    data-resultado="${i}"
                                    class="flex items-center gap-3 px-5 py-2.5 text-gray-200 hover:bg-white/5 aria-selected:bg-white/10 aria-selected:text-white"
                                    aria-selected="false"
                                    role="option"
                                >
                                    ${item.time ? miniEscudo(item.time) : ''}
                                    <span class="flex-1 min-w-0 truncate">${item.texto}</span>
                                    ${item.detalhe ? html`<span class="text-xs text-gray-400 flex-shrink-0">${item.detalhe}</span>` : ''}
                                </a>
                            </li>
                        `;
                    })}
                </ul>
            </div>
        `,
    )}`;
}

/** Cria a janela e liga os atalhos (chamado uma vez no main.js). */
export function iniciarBusca() {
    const dialogo = document.createElement('div');
    dialogo.id = 'busca-geral';
    dialogo.hidden = true;
    dialogo.className =
        'fixed inset-0 z-[70] bg-black/80 backdrop-blur-sm flex items-start justify-center px-4 pt-20 sm:pt-28';
    dialogo.setAttribute('role', 'dialog');
    dialogo.setAttribute('aria-modal', 'true');
    dialogo.setAttribute('aria-label', 'Buscar no acervo');
    dialogo.innerHTML = String(html`
        <div class="w-full max-w-xl bg-sccp-gray border border-gray-700 rounded-xl shadow-2xl overflow-hidden">
            <div class="flex items-center gap-3 px-5 border-b border-gray-800">
                <svg
                    class="w-5 h-5 text-gray-400 flex-shrink-0"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    aria-hidden="true"
                >
                    <path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        stroke-width="2"
                        d="M21 21l-4.35-4.35M17 11A6 6 0 115 11a6 6 0 0112 0z"
                    />
                </svg>
                <input
                    id="busca-geral-input"
                    type="search"
                    autocomplete="off"
                    placeholder="Time, estádio, campeonato ou ano…"
                    class="flex-1 bg-transparent py-4 text-white placeholder-gray-500 focus:outline-none"
                    role="combobox"
                    aria-expanded="true"
                    aria-controls="busca-geral-resultados"
                />
                <kbd class="hidden sm:inline text-[10px] text-gray-400 border border-gray-700 rounded px-1.5 py-0.5"
                    >Esc</kbd
                >
            </div>
            <div id="busca-geral-resultados" role="listbox" class="max-h-[60vh] overflow-y-auto">
                <p class="px-5 py-8 text-center text-gray-400 text-sm">Ex.: Palmeiras, Pacaembu, Libertadores, 1977</p>
            </div>
        </div>
    `);
    document.body.appendChild(dialogo);

    const input = /** @type {HTMLInputElement} */ (dialogo.querySelector('#busca-geral-input'));
    const resultados = /** @type {HTMLElement} */ (dialogo.querySelector('#busca-geral-resultados'));
    let selecionado = -1;
    let controller = null;
    let focoAnterior = null;

    const itens = () => [...resultados.querySelectorAll('[data-resultado]')];
    const selecionar = (i) => {
        const lista = itens();
        if (!lista.length) return;
        selecionado = (i + lista.length) % lista.length;
        lista.forEach((el, j) => el.setAttribute('aria-selected', String(j === selecionado)));
        lista[selecionado].scrollIntoView({ block: 'nearest' });
    };

    const abrir = () => {
        focoAnterior = document.activeElement;
        dialogo.hidden = false;
        document.body.style.overflow = 'hidden';
        input.focus();
        input.select();
    };
    const fechar = () => {
        dialogo.hidden = true;
        document.body.style.overflow = '';
        controller?.abort();
        if (focoAnterior instanceof HTMLElement) focoAnterior.focus();
    };

    const buscar = debounce(async () => {
        const termo = input.value.trim();
        controller?.abort();
        if (!termo) {
            resultados.innerHTML = '';
            return;
        }
        controller = new AbortController();
        try {
            const r = await api.busca(termo, controller.signal);
            resultados.innerHTML = String(resultadosHtml(grupos(r)));
            selecionado = -1;
            selecionar(0);
        } catch (err) {
            if (err.name !== 'AbortError') {
                resultados.innerHTML = String(
                    html`<p class="px-5 py-8 text-center text-red-400 text-sm">${err.message}</p>`,
                );
            }
        }
    }, ATRASO_MS);

    input.addEventListener('input', buscar);
    input.addEventListener('keydown', (e) => {
        if (e.key === 'ArrowDown') {
            e.preventDefault();
            selecionar(selecionado + 1);
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            selecionar(selecionado - 1);
        } else if (e.key === 'Enter') {
            const alvo = itens()[selecionado];
            if (alvo) {
                e.preventDefault();
                fechar();
                navegar(alvo.getAttribute('href'));
            }
        }
    });
    // Clique num resultado: o roteador navega; aqui só fecha a janela
    resultados.addEventListener('click', (e) => {
        if (/** @type {HTMLElement} */ (e.target).closest('a')) fechar();
    });
    dialogo.addEventListener('click', (e) => {
        if (e.target === dialogo) fechar();
    });

    document.addEventListener('keydown', (e) => {
        const digitando = /** @type {HTMLElement} */ (e.target).closest?.('input, textarea, select, [contenteditable]');
        if (e.key === 'Escape' && !dialogo.hidden) fechar();
        else if ((e.key === '/' && !digitando) || ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k')) {
            e.preventDefault();
            abrir();
        }
    });
    document.querySelectorAll('[data-abrir-busca]').forEach((b) => b.addEventListener('click', abrir));
}
