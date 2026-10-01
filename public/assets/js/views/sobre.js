/**
 * Página Sobre: descrição do projeto, fonte dos dados e stack.
 */

import { api } from '../core/api.js';
import { html } from '../core/html.js';
import { anoDe, formatarNumero } from '../utils/format.js';

const STACK = [
    { cor: 'bg-orange-500', nome: 'HTML5 Semântico' },
    { cor: 'bg-teal-400', nome: 'Tailwind CSS' },
    { cor: 'bg-yellow-400', nome: 'JavaScript (SPA, ES Modules)' },
    { cor: 'bg-green-500', nome: 'Node.js + Express' },
    { cor: 'bg-blue-500', nome: 'MySQL' },
    { cor: 'bg-purple-400', nome: 'API REST' },
];

/**
 * Créditos das imagens de escudo (autor e licença exigidos pelo Wikimedia Commons).
 * @param {{ time: string, autor: string | null, licenca: string | null, fonte: string }[]} creditos
 */
function creditosEscudos(creditos) {
    return html`
        <details class="bg-gray-900 border border-gray-800 p-6 rounded-xl text-left">
            <summary class="cursor-pointer font-bold text-white">Créditos dos escudos (${creditos.length})</summary>
            <p class="text-gray-400 text-sm mt-3">Imagens do Wikimedia Commons, via Wikidata.</p>
            <ul class="mt-4 space-y-2 text-sm max-h-80 overflow-auto">
                ${creditos.map(
                    (c) => html`
                        <li class="text-gray-400">
                            <span class="text-white">${c.time}</span>: ${c.autor ?? 'autor não informado'} ·
                            ${c.licenca ?? 'licença não informada'} ·
                            <a
                                href="${c.fonte}"
                                target="_blank"
                                rel="noopener noreferrer"
                                class="text-white underline underline-offset-4 decoration-gray-500 hover:decoration-white"
                                >fonte</a
                            >
                        </li>
                    `,
                )}
            </ul>
        </details>
    `;
}

export default {
    async render({ signal }) {
        const opcional = (promessa, padrao) =>
            promessa.catch((err) => {
                if (err.name === 'AbortError') throw err;
                return padrao;
            });
        const [resumo, creditos] = await Promise.all([
            opcional(api.resumo(signal), null),
            opcional(api.creditosEscudos(signal), []),
        ]);

        return {
            title: 'Sobre',
            content: html`
                <div class="max-w-2xl mx-auto text-center space-y-6">
                    <img
                        src="/assets/img/logo-256.png"
                        data-escudo
                        alt=""
                        width="128"
                        height="128"
                        class="w-32 h-32 mx-auto"
                    />
                    <img
                        src="/assets/img/logo-256-claro.png"
                        data-escudo-claro
                        alt=""
                        width="128"
                        height="128"
                        class="w-32 h-32 mx-auto"
                    />

                    <h2 class="text-4xl font-display font-bold text-white">Sobre o Projeto</h2>

                    <p class="text-gray-400 leading-relaxed text-lg">
                        Este é um portal de estatísticas dedicado à história do Sport Club Corinthians Paulista.
                        ${
                            resumo
                                ? `O acervo reúne ${formatarNumero(resumo.jogos)} partidas, de ${anoDe(resumo.primeiroJogo)} a ${anoDe(resumo.ultimoJogo)}, em uma interface moderna e acessível para a Fiel Torcida.`
                                : 'O objetivo é reunir dados de todas as partidas oficiais desde 1910 em uma interface moderna e acessível para a Fiel Torcida.'
                        }
                    </p>

                    <div class="bg-gray-900 border border-gray-800 p-8 rounded-xl text-left mt-8 space-y-6">
                        <div>
                            <h3 class="font-bold text-white mb-2 text-xl">Fonte dos Dados</h3>
                            <p class="text-gray-400 leading-relaxed">
                                Os jogos foram coletados por <em>web scraping</em> do site
                                <a
                                    href="https://www.todopoderosotimao.com.br"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    class="text-white underline underline-offset-4 decoration-gray-500 hover:decoration-white"
                                    >Todo Poderoso Timão</a
                                >
                                e organizados em um banco de dados relacional (times, estádios, campeonatos e jogos).
                            </p>
                        </div>

                        <div>
                            <h3 class="font-bold text-white mb-4 text-xl">Stack Tecnológica</h3>
                            <ul class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                ${STACK.map(
                                    (s) => html`
                                        <li class="flex items-center gap-2 text-gray-400">
                                            <span class="w-2 h-2 ${s.cor} rounded-full" aria-hidden="true"></span>
                                            ${s.nome}
                                        </li>
                                    `,
                                )}
                            </ul>
                        </div>
                    </div>

                    ${creditos.length ? creditosEscudos(creditos) : ''}

                    <p class="text-xs text-gray-500">
                        Os escudos são marcas dos respectivos clubes e aparecem apenas para identificar os times.
                        Projeto acadêmico e sem fins lucrativos. Não possui vínculo oficial com o Sport Club Corinthians
                        Paulista.
                    </p>
                </div>
            `,
        };
    },
};
