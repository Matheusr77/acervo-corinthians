/**
 * Redes sociais e contato do Acervo (rodapé e página Sobre).
 * Ícones em uma cor só: seguem o tema (brancos no escuro, pretos no claro).
 */

import { html, raw } from '../core/html.js';

export const CONTATO = 'contato@acervocorinthians.com.br';

export const REDES = [
    {
        nome: 'X (Twitter)',
        usuario: '@sccpacervo',
        url: 'https://x.com/sccpacervo',
        icone: '<path fill="currentColor" d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>',
    },
    {
        nome: 'Instagram',
        usuario: '@sccpacervo',
        url: 'https://instagram.com/sccpacervo',
        icone: '<rect x="3" y="3" width="18" height="18" rx="5" fill="none" stroke="currentColor" stroke-width="2"/><circle cx="12" cy="12" r="4.2" fill="none" stroke="currentColor" stroke-width="2"/><circle cx="17.4" cy="6.6" r="1.2" fill="currentColor"/>',
    },
];

/**
 * Ícones das redes, lado a lado.
 * @param {{ tamanho?: string }} [opcoes] - classes de tamanho do ícone
 */
export function iconesRedes({ tamanho = 'w-5 h-5' } = {}) {
    return html`
        <ul class="flex items-center gap-3" aria-label="Redes sociais">
            ${REDES.map(
                (r) => html`
                    <li>
                        <a
                            href="${r.url}"
                            target="_blank"
                            rel="noopener noreferrer"
                            class="flex items-center justify-center w-10 h-10 rounded-full border border-gray-700 text-white/70 hover:text-white hover:border-gray-400 transition"
                            aria-label="${r.nome}: ${r.usuario}"
                            title="${r.nome}: ${r.usuario}"
                        >
                            <svg class="${tamanho}" viewBox="0 0 24 24" aria-hidden="true">${raw(r.icone)}</svg>
                        </a>
                    </li>
                `,
            )}
        </ul>
    `;
}

/** Preenche os espaços [data-redes] do HTML fixo (rodapé). */
export function iniciarRedes() {
    document.querySelectorAll('[data-redes]').forEach((el) => {
        el.innerHTML = String(iconesRedes());
    });
}
