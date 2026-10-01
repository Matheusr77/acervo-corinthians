/**
 * Painel de revisão dos avisos "Achou um erro?" (/admin/correcoes).
 *
 * Protegido pela senha ADMIN_TOKEN do servidor. A senha fica só nesta aba
 * (sessionStorage) e vai no cabeçalho Authorization de cada pedido.
 */

import { api } from '../core/api.js';
import { html } from '../core/html.js';
import { pageHeader } from '../components/layout.js';

const CHAVE_TOKEN = 'acervo:admin-token';
const FILTROS = [
    ['aberta', 'Abertas'],
    ['aceita', 'Aceitas'],
    ['recusada', 'Recusadas'],
    ['', 'Todas'],
];
const COR_STATUS = {
    aberta: 'bg-sccp-gold/15 text-sccp-gold border-sccp-gold/40',
    aceita: 'bg-green-600/15 text-green-400 border-green-600/40',
    recusada: 'bg-red-600/15 text-red-400 border-red-600/40',
};

function lerToken() {
    try {
        return sessionStorage.getItem(CHAVE_TOKEN) ?? '';
    } catch {
        return '';
    }
}
function salvarToken(token) {
    try {
        if (token) sessionStorage.setItem(CHAVE_TOKEN, token);
        else sessionStorage.removeItem(CHAVE_TOKEN);
    } catch {
        /* sem armazenamento: pede a senha a cada visita */
    }
}

const dataHora = (iso) =>
    new Date(iso).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short', timeZone: 'America/Sao_Paulo' });

function login(mensagem) {
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

function itemCorrecao(c, tipos) {
    const acoes = {
        aberta: [
            ['aceita', 'Aceitar', 'btn-primary'],
            ['recusada', 'Recusar', 'btn-secondary'],
        ],
        aceita: [['aberta', 'Reabrir', 'btn-ghost']],
        recusada: [['aberta', 'Reabrir', 'btn-ghost']],
    }[c.status];
    return html`
        <li class="bg-sccp-gray border border-gray-800 rounded-xl p-5 space-y-3" data-id="${c.id}">
            <div class="flex flex-wrap items-center gap-2 text-xs">
                <span class="px-2 py-0.5 rounded-full border font-bold uppercase ${COR_STATUS[c.status]}"
                    >${c.status}</span
                >
                <span class="px-2 py-0.5 rounded-full border border-gray-700 text-gray-300"
                    >${tipos[c.tipo] ?? c.tipo}</span
                >
                <span class="text-gray-400">${dataHora(c.criadoEm)}</span>
                <a href="${c.pagina}" class="link ml-auto">${c.pagina}</a>
            </div>
            <p class="text-gray-200 whitespace-pre-line">${c.descricao}</p>
            ${c.sugestao ? html`<p class="text-sm text-gray-400"><strong class="text-gray-300">Fonte / valor correto:</strong> ${c.sugestao}</p>` : ''}
            <div class="flex flex-wrap items-center justify-between gap-3 pt-1">
                <p class="text-xs text-gray-400">
                    ${c.nome ?? 'Anônimo'}${c.email ? html` · <a href="mailto:${c.email}" class="link">${c.email}</a>` : ''}
                    ${c.jogoId ? html` · <a href="/jogos/${c.jogoId}" class="link">jogo #${c.jogoId}</a>` : ''}
                </p>
                <div class="flex gap-2">
                    ${acoes.map(
                        ([status, rotulo, classe]) =>
                            html`<button type="button" class="${classe} text-sm" data-status="${status}">
                                ${rotulo}
                            </button>`,
                    )}
                </div>
            </div>
        </li>
    `;
}

function painel(dados, filtro) {
    const total = (s) => (s ? dados.contagem[s] : Object.values(dados.contagem).reduce((a, b) => a + b, 0));
    return html`
        <div class="flex flex-wrap items-center justify-between gap-3">
            <nav
                class="inline-flex flex-wrap gap-1 p-1 rounded-xl border border-gray-800 bg-gray-900"
                aria-label="Filtrar"
            >
                ${FILTROS.map(
                    ([valor, rotulo]) => html`
                        <button
                            type="button"
                            data-filtro="${valor}"
                            aria-pressed="${filtro === valor}"
                            class="px-3 py-1.5 rounded-lg text-sm font-bold transition ${filtro === valor ? 'bg-white text-black' : 'text-gray-300 hover:text-white hover:bg-white/5'}"
                        >
                            ${rotulo} <span class="opacity-70">${total(valor)}</span>
                        </button>
                    `,
                )}
            </nav>
            <button type="button" id="admin-sair" class="btn-ghost text-sm">Sair</button>
        </div>
        ${
            dados.correcoes.length
                ? html`<ol class="space-y-4">
                      ${dados.correcoes.map((c) => itemCorrecao(c, dados.tipos))}
                  </ol>`
                : html`<p class="text-gray-400 text-center py-12">Nenhum aviso aqui. 🦅</p>`
        }
    `;
}

export default {
    render() {
        return {
            title: 'Correções recebidas',
            content: html`
                <div class="max-w-4xl mx-auto space-y-8">
                    ${pageHeader('Correções recebidas', 'Avisos de erro enviados pela torcida.')}
                    <div id="admin-conteudo" class="space-y-6"></div>
                </div>
            `,
        };
    },

    mount(root) {
        const alvo = /** @type {HTMLElement} */ (root.querySelector('#admin-conteudo'));
        let token = lerToken();
        let filtro = 'aberta';
        let ativo = true;

        const mostrarLogin = (mensagem) => {
            alvo.innerHTML = String(login(mensagem));
            /** @type {HTMLElement} */ (alvo.querySelector('#admin-token')).focus();
        };

        const carregar = async () => {
            if (!token) return mostrarLogin();
            alvo.setAttribute('aria-busy', 'true');
            try {
                const dados = await api.correcoes(token, filtro || undefined);
                if (ativo) alvo.innerHTML = String(painel(dados, filtro));
            } catch (err) {
                if (!ativo) return;
                if (err.status === 401) {
                    token = '';
                    salvarToken('');
                }
                mostrarLogin(err.message);
            } finally {
                alvo.removeAttribute('aria-busy');
            }
        };

        alvo.addEventListener('submit', (e) => {
            e.preventDefault();
            token = /** @type {HTMLInputElement} */ (alvo.querySelector('#admin-token')).value.trim();
            salvarToken(token);
            carregar();
        });

        alvo.addEventListener('click', async (e) => {
            const el = /** @type {HTMLElement} */ (e.target);
            const botaoFiltro = el.closest('[data-filtro]');
            if (botaoFiltro) {
                filtro = botaoFiltro.getAttribute('data-filtro') ?? '';
                return carregar();
            }
            if (el.closest('#admin-sair')) {
                token = '';
                salvarToken('');
                return mostrarLogin();
            }
            const botaoStatus = /** @type {HTMLButtonElement | null} */ (el.closest('[data-status]'));
            const item = botaoStatus?.closest('[data-id]');
            if (botaoStatus && item) {
                botaoStatus.disabled = true;
                try {
                    await api.atualizarCorrecao(token, item.getAttribute('data-id'), botaoStatus.dataset.status);
                    await carregar();
                } catch (err) {
                    botaoStatus.disabled = false;
                    alert(err.message);
                }
            }
        });

        carregar();
        return () => {
            ativo = false;
        };
    },
};
