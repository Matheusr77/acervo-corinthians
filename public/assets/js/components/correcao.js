/**
 * "Achou um erro? Avise": botão + janela com formulário para a torcida
 * apontar erros no acervo (placar, data, estádio...).
 *
 * Qualquer elemento com [data-reportar-erro] abre a janela; o contexto
 * (página atual e, se houver, o jogo) vai junto com o aviso.
 */

import { api } from '../core/api.js';
import { html } from '../core/html.js';

const TIPOS = [
    ['placar', 'Placar'],
    ['data', 'Data'],
    ['adversario', 'Adversário'],
    ['estadio', 'Estádio / cidade'],
    ['campeonato', 'Campeonato'],
    ['fase', 'Fase / rodada'],
    ['observacao', 'Observação / título'],
    ['outro', 'Outro'],
];

/**
 * Botão que abre o formulário.
 * @param {{ jogoId?: number, rotulo?: string, tipo?: string }} [opcoes]
 */
export function botaoCorrecao({ jogoId, rotulo = 'Achou um erro? Avise', tipo } = {}) {
    return html`
        <button
            type="button"
            class="btn-ghost gap-2 text-sm"
            data-reportar-erro
            ${jogoId ? html`data-jogo-id="${jogoId}"` : ''}
            ${tipo ? html`data-tipo="${tipo}"` : ''}
        >
            <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M3 21V4m0 0h11l-1.5 4L14 12H3"
                />
            </svg>
            ${rotulo}
        </button>
    `;
}

function formulario() {
    return html`
        <form method="dialog" class="space-y-4" novalidate>
            <header class="flex items-start justify-between gap-4">
                <div>
                    <h2 id="correcao-titulo" class="text-xl font-display font-bold text-white">Achou um erro?</h2>
                    <p class="text-sm text-gray-400 mt-1">
                        O acervo é feito com carinho, mas pode ter falhas. Conte o que está errado e a gente confere.
                    </p>
                </div>
                <button
                    type="button"
                    data-fechar
                    class="text-gray-400 hover:text-white p-1 -m-1 rounded"
                    aria-label="Fechar"
                >
                    <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                        <path
                            stroke-linecap="round"
                            stroke-linejoin="round"
                            stroke-width="2"
                            d="M6 18L18 6M6 6l12 12"
                        />
                    </svg>
                </button>
            </header>

            <p data-contexto class="text-xs text-gray-400 bg-black/40 border border-gray-800 rounded-lg px-3 py-2"></p>

            <div>
                <label for="correcao-tipo" class="block text-sm font-bold text-gray-200 mb-1">O que está errado?</label>
                <select id="correcao-tipo" name="tipo" class="form-control" required>
                    <option value="">Escolha…</option>
                    ${TIPOS.map(([valor, rotulo]) => html`<option value="${valor}">${rotulo}</option>`)}
                </select>
                <p class="text-xs text-red-400 mt-1" data-erro="tipo"></p>
            </div>

            <div>
                <label for="correcao-descricao" class="block text-sm font-bold text-gray-200 mb-1"
                    >Descreva o erro</label
                >
                <textarea
                    id="correcao-descricao"
                    name="descricao"
                    rows="4"
                    maxlength="1000"
                    required
                    class="form-control"
                    placeholder="Ex.: o placar desse jogo foi 3 x 1, não 2 x 1."
                ></textarea>
                <p class="text-xs text-red-400 mt-1" data-erro="descricao"></p>
            </div>

            <div>
                <label for="correcao-sugestao" class="block text-sm font-bold text-gray-200 mb-1"
                    >Fonte ou valor correto <span class="font-normal text-gray-400">(opcional)</span></label
                >
                <input
                    id="correcao-sugestao"
                    name="sugestao"
                    maxlength="300"
                    class="form-control"
                    placeholder="Link de jornal, livro, site do clube…"
                />
                <p class="text-xs text-red-400 mt-1" data-erro="sugestao"></p>
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                    <label for="correcao-nome" class="block text-sm font-bold text-gray-200 mb-1"
                        >Seu nome <span class="font-normal text-gray-400">(opcional)</span></label
                    >
                    <input id="correcao-nome" name="nome" maxlength="60" autocomplete="name" class="form-control" />
                    <p class="text-xs text-red-400 mt-1" data-erro="nome"></p>
                </div>
                <div>
                    <label for="correcao-email" class="block text-sm font-bold text-gray-200 mb-1"
                        >E-mail <span class="font-normal text-gray-400">(opcional)</span></label
                    >
                    <input
                        id="correcao-email"
                        name="email"
                        type="email"
                        maxlength="120"
                        autocomplete="email"
                        class="form-control"
                    />
                    <p class="text-xs text-red-400 mt-1" data-erro="email"></p>
                </div>
            </div>

            <!-- Armadilha para robôs: escondida de pessoas e leitores de tela -->
            <div class="hidden" aria-hidden="true">
                <label>Site <input name="site" tabindex="-1" autocomplete="off" /></label>
            </div>

            <p class="text-xs text-gray-400">
                O e-mail só serve para a gente responder, se precisar. Ele nunca aparece no site.
            </p>

            <p data-status class="text-sm" role="status" aria-live="polite"></p>

            <div class="flex flex-wrap justify-end gap-3 pt-1">
                <button type="button" data-fechar class="btn-secondary">Cancelar</button>
                <button type="submit" class="btn-primary" data-enviar>Enviar aviso</button>
            </div>
        </form>
    `;
}

