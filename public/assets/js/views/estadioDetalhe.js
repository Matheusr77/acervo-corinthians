/**
 * Retrospecto do Corinthians em um estádio.
 */

import { api } from '../core/api.js';
import { faixaCorrecao } from '../components/correcao.js';
import { html } from '../core/html.js';
import {
    cardGraficoDecadas,
    kpisConfronto,
    montarGraficoDecadas,
    montarListaJogos,
    secaoJogos,
} from '../components/confronto.js';
import { gameRow } from '../components/game.js';
import { breadcrumb, card } from '../components/layout.js';
import { barrasDesempenho, rankList, sequenciaTile } from '../components/stats.js';
import { formatarData, plural } from '../utils/format.js';

function listaPlacares(titulo, jogos, cor) {
    return card(
        { titulo },
        jogos.length
            ? html`<ul>
                  ${jogos.map((j) =>
                      gameRow(j, {
                          destaque: html`<span class="text-sm font-bold ${cor} flex-shrink-0"
                              >${plural(Math.abs(j.golsPro - j.golsContra), 'gol')}</span
                          >`,
                      }),
                  )}
              </ul>`
            : html`<p class="text-gray-400 text-sm">Nenhuma.</p>`,
    );
}

export default {
    async render({ params, signal }) {
        const d = await api.estadio(params.id, signal);
        const e = d.estadio;
        const local = [e.cidade, e.estado, e.pais].filter(Boolean).join(' · ');
        const variasDecadas = new Set(d.jogos.map((j) => j.data.slice(0, 3))).size > 1;

        return {
            title: `Corinthians no ${e.nome}`,
            content: html`
                <div class="space-y-8">
                    ${breadcrumb([{ label: 'Home', href: '/' }, { label: 'Estádios', href: '/estadios' }, { label: e.nome }])}

                    <header
                        class="bg-gradient-to-br from-gray-900 to-black border border-gray-800 rounded-xl p-6 md:p-10"
                    >
                        <p class="text-gray-400 text-xs font-bold uppercase tracking-[0.2em]">Estádio</p>
                        <h2 class="text-4xl md:text-5xl font-display font-bold text-white mt-2">${e.nome}</h2>
                        <p class="text-gray-400 mt-2">${local}</p>
                        <p class="text-gray-400 text-sm mt-4">
                            ${plural(d.resumo.jogos, 'jogo')} do Corinthians entre
                            ${formatarData(d.resumo.primeiroJogo)} e ${formatarData(d.resumo.ultimoJogo)}
                        </p>
                    </header>

                    ${kpisConfronto(d.resumo)}

                    <div class="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
                        ${card({ titulo: 'Resultados' }, barrasDesempenho(d.resumo))}
                        ${card(
                            { titulo: 'Placares mais comuns', subtitulo: 'Corinthians x adversário' },
                            html`<ol class="space-y-2">
                                ${d.placaresMaisComuns.map(
                                    (p, i) => html`
                                        <li class="flex items-center justify-between">
                                            <span class="text-white font-display font-bold text-xl"
                                                >${i + 1}º · ${p.golsPro} x ${p.golsContra}</span
                                            >
                                            <span class="text-gray-400 text-sm"
                                                >${plural(p.vezes, 'vez', 'vezes')}</span
                                            >
                                        </li>
                                    `,
                                )}
                            </ol>`,
                        )}
                        ${card(
                            { titulo: 'Adversários mais enfrentados aqui' },
                            rankList(
                                d.maisEnfrentados.map((a) => ({
                                    href: `/adversarios/${a.id}`,
                                    nome: a.nome,
                                    valor: a.jogos,
                                })),
                            ),
                        )}
                    </div>

                    <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        ${sequenciaTile('Maior invencibilidade aqui', d.sequencias.invencibilidade, 'text-white')}
                        ${sequenciaTile('Mais vitórias seguidas', d.sequencias.vitorias, 'text-green-400')}
                        ${sequenciaTile('Maior jejum de vitórias', d.sequencias.semVencer, 'text-red-400')}
                    </div>

                    ${variasDecadas ? cardGraficoDecadas(d.jogos) : ''}

                    <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                        ${listaPlacares('Maiores vitórias', d.maioresVitorias, 'text-green-400')}
                        ${listaPlacares('Maiores derrotas', d.maioresDerrotas, 'text-red-400')}
                    </div>

                    ${secaoJogos(d.jogos, '/jogos')} ${faixaCorrecao()}
                </div>
            `,
        };
    },

    async mount(root, ctx) {
        const { jogos } = await api.estadio(ctx.params.id); // cache
        montarListaJogos(root, jogos);
        return montarGraficoDecadas(root, jogos);
    },
};
