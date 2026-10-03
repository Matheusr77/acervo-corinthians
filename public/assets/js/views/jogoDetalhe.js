/**
 * Detalhes de uma partida: placar, informações, retrospecto do confronto
 * e navegação para o jogo anterior/seguinte.
 */

import { api } from '../core/api.js';
import { html } from '../core/html.js';
import { resultBadge, gameRow, teamCrest } from '../components/game.js';
import { faixaCorrecao } from '../components/correcao.js';
import { breadcrumb, card, linkAcao } from '../components/layout.js';
import { barrasDesempenho, corAproveitamento } from '../components/stats.js';
import {
    anoDe,
    formatarData,
    formatarDataExtensa,
    formatarNumero,
    formatarPorcentagem,
    formatarRenda,
} from '../utils/format.js';

const CLUBE_NOME = 'Corinthians';

/**
 * Converte quebras de linha do texto em <br> (com escape do conteúdo).
 * @param {string} texto
 */
function paragrafos(texto) {
    return texto.split(/\r?\n/).map((linha, i) => html`${i > 0 ? html`<br />` : ''}${linha}`);
}

function placar(jogo) {
    const { mandante, visitante, penaltisMandante, penaltisVisitante } = jogo.placar;
    const temPenaltis = penaltisMandante !== null && penaltisVisitante !== null;
    const local = [jogo.estadio?.nome, jogo.estadio?.cidade, jogo.estadio?.pais].filter(Boolean).join(' · ');
    const eClube = (time) => time.id !== jogo.adversario.id;

    const lado = (time) => html`
        <div class="flex-1 text-center min-w-0">
            <div class="mb-4">${teamCrest(time, { clube: eClube(time) })}</div>
            <h3 class="text-sm sm:text-lg md:text-2xl font-bold text-white leading-tight">
                ${eClube(time) ? html`${time.nome}` : html`<a href="/adversarios/${time.id}" class="hover:text-gray-300 transition">${time.nome}</a>`}
            </h3>
            <p class="text-xs text-gray-400 uppercase tracking-wider mt-1">
                ${time.id === jogo.mandante.id ? 'Mandante' : 'Visitante'}
            </p>
        </div>
    `;

    return html`
        <div
            class="bg-gradient-to-br from-gray-900 to-black border border-gray-800 rounded-xl p-6 md:p-12 relative overflow-hidden shadow-2xl"
        >
            <div class="relative z-10 flex flex-col items-center justify-center space-y-8">
                <div class="text-center space-y-1">
                    <h2 class="text-gray-400 text-sm font-bold uppercase tracking-[0.2em]">
                        ${jogo.campeonato?.nome ?? 'Competição não informada'}
                    </h2>
                    <p class="text-gray-400 text-sm">
                        ${[jogo.fase, formatarDataExtensa(jogo.data), local].filter(Boolean).join(' - ')}
                    </p>
                </div>

                <div class="flex items-center justify-center w-full max-w-3xl gap-3 md:gap-12">
                    ${lado(jogo.mandante)}

                    <div class="flex flex-col items-center flex-shrink-0">
                        <div
                            class="text-4xl sm:text-5xl md:text-7xl font-display font-bold text-white tracking-wider sm:tracking-widest drop-shadow-lg whitespace-nowrap"
                        >
                            ${mandante ?? '–'}
                            <span class="text-gray-500 mx-0.5 sm:mx-1 md:mx-2">-</span> ${visitante ?? '–'}
                        </div>
                        ${
                            temPenaltis
                                ? html`<p class="text-gray-400 text-sm mt-2">
                                      Pênaltis: ${penaltisMandante} x ${penaltisVisitante}
                                  </p>`
                                : ''
                        }
                        <div class="mt-3">${resultBadge(jogo.resultado)}</div>
                    </div>

                    ${lado(jogo.visitante)}
                </div>
            </div>
        </div>
    `;
}

function navegacao({ anterior, proximo }) {
    const botao = (id, rotulo, seta) =>
        id
            ? html`<a href="/jogos/${id}" class="btn-secondary"
                  >${seta === 'esq' ? '← ' : ''}${rotulo}${seta === 'dir' ? ' →' : ''}</a
              >`
            : html`<span></span>`;
    return html`
        <div class="flex justify-between gap-4">
            ${botao(anterior, 'Jogo anterior', 'esq')} ${botao(proximo, 'Próximo jogo', 'dir')}
        </div>
    `;
}