function agradecimento() {
    return html`
        <div class="text-center space-y-4 py-4">
            <p class="text-5xl" aria-hidden="true">🦅</p>
            <h2 class="text-xl font-display font-bold text-white">Valeu, Fiel!</h2>
            <p class="text-gray-400">Seu aviso chegou. Vamos conferir e corrigir o acervo se for o caso.</p>
            <button type="button" data-fechar class="btn-primary">Fechar</button>
        </div>
    `;
}

/** Cria a janela e liga os botões [data-reportar-erro] (chamado uma vez no main.js). */
export function iniciarCorrecoes() {
    const dialogo = document.createElement('dialog');
    dialogo.id = 'correcao';
    dialogo.setAttribute('aria-labelledby', 'correcao-titulo');
    dialogo.className =
        'w-[calc(100%-2rem)] max-w-lg bg-sccp-gray text-gray-200 border border-gray-700 rounded-xl shadow-2xl p-6 backdrop:bg-black/80 backdrop:backdrop-blur-sm';
    document.body.appendChild(dialogo);

    let contexto = { pagina: '/', jogoId: null };
    let origem = /** @type {HTMLElement | null} */ (null);

    const abrir = (botao) => {
        origem = botao;
        contexto = {
            pagina: location.pathname + location.search,
            jogoId: botao.dataset.jogoId ? Number(botao.dataset.jogoId) : null,
        };
        dialogo.innerHTML = String(formulario());
        const titulo = document.title.replace(/\s·\s.*$/, '');
        /** @type {HTMLElement} */ (dialogo.querySelector('[data-contexto]')).textContent = `Página: ${titulo}`;
        const tipo = /** @type {HTMLSelectElement} */ (dialogo.querySelector('[name="tipo"]'));
        if (botao.dataset.tipo) tipo.value = botao.dataset.tipo;
        dialogo.showModal();
        tipo.focus();
    };

    const fechar = () => {
        dialogo.close();
    };
    dialogo.addEventListener('close', () => origem?.focus());

    document.addEventListener('click', (e) => {
        const botao = /** @type {HTMLElement} */ (e.target).closest?.('[data-reportar-erro]');
        if (botao) abrir(/** @type {HTMLElement} */ (botao));
    });

    dialogo.addEventListener('click', (e) => {
        const alvo = /** @type {HTMLElement} */ (e.target);
        if (alvo.closest('[data-fechar]') || alvo === dialogo) fechar(); // clique fora da caixa fecha
    });

    // Ao corrigir um campo, some a mensagem de erro dele
    const limparErro = (e) => {
        const campo = /** @type {HTMLInputElement} */ (e.target);
        if (!campo.name) return;
        campo.removeAttribute('aria-invalid');
        const alvo = dialogo.querySelector(`[data-erro="${campo.name}"]`);
        if (alvo) alvo.textContent = '';
    };
    dialogo.addEventListener('input', limparErro);
    dialogo.addEventListener('change', limparErro);

    dialogo.addEventListener('submit', async (e) => {
        e.preventDefault();
        const form = /** @type {HTMLFormElement} */ (e.target);
        const status = /** @type {HTMLElement} */ (form.querySelector('[data-status]'));
        const enviar = /** @type {HTMLButtonElement} */ (form.querySelector('[data-enviar]'));
        form.querySelectorAll('[data-erro]').forEach((el) => (el.textContent = ''));
        form.querySelectorAll('[aria-invalid]').forEach((el) => el.removeAttribute('aria-invalid'));

        const dados = Object.fromEntries(new FormData(form));
        // Validação rápida no navegador (o servidor valida de novo)
        const erros = {};
        if (!dados.tipo) erros.tipo = 'Escolha o tipo do erro.';
        if (String(dados.descricao ?? '').trim().length < 10) erros.descricao = 'Conte um pouco mais sobre o erro.';

        const mostrarErros = (lista) => {
            for (const [campo, mensagem] of Object.entries(lista)) {
                const alvo = form.querySelector(`[data-erro="${campo}"]`);
                if (alvo) alvo.textContent = mensagem;
                form.querySelector(`[name="${campo}"]`)?.setAttribute('aria-invalid', 'true');
            }
            /** @type {HTMLElement | null} */ (form.querySelector('[aria-invalid]'))?.focus();
        };

        if (Object.keys(erros).length) return mostrarErros(erros);

        enviar.disabled = true;
        status.className = 'text-sm text-gray-400';
        status.textContent = 'Enviando…';
        try {
            await api.enviarCorrecao({ ...dados, ...contexto });
            dialogo.innerHTML = String(agradecimento());
            /** @type {HTMLElement | null} */ (dialogo.querySelector('[data-fechar]'))?.focus();
        } catch (err) {
            enviar.disabled = false;
            status.className = 'text-sm text-red-400';
            status.textContent = err.message;
            if (err.detalhes) mostrarErros(err.detalhes);
        }
    });
}

/**
 * Faixa discreta no fim das páginas de detalhe: "Viu algo errado? Avise".
 * @param {{ jogoId?: number, texto?: string }} [opcoes]
 */
export function faixaCorrecao({ jogoId, texto = 'Viu algum dado errado nesta página?' } = {}) {
    return html`
        <aside
            class="flex flex-col sm:flex-row items-center justify-center gap-2 sm:gap-4 border-t border-gray-800 pt-6 text-sm text-gray-400"
        >
            <p>${texto} A torcida ajuda a manter o acervo certinho.</p>
            ${botaoCorrecao({ jogoId })}
        </aside>
    `;
}
