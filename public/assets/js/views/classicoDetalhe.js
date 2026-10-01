/**
 * Detalhe de um clássico: placar histórico, décadas, sequências, maiores
 * vitórias e derrotas e todos os jogos.
 */

import { api } from '../core/api.js';
import { html } from '../core/html.js';
import {
    cardGraficoDecadas,
    kpisConfronto,
    montarGraficoDecadas,
    montarListaJogos,
    placarConfronto,
    secaoJogos,
} from '../components/confronto.js';
import { gameRow } from '../components/game.js';
import { breadcrumb, card, linkAcao } from '../components/layout.js';
import { sequenciaTile } from '../components/stats.js';

/**
 * @param {string} titulo
 * @param {any[]} jogos
 * @param {string} cor
 */
function listaPlacares(titulo, jogos, cor) {
    return card(
        { titulo },
        jogos.length
            ? html`<ul>
                  ${jogos.map((j) =>
                      gameRow(j, {
                          destaque: html`<span class="text-sm font-bold ${cor} flex-shrink-0"
                              >${Math.abs(j.golsPro - j.golsContra)} gols</span
                          >`,
                      }),
                  )}
              </ul>`
            : html`<p class="text-gray-400 text-sm">Nenhuma.</p>`,
    );
}

export default {
    async render({ params, signal }) {
        const c = await api.classico(params.slug, signal);

        return {
            title: `${c.nome}: Corinthians x ${c.rival.nome}`,
            content: html`
                <div class="space-y-8">
                    ${breadcrumb([{ label: 'Home', href: '/' }, { label: 'Clássicos', href: '/classicos' }, { label: c.nome }])}
                    ${placarConfronto(c.rival, c.resumo, { titulo: c.nome, clube: c.clube })} ${kpisConfronto(c.resumo)}

                    <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        ${sequenciaTile('Maior invencibilidade', c.sequencias.invencibilidade, 'text-white')}
                        ${sequenciaTile('Mais vitórias seguidas', c.sequencias.vitorias, 'text-green-400')}
                        ${sequenciaTile('Maior jejum de vitórias', c.sequencias.semVencer, 'text-red-400')}
                    </div>

                    ${cardGraficoDecadas(c.jogos)}

                    <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                        ${listaPlacares('Maiores Vitórias', c.maioresVitorias, 'text-green-400')}
                        ${listaPlacares('Maiores Derrotas', c.maioresDerrotas, 'text-red-400')}
                    </div>

                    ${secaoJogos(c.jogos, `/jogos?adversario=${encodeURIComponent(c.rival.nome)}`)}

                    <div class="text-center">
                        ${linkAcao(`/adversarios/${c.rival.id}`, `Ver ficha do ${c.rival.nome}`)}
                    </div>
                </div>
            `,
        };
    },

    async mount(root, ctx) {
        const { jogos } = await api.classico(ctx.params.slug); // vem do cache
        montarListaJogos(root, jogos);
        return montarGraficoDecadas(root, jogos);
    },
};
