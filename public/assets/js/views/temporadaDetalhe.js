/**
 * Detalhe de uma temporada: desempenho, campeonatos disputados,
 * destaques e todos os jogos do ano.
 */

import { api } from '../core/api.js';
import { faixaCorrecao } from '../components/correcao.js';
import { html } from '../core/html.js';
import { gameCard } from '../components/game.js';
import { breadcrumb, card, linkAcao } from '../components/layout.js';
import { barrasDesempenho, corAproveitamento, resumoKpis, sequenciaTile } from '../components/stats.js';
import { titulosDoAno } from '../utils/titulos.js';
import { formatarData, formatarPorcentagem, formatarSaldo } from '../utils/format.js';

function tabelaCampeonatos(ano, campeonatos) {
    return html`
        <div class="overflow-x-auto -mx-6 px-6">
            <table class="w-full text-sm min-w-[520px]">
                <thead>
                    <tr class="text-xs text-gray-400 uppercase text-right">
                        <th scope="col" class="text-left font-bold pb-2">Competição</th>
                        <th scope="col" class="font-bold pb-2" title="Jogos">J</th>
                        <th scope="col" class="font-bold pb-2" title="Vitórias">V</th>
                        <th scope="col" class="font-bold pb-2" title="Empates">E</th>
                        <th scope="col" class="font-bold pb-2" title="Derrotas">D</th>
                        <th scope="col" class="font-bold pb-2" title="Saldo de gols">SG</th>
                        <th scope="col" class="font-bold pb-2" title="Aproveitamento">%</th>
                    </tr>
                </thead>
                <tbody>
                    ${campeonatos.map(
                        (c) => html`
                            <tr class="border-t border-gray-800 text-right text-gray-300">
                                <td class="text-left py-2.5">
                                    <a
                                        href="/jogos?ano=${ano}&amp;campeonato=${encodeURIComponent(c.nome)}"
                                        class="text-white hover:text-gray-300 transition"
                                        >${c.nome}</a
                                    >
                                </td>
                                <td>${c.jogos}</td>
                                <td class="text-green-400">${c.vitorias}</td>
                                <td>${c.empates}</td>
                                <td class="text-red-400">${c.derrotas}</td>
                                <td>${formatarSaldo(c.saldo)}</td>
                                <td class="font-bold ${corAproveitamento(c.aproveitamento)}">
                                    ${formatarPorcentagem(c.aproveitamento)}
                                </td>
                            </tr>
                        `,
                    )}
                </tbody>
            </table>
        </div>
    `;
}

function navegacaoAnos(ano, anos) {
    const idx = anos.indexOf(ano);
    const anterior = idx >= 0 ? anos[idx + 1] : undefined; // lista vem do mais recente para o mais antigo
    const seguinte = idx > 0 ? anos[idx - 1] : undefined;
    return html`
        <div class="flex gap-2">
            ${anterior ? html`<a href="/temporadas/${anterior}" class="btn-secondary">← ${anterior}</a>` : ''}
            ${seguinte ? html`<a href="/temporadas/${seguinte}" class="btn-secondary">${seguinte} →</a>` : ''}
        </div>
    `;
}

export default {
    async render({ params, signal }) {
        const [dados, temporadas, todosTitulos] = await Promise.all([
            api.temporada(params.ano, signal),
            api.temporadas(signal),
            api.titulos(signal).catch((err) => {
                if (err.name === 'AbortError') throw err;
                return null;
            }),
        ]);
        const { ano, resumo, campeonatos, sequencias, maiorVitoria, jogos } = dados;
        const titulos = titulosDoAno(todosTitulos, ano);
        const jogosCronologicos = [...jogos].reverse();

        return {
            title: `Temporada ${ano}`,
            content: html`
                <div class="space-y-8">
                    ${breadcrumb([
                        { label: 'Home', href: '/' },
                        { label: 'Temporadas', href: '/temporadas' },
                        { label: String(ano) },
                    ])}

                    <header class="flex flex-col md:flex-row md:items-end justify-between gap-6">
                        <div class="space-y-3">
                            <h2 class="text-5xl md:text-6xl font-display font-bold text-white">${ano}</h2>
                            ${
                                titulos.length
                                    ? html`<div class="flex flex-wrap gap-2">
                                          ${titulos.map(
                                              (t) =>
                                                  html`<span
                                                      class="px-3 py-1 bg-sccp-gold/20 text-sccp-gold text-xs font-bold uppercase rounded border border-sccp-gold/20"
                                                      >🏆 ${t}</span
                                                  >`,
                                          )}
                                      </div>`
                                    : ''
                            }
                        </div>
                        ${navegacaoAnos(
                            ano,
                            temporadas.map((t) => t.ano),
                        )}
                    </header>

                    <div class="grid grid-cols-1 md:grid-cols-2 gap-8">
                        ${card({ titulo: 'Desempenho na Temporada' }, html`<div class="space-y-6">${resumoKpis(resumo)} ${barrasDesempenho(resumo)}</div>`)}
                        ${card(
                            { titulo: 'Destaques' },
                            html`
                                <div class="space-y-4">
                                    <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                        ${sequenciaTile('Maior invencibilidade', sequencias.invencibilidade, 'text-white')}
                                        ${sequenciaTile('Vitórias seguidas', sequencias.vitorias, 'text-green-400')}
                                    </div>
                                    ${
                                        maiorVitoria
                                            ? html`
                                                  <a
                                                      href="/jogos/${maiorVitoria.id}"
                                                      class="block bg-gray-800/50 rounded-lg p-4 border border-gray-700 hover:border-gray-600 transition"
                                                  >
                                                      <p class="text-xs text-gray-400 uppercase font-bold mb-1">
                                                          Maior vitória
                                                      </p>
                                                      <p class="text-white font-bold">
                                                          Corinthians ${maiorVitoria.golsPro} x
                                                          ${maiorVitoria.golsContra} ${maiorVitoria.adversario.nome}
                                                      </p>
                                                      <p class="text-xs text-gray-400 mt-1">
                                                          ${formatarData(maiorVitoria.data)} ·
                                                          ${maiorVitoria.campeonato?.nome ?? ''}
                                                      </p>
                                                  </a>
                                              `
                                            : ''
                                    }
                                </div>
                            `,
                        )}
                    </div>

                    ${card({ titulo: 'Competições Disputadas' }, tabelaCampeonatos(ano, campeonatos))}

                    <section class="space-y-4">
                        <div class="flex items-end justify-between border-b border-gray-800 pb-3 gap-4">
                            <h3 class="text-2xl font-display font-bold text-white">Jogos de ${ano}</h3>
                            ${linkAcao(`/jogos?ano=${ano}`, 'Filtrar jogos')}
                        </div>
                        <div class="space-y-3">${jogosCronologicos.map(gameCard)}</div>
                    </section>
                    ${faixaCorrecao()}
                </div>
            `,
        };
    },
};
