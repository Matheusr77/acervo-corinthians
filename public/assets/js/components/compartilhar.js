/**
 * Botão "Compartilhar": usa o menu nativo do celular (Web Share API) quando
 * existe e, no computador, copia o link.
 */

import { html } from '../core/html.js';

/**
 * @param {string} id - id do botão (para ligar o evento no mount)
 * @param {string} [rotulo]
 */
export function botaoCompartilhar(id, rotulo = 'Compartilhar') {
    return html`
        <button type="button" id="${id}" class="btn-secondary gap-2">
            <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M8.684 13.342C8.886 12.938 9 12.482 9 12s-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"
                />
            </svg>
            <span data-rotulo>${rotulo}</span>
        </button>
    `;
}

/**
 * Liga o botão de compartilhar.
 * @param {HTMLElement} root
 * @param {string} id
 * @param {() => { title: string, text: string, url: string }} dados
 */
export function ligarCompartilhar(root, id, dados) {
    const botao = /** @type {HTMLButtonElement | null} */ (root.querySelector(`#${id}`));
    if (!botao) return;
    const rotulo = botao.querySelector('[data-rotulo]');
    const original = rotulo?.textContent ?? '';

    botao.addEventListener('click', async () => {
        const conteudo = dados();
        if (navigator.share) {
            try {
                await navigator.share(conteudo);
                return;
            } catch (err) {
                if (err.name === 'AbortError') return; // usuário fechou o menu
            }
        }
        try {
            await navigator.clipboard.writeText(`${conteudo.text} ${conteudo.url}`);
            if (rotulo) rotulo.textContent = 'Link copiado!';
        } catch {
            if (rotulo) rotulo.textContent = 'Não foi possível copiar';
        }
        setTimeout(() => {
            if (rotulo) rotulo.textContent = original;
        }, 2000);
    });
}
