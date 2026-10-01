/**
 * Componentes de estatística: KPIs, barras V/E/D, rankings e sequências.
 */

import { escapeHtml, html, raw } from '../core/html.js';
import { miniEscudo } from './game.js';
import { formatarData, formatarNumero, formatarPorcentagem, plural } from '../utils/format.js';

/**
 * Classe de cor conforme o aproveitamento: verde (≥ 60%), neutro (45–60%), vermelho (< 45%).
 * O dourado fica reservado para conquistas.
 * @param {number | null} apv
 */
export function corAproveitamento(apv) {
    if (apv === null || apv === undefined) return 'text-gray-400';
    if (apv >= 60) return 'text-green-400';
    if (apv >= 45) return 'text-gray-200';
    return 'text-red-400';
}

/**
 * KPI grande (página de estatísticas).
 * @param {string} rotulo
 * @param {unknown} valor
 * @param {string} [corClasse]
 */
export function kpi(rotulo, valor, corClasse = 'text-white') {
    return html`
        <div class="bg-gray-900 p-4 md:p-6 rounded-xl border border-gray-800 hover:border-gray-600 transition">
            <p class="text-gray-400 text-xs md:text-sm uppercase font-bold tracking-wider">${rotulo}</p>
            <p class="text-3xl md:text-4xl font-bold mt-2 ${corClasse}">${valor}</p>
        </div>
    `;
}

/**
 * KPI pequeno (dentro de cartões).
 * @param {string} rotulo
 * @param {unknown} valor
 * @param {string} [corClasse]
 */
export function miniKpi(rotulo, valor, corClasse = 'text-white') {
    return html`
        <div class="bg-gray-800/50 rounded-lg p-3 text-center border border-gray-700">
            <p class="text-xs text-gray-400 uppercase font-bold mb-1">${rotulo}</p>
            <p class="text-2xl font-bold ${corClasse}">${valor}</p>
        </div>
    `;
}

/**
 * Quatro mini-KPIs padrão de um resumo (jogos, aproveitamento, gols).
 * @param {any} r - resumo da API
 */
export function resumoKpis(r) {
    return html`
        <div class="grid grid-cols-2 gap-3">
            ${miniKpi('Jogos', formatarNumero(r.jogos))}
            ${miniKpi('Aproveitamento', formatarPorcentagem(r.aproveitamento), corAproveitamento(r.aproveitamento))}
            ${miniKpi('Gols feitos', formatarNumero(r.golsPro), 'text-green-400')}
            ${miniKpi('Gols sofridos', formatarNumero(r.golsContra), 'text-red-400')}
        </div>
    `;
}

/**
 * @param {string} rotulo
 * @param {number} valor
 * @param {number} total
 * @param {string} corTexto
 * @param {string} corBarra
 */
function barra(rotulo, valor, total, corTexto, corBarra) {
    const pct = total > 0 ? ((valor / total) * 100).toFixed(1) : '0';
    return html`
        <div>
            <div class="flex justify-between text-xs font-bold uppercase mb-1">
                <span class="${corTexto}">${rotulo}</span>
                <span class="text-gray-400">${formatarNumero(valor)} de ${formatarNumero(total)}</span>
            </div>
            <div
                class="w-full bg-gray-800 rounded-full h-2.5"
                role="progressbar"
                aria-label="${rotulo}"
                aria-valuenow="${pct}"
                aria-valuemin="0"
                aria-valuemax="100"
            >
                <div class="${corBarra} h-2.5 rounded-full transition-all duration-500" style="width: ${pct}%"></div>
            </div>
        </div>
    `;
}

/**
 * Barras de vitórias, empates e derrotas.
 * @param {{ vitorias: number, empates: number, derrotas: number, jogos: number }} r
 */
export function barrasDesempenho(r) {
    return html`
        <div class="space-y-4">
            ${barra('Vitórias', r.vitorias, r.jogos, 'text-green-400', 'bg-green-500')}
            ${barra('Empates', r.empates, r.jogos, 'text-gray-400', 'bg-gray-500')}
            ${barra('Derrotas', r.derrotas, r.jogos, 'text-red-400', 'bg-red-500')}
        </div>
    `;
}

/**
 * Lista ranqueada (1º dourado, demais em cinza) — estilo do protótipo.
 * @param {{ href?: string, nome: string, valor: unknown, detalhe?: string, time?: { nome: string, escudo?: string | null } }[]} itens
 */
const CLASSE_LINHA =
    'flex justify-between items-center gap-3 border-b border-gray-800 py-2.5 -mx-2 px-2 rounded transition';

export function rankList(itens) {
    return html`
        <ol class="w-full space-y-1">
            ${itens.map(
                (item, i) => html`
                    <li>
                        ${raw(item.href ? `<a href="${escapeHtml(item.href)}" class="${CLASSE_LINHA} hover:bg-white/[0.03]">` : `<div class="${CLASSE_LINHA}">`)}
                        <span
                            class="font-medium flex items-center gap-3 min-w-0 ${i === 0 ? 'text-white' : 'text-gray-300'}"
                        >
                            <span
                                class="w-6 h-6 flex-shrink-0 rounded-full flex items-center justify-center text-xs font-bold ${i === 0 ? 'bg-white text-black' : 'bg-gray-700 text-white'}"
                                >${i + 1}</span
                            >
                            ${item.time ? miniEscudo(item.time) : ''}
                            <span class="min-w-0">
                                <span class="block truncate">${item.nome}</span>
                                ${item.detalhe ? html`<span class="block text-xs text-gray-400 truncate">${item.detalhe}</span>` : ''}
                            </span>
                        </span>
                        <span class="font-bold flex-shrink-0 ${i === 0 ? 'text-white' : 'text-gray-400'}"
                            >${item.valor}</span
                        >
                        ${raw(item.href ? '</a>' : '</div>')}
                    </li>
                `,
            )}
        </ol>
    `;
}

/**
 * Bloco de sequência histórica.
 * @param {string} rotulo
 * @param {{ tamanho: number, inicio: string, fim: string } | null} seq
 * @param {string} corClasse
 */
export function sequenciaTile(rotulo, seq, corClasse) {
    return html`
        <div class="bg-gray-800/50 rounded-lg p-4 border border-gray-700">
            <p class="text-xs text-gray-400 uppercase font-bold mb-1">${rotulo}</p>
            ${
                seq
                    ? html`
                          <p class="text-3xl font-bold font-display ${corClasse}">${plural(seq.tamanho, 'jogo')}</p>
                          <p class="text-xs text-gray-400 mt-1">
                              ${formatarData(seq.inicio)} a ${formatarData(seq.fim)}
                          </p>
                      `
                    : html`<p class="text-gray-400 text-sm">Sem dados</p>`
            }
        </div>
    `;
}
