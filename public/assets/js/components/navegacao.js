/**
 * Menu do site: uma lista só de seções alimenta o menu lateral (computador),
 * o menu do celular e o bloco "Tudo no acervo" da home.
 * Para criar uma página nova no menu, basta adicioná-la aqui (e o ícone em ICONES).
 */

import { html } from '../core/html.js';

/**
 * @typedef {{ href: string, nav: string, titulo: string, descricao: string }} ItemMenu
 * @typedef {{ id: string, titulo: string, itens: ItemMenu[] }} Secao
 */

/** @type {Secao[]} */
export const SECOES = [
    {
        id: 'arquivo',
        titulo: 'Arquivo',
        itens: [
            { href: '/jogos', nav: 'jogos', titulo: 'Jogos', descricao: 'Todas as partidas desde 1910, com filtros' },
            { href: '/temporadas', nav: 'temporadas', titulo: 'Temporadas', descricao: 'A história ano a ano' },
            { href: '/titulos', nav: 'titulos', titulo: 'Títulos', descricao: 'A sala de troféus do Timão' },
        ],
    },
    {
        id: 'rivais',
        titulo: 'Rivais',
        itens: [
            {
                href: '/adversarios',
                nav: 'adversarios',
                titulo: 'Confrontos',
                descricao: 'Retrospecto contra cada adversário',
            },
            { href: '/classicos', nav: 'classicos', titulo: 'Clássicos', descricao: 'Derby, Majestoso e Alvinegro' },
            {
                href: '/fregueses',
                nav: 'fregueses',
                titulo: 'Fregueses & Tabus',
                descricao: 'Quem mais apanhou e os tabus em jogo',
            },
        ],
    },
    {
        id: 'numeros',
        titulo: 'Números',
        itens: [
            {
                href: '/estatisticas',
                nav: 'estatisticas',
                titulo: 'Estatísticas',
                descricao: 'Recordes, sequências e gráficos',
            },
            { href: '/estadios', nav: 'estadios', titulo: 'Estádios', descricao: 'O desempenho em cada estádio' },
            { href: '/mapa', nav: 'mapa', titulo: 'O Timão pelo mapa', descricao: 'Todas as cidades e países' },
        ],
    },
    {
        id: 'torcida',
        titulo: 'Torcida',
        itens: [
            { href: '/hoje', nav: 'hoje', titulo: 'Hoje na História', descricao: 'O que o Timão fez nesta data' },
            { href: '/quiz', nav: 'quiz', titulo: 'Quiz do Timão', descricao: '5 perguntas novas todo dia' },
            {
                href: '/penaltis',
                nav: 'penaltis',
                titulo: 'Disputa de Pênaltis',
                descricao: 'Bata e defenda contra os rivais',
            },
            {
                href: '/minha-historia',
                nav: 'minha-historia',
                titulo: 'O Timão na sua vida',
                descricao: 'Tudo que você viveu, num story',
            },
        ],
    },
];

/** Caminhos SVG (24×24, traço) dos ícones de cada página. */
export const ICONES = {
    '/jogos': 'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z',
    '/temporadas': 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z',
    '/titulos':
        'M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z',
    '/adversarios':
        'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z',
    '/classicos':
        'M17.657 18.657A8 8 0 016.343 7.343S7 9 9 10c0-2 .5-5 2.986-7C14 5 16.09 5.777 17.656 7.343A7.975 7.975 0 0120 13a7.975 7.975 0 01-2.343 5.657zM9.879 16.121A3 3 0 1012.015 11L11 14H9c0 .768.293 1.536.879 2.121z',
    '/fregueses': 'M13 7h8m0 0v8m0-8l-8 8-4-4-6 6',
    '/estatisticas':
        'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z',
    '/estadios':
        'M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4',
    '/mapa':
        'M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7',
    '/hoje': 'M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z',
    '/quiz':
        'M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z',
    '/penaltis':
        'M12 21a9 9 0 100-18 9 9 0 000 18zm0-13l3.8 2.8-1.45 4.45h-4.7L8.2 10.8 12 8zm0 0V3.5m3.8 7.3l4.6-1.5m-6.05 5.95l2.85 3.9m-7.5-3.9L6.85 19.2M8.2 10.8L3.6 9.3',
    '/minha-historia':
        'M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z',
    '/': 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6',
    '/sobre': 'M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z',
};

/** @param {string} href */
function icone(href) {
    return html`<svg
        class="w-5 h-5 flex-shrink-0"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        aria-hidden="true"
    >
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" d="${ICONES[href] ?? ''}" />
    </svg>`;
}