function informacoes(jogo) {
    const linhas = [
        ['Data', formatarData(jogo.data)],
        ['Horário', jogo.horario],
        ['Competição', jogo.campeonato?.nome],
        ['Fase', jogo.fase],
        [
            'Estádio',
            jogo.estadio
                ? html`<a
                      href="/estadios/${jogo.estadio.id}"
                      class="hover:text-gray-300 underline decoration-gray-600 underline-offset-4"
                      >${jogo.estadio.nome}</a
                  >`
                : null,
        ],
        ['Cidade', [jogo.estadio?.cidade, jogo.estadio?.pais].filter(Boolean).join(', ') || null],
        ['Mando', jogo.emCasa ? `${CLUBE_NOME} mandante` : `${CLUBE_NOME} visitante`],
        ['Público', jogo.publico ? formatarNumero(jogo.publico) : null],
        ['Renda', jogo.renda ? formatarRenda(jogo.renda.valor, jogo.renda.moeda) : null],
        ['Árbitro', jogo.arbitro],
    ].filter(([, valor]) => valor); // o acervo não tem todos os campos para todos os jogos

    return card(
        { titulo: 'Informações' },
        html`
            <dl class="space-y-3 text-sm">
                ${linhas.map(
                    ([rotulo, valor]) => html`
                        <div
                            class="flex justify-between gap-4 border-b border-gray-700/50 pb-2 last:border-0 last:pb-0"
                        >
                            <dt class="text-gray-400">${rotulo}</dt>
                            <dd class="text-white font-medium text-right">${valor}</dd>
                        </div>
                    `,
                )}
            </dl>
        `,
    );
}

function retrospecto(jogo, confronto) {
    const adv = jogo.adversario;
    return card(
        {
            titulo: `Retrospecto contra ${adv.nome}`,
            subtitulo: `${formatarNumero(confronto.jogos)} jogos na história`,
            acao: linkAcao(`/adversarios/${adv.id}`, 'Ver confronto'),
        },
        html`
            <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div class="space-y-4">
                    <p class="text-sm text-gray-400">
                        Aproveitamento:
                        <strong class="${corAproveitamento(confronto.aproveitamento)}"
                            >${formatarPorcentagem(confronto.aproveitamento)}</strong
                        >
                        · Gols: <strong class="text-white">${confronto.golsPro} x ${confronto.golsContra}</strong>
                    </p>
                    ${barrasDesempenho(confronto)}
                </div>
                <div>
                    <p class="text-xs text-gray-400 uppercase font-bold mb-2">Outros confrontos recentes</p>
                    ${
                        confronto.ultimos.length
                            ? html`<ul>
                                  ${confronto.ultimos.map((j) => gameRow(j))}
                              </ul>`
                            : html`<p class="text-gray-400 text-sm">Primeiro e único encontro registrado.</p>`
                    }
                </div>
            </div>
        `,
    );
}

export default {
    async render({ params, signal }) {
        const { jogo, navegacao: nav, confronto } = await api.jogo(params.id, signal);
        const titulo = `${jogo.mandante.nome} ${jogo.placar.mandante ?? ''} x ${jogo.placar.visitante ?? ''} ${jogo.visitante.nome}`;

        return {
            title: `${titulo} (${formatarData(jogo.data)})`,
            content: html`
                <div class="space-y-8">
                    ${breadcrumb([
                        { label: 'Home', href: '/' },
                        { label: 'Jogos', href: '/jogos' },
                        { label: 'Detalhes da Partida' },
                    ])}
                    ${placar(jogo)} ${navegacao(nav)}

                    <div class="grid grid-cols-1 md:grid-cols-3 gap-8">
                        <div class="md:col-span-2 space-y-6">
                            ${retrospecto(jogo, confronto)}
                            ${
                                jogo.observacoes
                                    ? card(
                                          { titulo: 'Observações' },
                                          html`<p class="text-gray-300 leading-relaxed">
                                              ${paragrafos(jogo.observacoes)}
                                          </p>`,
                                      )
                                    : ''
                            }
                        </div>
                        <div class="space-y-6">
                            ${informacoes(jogo)}
                            <a href="/temporadas/${anoDe(jogo.data)}" class="btn-secondary w-full">
                                Ver temporada ${anoDe(jogo.data)}
                            </a>
                        </div>
                    </div>
                    ${faixaCorrecao({ jogoId: jogo.id, texto: 'Algum dado errado neste jogo?' })}
                </div>
            `,
        };
    },
};
