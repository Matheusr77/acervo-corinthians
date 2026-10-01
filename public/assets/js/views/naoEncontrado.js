/**
 * Página 404 da SPA.
 */

import { html } from '../core/html.js';

export default {
    async render() {
        return {
            title: 'Página não encontrada',
            content: html`
                <div class="max-w-lg mx-auto text-center py-20 space-y-4">
                    <p class="text-7xl font-display font-bold text-gray-700">404</p>
                    <h2 class="text-2xl font-display font-bold text-white">Página não encontrada</h2>
                    <p class="text-gray-400">O endereço acessado não existe no acervo.</p>
                    <div class="pt-4"><a href="/" class="btn-primary">Voltar ao início</a></div>
                </div>
            `,
        };
    },
};