/**
 * Menu lateral do computador. Em telas médias (lg) mostra só os ícones, com o
 * nome ao passar o mouse; em telas grandes (xl), ícone + nome.
 */
function menuLateral() {
    const link = (href, nav, titulo) => html`
        <a
            href="${href}"
            data-nav="${nav}"
            title="${titulo}"
            class="flex items-center justify-center xl:justify-start gap-3 rounded-lg px-3 py-2 text-sm font-bold text-gray-400 border-l-2 border-transparent hover:text-white hover:bg-white/5 aria-[current=page]:bg-white/10 aria-[current=page]:text-white transition-colors"
            >${icone(href)}<span class="sr-only xl:not-sr-only whitespace-nowrap">${titulo}</span></a
        >
    `;
    return html`
        <div class="px-2 xl:px-3 py-5 space-y-5">
            <div>${link('/', 'home', 'Início')}</div>
            ${SECOES.map(
                (secao) => html`
                    <div class="space-y-0.5">
                        <p
                            class="hidden xl:block px-3 mb-1 text-[11px] font-bold uppercase tracking-[0.2em] text-gray-500"
                        >
                            ${secao.titulo}
                        </p>
                        <div class="xl:hidden mx-3 mb-2 border-t border-gray-800" aria-hidden="true"></div>
                        ${secao.itens.map((i) => link(i.href, i.nav, i.titulo))}
                    </div>
                `,
            )}
            <div class="border-t border-gray-800 pt-4">${link('/sobre', 'sobre', 'Sobre o acervo')}</div>
        </div>
    `;
}

/** Menu do celular, separado por seção. */
function menuMobile() {
    const link = (href, nav, titulo) => html`
        <a
            href="${href}"
            data-nav="${nav}"
            class="flex items-center gap-2.5 rounded-lg px-2 py-2.5 font-bold text-gray-400 border-l-2 border-transparent aria-[current=page]:bg-white/10 aria-[current=page]:text-white"
            >${icone(href)}<span>${titulo}</span></a
        >
    `;
    return html`
        <div class="px-4 py-4 space-y-5 max-h-[calc(100vh-5rem)] overflow-y-auto">
            <div>${link('/', 'home', 'Início')}</div>
            ${SECOES.map(
                (secao) => html`
                    <div>
                        <p class="px-2 text-[11px] font-bold uppercase tracking-[0.2em] text-gray-500 mb-1">
                            ${secao.titulo}
                        </p>
                        <div class="grid grid-cols-2 gap-x-3">
                            ${secao.itens.map((i) => link(i.href, i.nav, i.titulo))}
                        </div>
                    </div>
                `,
            )}
            <div class="border-t border-gray-800 pt-3">${link('/sobre', 'sobre', 'Sobre o acervo')}</div>
        </div>
    `;
}

/** Bloco "Tudo no acervo" da home. */
export function mapaDoSite() {
    return html`
        <section class="pb-8 pt-4">
            <div class="flex items-end justify-between mb-8 border-b border-gray-800 pb-4 gap-4">
                <h3 class="text-3xl font-display font-bold text-white">Tudo no acervo</h3>
            </div>
            <div class="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-6">
                ${SECOES.map(
                    (secao) => html`
                        <div class="space-y-2">
                            <p class="text-xs font-bold uppercase tracking-[0.2em] text-sccp-gold">${secao.titulo}</p>
                            <ul class="space-y-1">
                                ${secao.itens.map(
                                    (i) => html`
                                        <li>
                                            <a
                                                href="${i.href}"
                                                class="group flex items-start gap-3 rounded-lg -mx-3 px-3 py-2.5 hover:bg-white/5 transition-colors"
                                            >
                                                <span
                                                    class="text-gray-400 group-hover:text-sccp-gold mt-0.5 transition-colors"
                                                    >${icone(i.href)}</span
                                                >
                                                <span>
                                                    <span class="block font-bold text-white">${i.titulo}</span>
                                                    <span class="block text-sm text-gray-400">${i.descricao}</span>
                                                </span>
                                            </a>
                                        </li>
                                    `,
                                )}
                            </ul>
                        </div>
                    `,
                )}
            </div>
        </section>
    `;
}

/** Desenha os menus (chamado uma vez no main.js). */
export function iniciarNavegacao() {
    const lateral = document.getElementById('menu-lateral');
    const mobile = document.getElementById('mobile-menu');
    if (lateral) lateral.innerHTML = String(menuLateral());
    if (mobile) mobile.innerHTML = String(menuMobile());
}
