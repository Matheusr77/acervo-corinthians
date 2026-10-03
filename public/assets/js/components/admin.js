/**
 * Peças comuns do painel de administração (/admin/...): senha e abas.
 * A senha (ADMIN_TOKEN) fica só nesta aba do navegador (sessionStorage).
 */

import { html } from '../core/html.js';

const CHAVE_TOKEN = 'acervo:admin-token';

export function lerToken() {
    try {
        return sessionStorage.getItem(CHAVE_TOKEN) ?? '';
    } catch {
        return '';
    }
}

/** @param {string} token - vazio apaga */
export function salvarToken(token) {
    try {
        if (token) sessionStorage.setItem(CHAVE_TOKEN, token);
        else sessionStorage.removeItem(CHAVE_TOKEN);
    } catch {
        /* sem armazenamento: pede a senha a cada visita */
    }
}

/** Formulário de senha do painel. */
export function formLogin(mensagem) {
    return html`
        <form id="admin-login" class="max-w-sm bg-sccp-gray border border-gray-800 rounded-xl p-6 space-y-4">
            <div>
                <label for="admin-token" class="block text-sm font-bold text-gray-200 mb-1">Senha do painel</label>
                <input id="admin-token" type="password" autocomplete="current-password" class="form-control" required />
                <p class="text-xs text-gray-400 mt-2">
                    É o valor de <code>ADMIN_TOKEN</code> no arquivo .env do servidor.
                </p>
            </div>
            ${mensagem ? html`<p class="text-sm text-red-400" role="alert">${mensagem}</p>` : ''}
            <button type="submit" class="btn-primary w-full">Entrar</button>
        </form>
    `;
}

/** Abas entre as páginas do painel. @param {'correcoes' | 'posts'} atual */
export function abasAdmin(atual) {
    const aba = (id, href, rotulo) => html`
        <a
            href="${href}"
            aria-current="${atual === id ? 'page' : 'false'}"
            class="px-4 py-2 rounded-lg text-sm font-bold transition ${atual === id ? 'bg-white text-black' : 'text-gray-300 hover:text-white hover:bg-white/5'}"
            >${rotulo}</a
        >
    `;
    return html`
        <nav class="inline-flex gap-1 p-1 rounded-xl border border-gray-800 bg-gray-900" aria-label="Painel">
            ${aba('posts', '/admin/posts', 'Posts do dia')} ${aba('correcoes', '/admin/correcoes', 'Correções')}
        </nav>
    `;
}
