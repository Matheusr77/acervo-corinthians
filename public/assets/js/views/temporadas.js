/**
 * Linha do tempo: todas as temporadas do acervo agrupadas por década.
 */

import { api } from '../core/api.js';
import { html } from '../core/html.js';
import { pageHeader } from '../components/layout.js';
import { corAproveitamento } from '../components/stats.js';
import { titulosDoAno } from '../utils/titulos.js';
import { formatarPorcentagem, plural } from '../utils/format.js';

/** @param {{ ano: number }[]} temporadas */
function agruparPorDecada(temporadas) {
    const grupos = new Map();
    for (const t of temporadas) {
        const decada = Math.floor(t.ano / 10) * 10;
        if (!grupos.has(decada)) grupos.set(decada, []);
        grupos.get(decada).push(t);
    }
    return [...grupos.entries()];
}

function cardTemporada(t, todosTitulos) {
    const titulos = titulosDoAno(todosTitulos, t.ano, { somentePrincipais: true });
    return html`
        <a
            href="/temporadas/${t.ano}"
            class="block bg-gray-900 border border-gray-800 rounded-xl p-6 text-center hover:border-gray-500 hover:-translate-y-1 transition-all duration-300 group shadow-sm hover:shadow-lg"
        >
            <h3 class="text-2xl font-bold text-white group-hover:text-gray-300 transition">${t.ano}</h3>
            <p class="text-xs text-gray-400 mt-2">${plural(t.jogos, 'Jogo')}</p>
            <p class="text-xs mt-1 ${corAproveitamento(t.aproveitamento)}">${formatarPorcentagem(t.aproveitamento)}</p>
            ${
                titulos.length
                    ? html`<span
                          class="inline-block mt-3 px-2 py-1 bg-sccp-gold/20 text-sccp-gold text-[10px] font-bold uppercase rounded border border-sccp-gold/20"
                          title="${titulos.join(', ')}"
                          >Campeão</span
                      >`
                    : ''
            }
        </a>
    `;
}

export default {
    async render({ signal }) {
        const [temporadas, titulos] = await Promise.all([
            api.temporadas(signal),
            api.titulos(signal).catch((err) => {
                if (err.name === 'AbortError') throw err;
                return null; // sem títulos, a página continua funcionando (só sem o selo)
            }),
        ]);

        return {
            title: 'Temporadas',
            content: html`
                <div class="space-y-10">
                    ${pageHeader(
                        'Navegar por Temporadas',
                        `${plural(temporadas.length, 'temporada')} no acervo. O selo "Campeão" indica títulos mundiais, continentais, nacionais, interestaduais ou estaduais.`,
                    )}
                    ${agruparPorDecada(temporadas).map(
                        ([decada, itens]) => html`
                            <section aria-labelledby="decada-${decada}">
                                <h3
                                    id="decada-${decada}"
                                    class="text-sm font-bold uppercase tracking-[0.2em] text-gray-400 mb-4 border-b border-gray-800 pb-2"
                                >
                                    Anos ${decada}
                                </h3>
                                <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                                    ${itens.map((t) => cardTemporada(t, titulos))}
                                </div>
                            </section>
                        `,
                    )}
                </div>
            `,
        };
    },
};
