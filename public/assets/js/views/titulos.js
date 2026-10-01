/**
 * Sala de troféus: títulos extraídos das observações dos jogos decisivos.
 */

import { api } from '../core/api.js';
import { html } from '../core/html.js';
import { pageHeader } from '../components/layout.js';
import { formatarData, plural } from '../utils/format.js';
import { totalDaCompeticao } from '../utils/titulos.js';

/** Troféus em destaque no topo (nome exato da competição no banco). */
const DESTAQUES = [
    { nome: 'Mundial de Clubes', rotulo: 'Mundiais' },
    { nome: 'Libertadores da América', rotulo: 'Libertadores' },
    { nome: 'Campeonato Brasileiro', rotulo: 'Brasileiros' },
    { nome: 'Copa do Brasil', rotulo: 'Copas do Brasil' },
    { nome: 'Campeonato Paulista', rotulo: 'Paulistas' },
];

function trofeu({ rotulo, total }) {
    return html`
        <div class="bg-gradient-to-b from-gray-900 to-black border border-gray-800 rounded-xl p-5 text-center">
            <p class="text-4xl md:text-5xl font-display font-bold text-sccp-gold">${total}</p>
            <p class="text-xs text-gray-400 uppercase font-bold tracking-wider mt-2">${rotulo}</p>
        </div>
    `;
}

/**
 * Chip com o ano da conquista, levando ao jogo do título.
 * @param {{ edicao: number, jogo: any }} c
 */
function chipConquista(c) {
    const j = c.jogo;
    const resumo = `${formatarData(j.data)} · ${j.mandante.nome} ${j.placar.mandante ?? '–'} x ${j.placar.visitante ?? '–'} ${j.visitante.nome}`;
    return html`
        <a
            href="/jogos/${j.id}"
            title="${resumo}"
            class="inline-flex px-2.5 py-1 rounded border border-sccp-gold/25 bg-sccp-gold/10 text-sccp-gold text-xs font-bold hover:bg-sccp-gold hover:text-sccp-tinta transition"
            >${c.edicao}</a
        >
    `;
}

function competicao(c) {
    return html`
        <li class="py-4 border-b border-gray-800 last:border-0">
            <div class="flex items-baseline justify-between gap-4 mb-3">
                <h4 class="text-white font-bold">${c.nome}</h4>
                <span class="text-sm text-gray-400 flex-shrink-0">${plural(c.total, 'título')}</span>
            </div>
            <div class="flex flex-wrap gap-2">${c.conquistas.map(chipConquista)}</div>
        </li>
    `;
}

function categoria(cat) {
    return html`
        <section class="bg-sccp-gray border border-gray-800 rounded-xl p-6">
            <header class="flex items-baseline justify-between gap-4 border-b border-gray-700/70 pb-3">
                <h3 class="text-lg font-bold text-white">${cat.rotulo}</h3>
                <span class="text-sccp-gold font-display font-bold text-xl">${cat.total}</span>
            </header>
            <ul>
                ${cat.competicoes.map(competicao)}
            </ul>
        </section>
    `;
}

export default {
    async render({ signal }) {
        const titulos = await api.titulos(signal);
        const principais = titulos.categorias.filter((c) => c.principal);
        const outros = titulos.categorias.filter((c) => !c.principal);

        return {
            title: 'Títulos',
            content: html`
                <div class="space-y-10">
                    ${pageHeader(
                        'Sala de Troféus',
                        `${plural(titulos.total, 'conquista')} registradas no acervo. Clique no ano para ver o jogo do título.`,
                    )}

                    <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
                        ${DESTAQUES.map((d) => trofeu({ rotulo: d.rotulo, total: totalDaCompeticao(titulos, d.nome) }))}
                    </div>

                    <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">${principais.map(categoria)}</div>

                    ${
                        outros.length
                            ? html`
                                  <div class="space-y-4">
                                      <h3 class="text-2xl font-display font-bold text-white">Torneios e Taças</h3>
                                      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
                                          ${outros.map(categoria)}
                                      </div>
                                  </div>
                              `
                            : ''
                    }

                    <p class="text-xs text-gray-500">
                        Os títulos são identificados pelas observações dos jogos decisivos no acervo (ex.: "Campeão
                        Paulista pela 14ª vez"). Conquistas sem essa anotação na fonte não aparecem aqui.
                    </p>
                </div>
            `,
        };
    },
};
