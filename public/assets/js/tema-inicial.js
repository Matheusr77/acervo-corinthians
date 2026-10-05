/*
 * Aplica o tema antes de o CSS desenhar a página, para não piscar.
 * O padrão é o "Uniforme 2" (claro); o escuro ("Uniforme 1") só vale para
 * quem escolheu ele no botão. É um script comum (não módulo) e pequeno de
 * propósito: roda no <head>, antes de tudo.
 */
(function () {
    let escuro = false;
    try {
        escuro = localStorage.getItem('acervo:tema') === 'escuro';
    } catch {
        /* sem armazenamento: fica no tema padrão (claro) */
    }
    if (!escuro) {
        document.documentElement.setAttribute('data-tema', 'claro');
        document.querySelector('meta[name="theme-color"]')?.setAttribute('content', '#ffffff');
    }
})();
