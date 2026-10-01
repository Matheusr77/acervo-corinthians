/**
 * Configuração do Tailwind CSS (build via CLI: npm run build:css).
 *
 * As cores vêm de variáveis CSS (src/styles/main.css), para o site ter dois temas:
 *   "Uniforme 1" (escuro, padrão) e "Uniforme 2" (claro, [data-tema="claro"]).
 * No tema claro a escala de cinza se inverte: o que é escuro vira claro e vice-versa.
 *
 * Paleta do site (alvinegra):
 *  - Cinzas NEUTROS (sem tom azulado): a escala `gray` usa a `neutral` do Tailwind.
 *      fundo da página → sccp-black (#000)
 *      cards           → gray-900 / sccp-gray (#171717)
 *      bloco interno   → gray-800 (#262626) · bordas → gray-800/gray-700
 *      texto           → white (principal) · gray-300 (secundário) · gray-400 (discreto)
 *  - Dourado (sccp-gold): só para CONQUISTA e AÇÃO PRINCIPAL
 *      (títulos, selo "Campeão", botão principal, "Sua história", foco do teclado).
 *  - Resultados: verde (vitória) · cinza (empate) · vermelho (derrota).
 *
 * @type {import('tailwindcss').Config}
 */
/** Tons da escala de cinza (mesmos números do Tailwind). */
const TONS = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950];

/** Cor vinda de uma variável CSS com os canais RGB ("255 255 255"), aceitando opacidade (bg-white/10). */
const cor = (variavel) => `rgb(var(${variavel}) / <alpha-value>)`;

export default {
    content: ['./public/index.html', './public/assets/js/**/*.js'],
    theme: {
        extend: {
            colors: {
                gray: Object.fromEntries(TONS.map((n) => [n, cor(`--cinza-${n}`)])),
                white: cor('--branco'),
                black: cor('--preto'),
                sccp: {
                    black: cor('--preto'),
                    white: cor('--branco'),
                    gray: cor('--cinza-900'),
                    gold: cor('--ouro'),
                    goldHover: cor('--ouro-hover'),
                    silver: cor('--cinza-200'),
                    /** Preto e branco FIXOS (não mudam com o tema): texto sobre o dourado etc. */
                    tinta: '#000000',
                    papel: '#FFFFFF',
                },
            },
            fontFamily: {
                sans: ['Inter', 'sans-serif'],
                display: ['Poppins', 'sans-serif'],
            },
            keyframes: {
                'fade-in': {
                    from: { opacity: '0', transform: 'translateY(10px)' },
                    to: { opacity: '1', transform: 'translateY(0)' },
                },
            },
            animation: {
                'fade-in': 'fade-in 0.4s ease-in-out both',
            },
        },
    },
    plugins: [],
};
