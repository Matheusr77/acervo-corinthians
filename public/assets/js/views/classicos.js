/**
 * Clássicos: Derby, Majestoso e Clássico Alvinegro lado a lado.
 */

import { api } from '../core/api.js';
import { html } from '../core/html.js';
import { CORES } from '../components/charts.js';
import { miniEscudo, resultBadge } from '../components/game.js';
import { pageHeader } from '../components/layout.js';
import { corAproveitamento } from '../components/stats.js';
import { anoDe, formatarData, formatarNumero, formatarPorcentagem } from '../utils/format.js';

/**
 * Barra horizontal de proporção V/E/D (2px de respiro entre os segmentos).
 * @param {any} r - resumo
 */
function barraProporcao(r) {
    const partes = [
        { valor: r.vitorias, cor: CORES.vitoria, rotulo: 'vitórias' },
        { valor: r.empates, cor: CORES.empate, rotulo: 'empates' },
        { valor: r.derrotas, cor: CORES.derrota, rotulo: 'derrotas' },
    ].filter((p) => p.valor > 0);
    const total = partes.reduce((s, p) => s + p.valor, 0) || 1;
    return html`
        <div
            class="flex h-2.5 gap-0.5 rounded-full overflow-hidden"
            role="img"
            aria-label="${partes.map((p) => `${p.valor} ${p.rotulo}`).join(', ')}"
        >
            ${partes.map((p) => html`<span style="width: ${((p.valor / total) * 100).toFixed(2)}%; background: ${p.cor}"></span>`)}
        </div>
    `;
}

function cardClassico(c) {
    const r = c.resumo;
    const u = c.ultimoJogo;
    return html`
        <a
            href="/classicos/${c.slug}"
            class="group block bg-gradient-to-br from-gray-900 to-black border border-gray-800 rounded-xl p-6 md:p-8 hover:border-gray-600 transition-all duration-300"
        >
            <div class="flex items-center justify-between gap-4">
                <p class="text-gray-400 text-xs font-bold uppercase tracking-[0.2em]">${c.nome}</p>
                <div class="flex items-center gap-1.5">
                    ${miniEscudo(c.clube)}<span class="text-gray-500 text-xs">x</span>${miniEscudo(c.rival)}
                </div>
            </div>
            <h3
                class="text-2xl md:text-3xl font-display font-bold text-white mt-2 group-hover:text-gray-300 transition"
            >
                Corinthians x ${c.rival.nome}
            </h3>
            <p class="text-gray-400 text-sm mt-1">${c.descricao}</p>

            <div class="grid grid-cols-3 text-center mt-8">
                <div>
                    <p class="text-3xl md:text-4xl font-display font-bold text-white">${r.vitorias}</p>
                    <p class="text-xs text-gray-400 uppercase mt-1">Vitórias</p>
                </div>
                <div>
                    <p class="text-3xl md:text-4xl font-display font-bold text-gray-400">${r.empates}</p>
                    <p class="text-xs text-gray-400 uppercase mt-1">Empates</p>
                </div>
                <div>
                    <p class="text-3xl md:text-4xl font-display font-bold text-white">${r.derrotas}</p>
                    <p class="text-xs text-gray-400 uppercase mt-1">Derrotas</p>
                </div>
            </div>

            <div class="mt-5">${barraProporcao(r)}</div>

            <dl class="grid grid-cols-3 gap-2 text-sm mt-6 pt-5 border-t border-gray-800">
                <div>
                    <dt class="text-xs text-gray-400">Jogos</dt>
                    <dd class="text-white font-bold">${formatarNumero(r.jogos)}</dd>
                </div>
                <div>
                    <dt class="text-xs text-gray-400">Aproveitamento</dt>
                    <dd class="font-bold ${corAproveitamento(r.aproveitamento)}">
                        ${formatarPorcentagem(r.aproveitamento)}
                    </dd>
                </div>
                <div>
                    <dt class="text-xs text-gray-400">Desde</dt>
                    <dd class="text-white font-bold">${anoDe(r.primeiroJogo)}</dd>
                </div>
            </dl>

            ${
                u
                    ? html`
                          <div class="flex items-center justify-between gap-3 mt-5 text-sm">
                              <span class="text-gray-400"
                                  >Último: ${formatarData(u.data)} · ${u.golsPro} x ${u.golsContra}</span
                              >
                              ${resultBadge(u.resultado)}
                          </div>
                      `
                    : ''
            }
        </a>
    `;
}

export default {
    async render({ signal }) {
        const classicos = await api.classicos(signal);
        return {
            title: 'Clássicos',
            content: html`
                <div class="space-y-8">
                    ${pageHeader('Clássicos', 'O retrospecto do Corinthians contra os grandes rivais paulistas.')}
                    <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">${classicos.map(cardClassico)}</div>
                </div>
            `,
        };
    },
};
