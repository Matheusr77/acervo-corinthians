/**
 * Fregueses & Tabus: quem mais apanha do Corinthians, quem mais complica,
 * e as sequências em andamento contra os rivais.
 */

import { api } from '../core/api.js';
import { html } from '../core/html.js';
import { botaoCompartilhar, ligarCompartilhar } from '../components/compartilhar.js';
import { miniEscudo } from '../components/game.js';
import { card, pageHeader } from '../components/layout.js';
import { rankList } from '../components/stats.js';
import { formatarData, formatarPorcentagem, plural } from '../utils/format.js';

/** Card de sequência em andamento. */
function sequencia(rotulo, seq, cor, sufixo = '') {
    return html`
        <div class="bg-gray-800/50 rounded-lg p-4 border border-gray-700">
            <p class="text-xs text-gray-400 uppercase font-bold mb-1">${rotulo}</p>
            <p class="text-3xl font-bold font-display ${cor}">${plural(seq.tamanho, 'jogo')}</p>
            <p class="text-xs text-gray-400 mt-1">
                ${seq.inicio ? `desde ${formatarData(seq.inicio)}${sufixo}` : 'sequência encerrada'}
            </p>
        </div>
    `;
}

function ranking(lista) {
    return rankList(
        lista.map((a) => ({
            href: `/adversarios/${a.id}`,
            nome: a.nome,
            time: a,
            detalhe: `${a.vitorias}V ${a.empates}E ${a.derrotas}D em ${plural(a.jogos, 'jogo')}`,
            valor: formatarPorcentagem(a.aproveitamento),
        })),
    );
}

/** Lista de tabus ("18 jogos sem perder para o Coritiba"). */
function listaTabus(tabus, frase, cor) {
    if (!tabus.length) return html`<p class="text-gray-400 text-sm">Nenhum no momento.</p>`;
    return html`
        <ul class="space-y-1">
            ${tabus.map(
                (t) => html`
                    <li>
                        <a
                            href="/adversarios/${t.adversario.id}"
                            class="flex items-center justify-between gap-3 py-2.5 border-b border-gray-800 last:border-0 hover:bg-white/[0.03] -mx-2 px-2 rounded transition"
                        >
                            <span class="flex items-center gap-3 min-w-0">
                                ${miniEscudo(t.adversario)}
                                <span class="min-w-0">
                                    <span class="block text-white truncate">${t.adversario.nome}</span>
                                    <span class="block text-xs text-gray-400"
                                        >${frase} desde ${formatarData(t.desde)}</span
                                    >
                                </span>
                            </span>
                            <span class="font-display font-bold text-xl ${cor} flex-shrink-0">${t.tamanho}</span>
                        </a>
                    </li>
                `,
            )}
        </ul>
    `;
}

export default {
    async render({ signal }) {
        const d = await api.fregueses(signal);
        const s = d.sequencias;

        return {
            title: 'Fregueses & Tabus',
            content: html`
                <div class="space-y-10">
                    <div class="flex flex-col md:flex-row md:items-end justify-between gap-4">
                        ${pageHeader(
                            'Fregueses & Tabus',
                            `Rankings com adversários de pelo menos ${d.minimoJogos} jogos. Sequências contadas até o último jogo do acervo (${formatarData(d.ultimoJogo)}).`,
                        )}
                        ${botaoCompartilhar('compartilhar-fregueses')}
                    </div>

                    <section class="space-y-4">
                        <h3 class="text-2xl font-display font-bold text-white">Sequências em andamento</h3>
                        <div class="grid grid-cols-2 lg:grid-cols-4 gap-4">
                            ${sequencia('Sem perder', s.invicto, 'text-white')}
                            ${sequencia('Vitórias seguidas', s.vitorias, 'text-green-400')}
                            ${sequencia('Sem perder em casa', s.invictoEmCasa, 'text-white')}
                            ${sequencia('Sem vencer', s.semVencer, 'text-red-400')}
                        </div>
                    </section>

                    <div class="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
                        ${card({ titulo: '🍗 Maiores fregueses', subtitulo: 'Melhor aproveitamento do Corinthians no confronto' }, ranking(d.fregueses))}
                        ${card({ titulo: '😤 Maiores carrascos', subtitulo: 'Pior aproveitamento do Corinthians no confronto' }, ranking(d.carrascos))}
                    </div>

                    <div class="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
                        ${card(
                            { titulo: 'Tabus a favor', subtitulo: 'Jogos seguidos sem perder para o rival' },
                            listaTabus(d.tabusAFavor, 'sem perder', 'text-green-400'),
                        )}
                        ${card(
                            { titulo: 'Tabus contra', subtitulo: 'Jogos seguidos sem vencer o rival' },
                            listaTabus(d.tabusContra, 'sem vencer', 'text-red-400'),
                        )}
                    </div>
                </div>
            `,
        };
    },

    mount(root) {
        ligarCompartilhar(root, 'compartilhar-fregueses', () => ({
            title: 'Fregueses & Tabus do Corinthians',
            text: 'Quem é o maior freguês do Timão? 🍗',
            url: `${location.origin}/fregueses`,
        }));
    },
};
