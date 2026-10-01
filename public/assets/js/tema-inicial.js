/*
 * Aplica o tema salvo ("Uniforme 1" escuro / "Uniforme 2" claro) antes de o
 * CSS desenhar a página, para não piscar. É um script comum (não módulo) e
 * pequeno de propósito: roda no <head>, antes de tudo.
 */
(function () {
    try {
        if (localStorage.getItem('acervo:tema') === 'claro') {
            document.documentElement.setAttribute('data-tema', 'claro');
        }
    } catch {
        /* sem armazenamento: fica no tema padrão */
    }
})();
