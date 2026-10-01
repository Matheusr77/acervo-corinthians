/**
 * Retrospecto completo contra um adversário.
 */

import { api } from '../core/api.js';
import { faixaCorrecao } from '../components/correcao.js';
import { html } from '../core/html.js';
import {
    cardGraficoDecadas,
    kpisConfronto,
    montarGraficoDecadas,
    montarListaJogos,
    placarConfronto,
    secaoJogos,
} from '../components/confronto.js';
import { breadcrumb, card } from '../components/layout.js';
import { barrasDesempenho } from '../components/stats.js';
import { formatarData } from '../utils/format.js';

/**
 * @param {string} rotulo
 * @param {any} jogo
 * @param {string} cor
 */
function destaque(rotulo, jogo, cor) {
    return html`
        <div class="bg-gray-800/50 rounded-lg p-4 border border-gray-700">
            <p class="text-xs text-gray-400 uppercase font-bold mb-1">${rotulo}</p>
            ${
                jogo
                    ? html`
                          <a href="/jogos/${jogo.id}" class="hover:text-gray-300 transition">
                              <p class="text-2xl font-display font-bold ${cor}">${jogo.golsPro} x ${jogo.golsContra}</p>
                              <p class="text-xs text-gray-400 mt-1">
                                  ${formatarData(jogo.data)} · ${jogo.campeonato?.nome ?? ''}
                              </p>
                          </a>
                      `
                    : html`<p class="text-gray-400 text-sm">Nenhuma</p>`
            }
        </div>
    `;
}

export default {
    async render({ params, signal }) {
        const { clube, adversario, resumo, maiorVitoria, maiorDerrota, jogos } = await api.adversario(
            params.id,
            signal,
        );
        const variasDecadas = new Set(jogos.map((j) => j.data.slice(0, 3))).size > 1;

        return {
            title: `Corinthians x ${adversario.nome}`,
            content: html`
                <div class="space-y-8">
                    ${breadcrumb([
                        { label: 'Home', href: '/' },
                        { label: 'Confrontos', href: '/adversarios' },
                        { label: adversario.nome },
                    ])}
                    ${placarConfronto(adversario, resumo, { clube })} ${kpisConfronto(resumo)}

                    <div class="grid grid-cols-1 md:grid-cols-2 gap-8">
                        ${card({ titulo: 'Distribuição de Resultados' }, barrasDesempenho(resumo))}
                        ${card(
                            { titulo: 'Placares Marcantes' },
                            html`<div class="grid grid-cols-2 gap-3">
                                ${destaque('Maior vitória', maiorVitoria, 'text-green-400')}
                                ${destaque('Maior derrota', maiorDerrota, 'text-red-400')}
                            </div>`,
                        )}
                    </div>

                    ${variasDecadas ? cardGraficoDecadas(jogos) : ''}
                    ${secaoJogos(jogos, `/jogos?adversario=${encodeURIComponent(adversario.nome)}`)} ${faixaCorrecao()}
                </div>
            `,
        };
    },

    async mount(root, ctx) {
        const { jogos } = await api.adversario(ctx.params.id); // vem do cache
        montarListaJogos(root, jogos);
        return montarGraficoDecadas(root, jogos);
    },
};
