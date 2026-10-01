/**
 * Estados de interface: carregando, vazio e erro.
 */

import { html } from '../core/html.js';

export function spinner() {
    return html`
        <div class="flex justify-center items-center h-64" role="status" aria-live="polite">
            <div class="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-sccp-gold"></div>
            <span class="sr-only">Carregando…</span>
        </div>
    `;
}

/** @param {string} mensagem */
export function emptyState(mensagem) {
    return html`
        <div class="text-center py-16 text-gray-400">
            <p class="text-lg">${mensagem}</p>
        </div>
    `;
}

/**
 * Tela de erro com botão para tentar novamente.
 * @param {Error & { status?: number }} err
 */
export function errorState(err) {
    const naoEncontrado = err?.status === 404;
    return html`
        <div class="max-w-lg mx-auto text-center py-20 space-y-4">
            <p class="text-6xl font-display font-bold ${naoEncontrado ? 'text-gray-700' : 'text-red-500/60'}">
                ${naoEncontrado ? '404' : 'Ops!'}
            </p>
            <h2 class="text-2xl font-display font-bold text-white">
                ${naoEncontrado ? 'Não encontramos o que você procurava' : 'Algo deu errado'}
            </h2>
            <p class="text-gray-400">${err?.message ?? 'Erro inesperado.'}</p>
            <div class="flex justify-center gap-3 pt-4">
                ${
                    naoEncontrado
                        ? ''
                        : html`<button type="button" data-action="retry" class="btn-primary">Tentar novamente</button>`
                }
                <a href="/" class="btn-secondary">Voltar ao início</a>
            </div>
        </div>
    `;
}
