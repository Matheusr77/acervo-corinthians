/**
 * Tema do site: "Uniforme 2" (claro, padrão) e "Uniforme 1" (escuro).
 * A escolha fica no navegador (localStorage) e é aplicada cedo pelo tema-inicial.js.
 */

const CHAVE = 'acervo:tema';
const COR_BARRA = { escuro: '#000000', claro: '#ffffff' };

/** @returns {'escuro' | 'claro'} */
export function temaAtual() {
    return document.documentElement.getAttribute('data-tema') === 'claro' ? 'claro' : 'escuro';
}

/** Atualiza ícones, rótulos e a cor da barra do navegador no celular. */
function sincronizar() {
    const tema = temaAtual();
    document.querySelectorAll('[data-icone-tema]').forEach((icone) => {
        // Mostra o ícone do tema para o qual o botão vai mudar
        icone.classList.toggle('hidden', icone.getAttribute('data-icone-tema') === tema);
    });
    document.querySelectorAll('[data-alternar-tema]').forEach((botao) => {
        botao.setAttribute(
            'aria-label',
            tema === 'claro' ? 'Usar tema escuro (Uniforme 1)' : 'Usar tema claro (Uniforme 2)',
        );
        botao.setAttribute('aria-pressed', String(tema === 'claro'));
    });
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', COR_BARRA[tema]);
}

/**
 * Liga os botões de alternar tema.
 * @param {() => void} aoMudar - chamado depois da troca (ex.: redesenhar gráficos)
 */
export function iniciarTema(aoMudar) {
    sincronizar();
    document.querySelectorAll('[data-alternar-tema]').forEach((botao) =>
        botao.addEventListener('click', () => {
            const novo = temaAtual() === 'claro' ? 'escuro' : 'claro';
            if (novo === 'claro') document.documentElement.setAttribute('data-tema', 'claro');
            else document.documentElement.removeAttribute('data-tema');
            try {
                localStorage.setItem(CHAVE, novo);
            } catch {
                /* sem armazenamento: vale só nesta visita */
            }
            sincronizar();
            aoMudar?.();
        }),
    );
}
