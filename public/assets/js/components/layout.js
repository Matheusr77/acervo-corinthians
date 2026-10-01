/**
 * Blocos de layout reutilizáveis: breadcrumb, cartões e títulos.
 */

import { html } from '../core/html.js';

/**
 * @param {{ label: string, href?: string }[]} itens - O último item é a página atual
 */
export function breadcrumb(itens) {
    return html`
        <nav aria-label="Você está em" class="flex flex-wrap items-center gap-2 text-sm text-gray-400">
            ${itens.map((item, i) => {
                const ultimo = i === itens.length - 1;
                return html`
                    ${i > 0 ? html`<span aria-hidden="true">/</span>` : ''}
                    ${
                        ultimo || !item.href
                            ? html`<span class="text-white" aria-current="${ultimo ? 'page' : 'false'}"
                                  >${item.label}</span
                              >`
                            : html`<a href="${item.href}" class="hover:text-white transition">${item.label}</a>`
                    }
                `;
            })}
        </nav>
    `;
}

/**
 * Cartão padrão com título.
 * @param {{ titulo?: string, subtitulo?: string, acao?: unknown, classe?: string }} opcoes
 * @param {unknown} conteudo
 */
export function card({ titulo, subtitulo, acao, classe = '' }, conteudo) {
    return html`
        <section class="bg-sccp-gray border border-gray-800 rounded-xl p-6 ${classe}">
            ${
                titulo
                    ? html`
                          <header class="flex items-start justify-between gap-4 mb-4 border-b border-gray-700/70 pb-3">
                              <div>
                                  <h3 class="text-lg font-bold text-white">${titulo}</h3>
                                  ${subtitulo ? html`<p class="text-gray-400 text-sm mt-0.5">${subtitulo}</p>` : ''}
                              </div>
                              ${acao ?? ''}
                          </header>
                      `
                    : ''
            }
            ${conteudo}
        </section>
    `;
}

/**
 * Título de página.
 * @param {string} titulo
 * @param {string} [descricao]
 */
export function pageHeader(titulo, descricao) {
    return html`
        <header class="space-y-2">
            <h2 class="text-3xl font-display font-bold text-white">${titulo}</h2>
            ${descricao ? html`<p class="text-gray-400">${descricao}</p>` : ''}
        </header>
    `;
}

/**
 * Link de ação em dourado ("Ver todos →").
 * @param {string} href
 * @param {string} label
 */
export function linkAcao(href, label) {
    return html`<a
        href="${href}"
        class="text-gray-300 text-sm font-bold uppercase tracking-wider hover:text-white transition whitespace-nowrap"
        >${label} &rarr;</a
    >`;
}
