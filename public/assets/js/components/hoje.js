/**
 * Blocos do "Hoje na história": card do jogo em destaque e seção da home.
 */

import { html } from '../core/html.js';
import { anosDesde, formatarDataExtensa, formatarDiaDoAno, haAnos, plural } from '../utils/format.js';
import { gameRow, resultBadge, teamCrest } from './game.js';
import { linkAcao } from './layout.js';

/**
 * Card grande do jogo em destaque do dia.
 * @param {any} jogo
 */
export function cardDestaque(jogo) {
    const anos = anosDesde(jogo.data);
    const lado = (time) => html`
        <div class="flex-1 text-center min-w-0">
            <div class="mb-3">${teamCrest(time, { clube: time.id !== jogo.adversario.id, tamanho: 'md' })}</div>
            <p class="text-base md:text-xl font-bold text-white break-words">${time.nome}</p>
        </div>
    `;

    return html`
        <a
            href="/jogos/${jogo.id}"
            class="group block relative overflow-hidden bg-gradient-to-br from-gray-900 to-black border border-gray-800 hover:border-gray-600 rounded-xl p-6 md:p-10 transition"
        >
            <div class="flex flex-wrap items-center justify-between gap-3 mb-8">
                <span
                    class="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white text-black text-xs font-bold uppercase tracking-wider"
                >
                    ${haAnos(anos)}
                </span>
                <span class="text-xs text-gray-400 uppercase tracking-wider">${formatarDataExtensa(jogo.data)}</span>
            </div>

            <div class="flex items-center justify-center gap-3 md:gap-10">
                ${lado(jogo.mandante)}
                <div class="flex flex-col items-center flex-shrink-0">
                    <p class="text-4xl md:text-6xl font-display font-bold text-white whitespace-nowrap">
                        ${jogo.placar.mandante ?? '–'}
                        <span class="text-gray-500">-</span> ${jogo.placar.visitante ?? '–'}
                    </p>
                    <div class="mt-3">${resultBadge(jogo.resultado)}</div>
                </div>
                ${lado(jogo.visitante)}
            </div>

            <div class="text-center mt-8 space-y-1">
                <p class="text-gray-400 text-sm font-bold uppercase tracking-[0.15em]">
                    ${jogo.campeonato?.nome ?? ''}${jogo.fase ? ` · ${jogo.fase}` : ''}
                </p>
                ${
                    jogo.jogoDoTitulo
                        ? html`<p class="text-white font-bold">🏆 ${jogo.observacoes}</p>`
                        : jogo.observacoes
                          ? html`<p class="text-gray-400 text-sm">${jogo.observacoes}</p>`
                          : ''
                }
            </div>
        </a>
    `;
}

/**
 * Linha compacta com "há X anos".
 * @param {any} jogo
 */
function linhaDoDia(jogo) {
    return gameRow(jogo, {
        destaque: html`<span class="flex items-center gap-2 flex-shrink-0">
            <span class="text-xs text-gray-400 hidden sm:inline">${haAnos(anosDesde(jogo.data))}</span>
            ${resultBadge(jogo.resultado, { compacto: true })}
        </span>`,
    });
}

/**
 * Seção da home.
 * @param {{ mes: number, dia: number, destaque: any, jogos: any[] } | null} dados
 */
export function secaoHojeHome(dados) {
    if (!dados?.destaque) return '';
    const outros = dados.jogos.filter((j) => j.id !== dados.destaque.id).slice(0, 5);
    return html`
        <section class="py-16">
            <div class="flex items-end justify-between mb-8 border-b border-gray-800 pb-4 gap-4">
                <div>
                    <p class="text-gray-400 text-xs font-bold uppercase tracking-[0.2em]">
                        ${formatarDiaDoAno(dados.mes, dados.dia)}
                    </p>
                    <h3 class="text-3xl font-display font-bold text-white mt-1">Hoje na História</h3>
                </div>
                ${linkAcao('/hoje', `Ver os ${dados.jogos.length} jogos`)}
            </div>
            <div class="grid grid-cols-1 lg:grid-cols-5 gap-6 items-start">
                <div class="lg:col-span-3">${cardDestaque(dados.destaque)}</div>
                <div class="lg:col-span-2 bg-sccp-gray border border-gray-800 rounded-xl p-6">
                    <p class="text-xs text-gray-400 uppercase font-bold mb-2">Também neste dia</p>
                    <ul>
                        ${outros.map(linhaDoDia)}
                    </ul>
                </div>
            </div>
        </section>
    `;
}

/**
 * Resumo divertido do dia: "30 de setembro: 12 vitórias, 5 empates, 4 derrotas".
 * @param {any[]} jogos
 */
export function resumoDoDia(jogos) {
    const conta = (r) => jogos.filter((j) => j.resultado === r).length;
    const v = conta('V');
    const d = conta('D');
    const veredito =
        v > d * 2
            ? 'Dia de sorte para a Fiel! 🍀'
            : v > d
              ? 'Um dia que costuma ser bom para o Timão.'
              : v === d
                ? 'Um dia equilibrado na história.'
                : 'Um dia que pede cautela… 😬';
    return html`
        <div class="grid grid-cols-3 gap-3 text-center">
            <div class="bg-gray-900 border border-gray-800 rounded-xl p-4">
                <p class="text-3xl font-display font-bold text-white">${v}</p>
                <p class="text-xs text-gray-400 uppercase mt-1">${v === 1 ? 'Vitória' : 'Vitórias'}</p>
            </div>
            <div class="bg-gray-900 border border-gray-800 rounded-xl p-4">
                <p class="text-3xl font-display font-bold text-white">${conta('E')}</p>
                <p class="text-xs text-gray-400 uppercase mt-1">${conta('E') === 1 ? 'Empate' : 'Empates'}</p>
            </div>
            <div class="bg-gray-900 border border-gray-800 rounded-xl p-4">
                <p class="text-3xl font-display font-bold text-white">${d}</p>
                <p class="text-xs text-gray-400 uppercase mt-1">${d === 1 ? 'Derrota' : 'Derrotas'}</p>
            </div>
        </div>
        <p class="text-center text-gray-400 text-sm mt-3">${plural(jogos.length, 'jogo')} nesta data · ${veredito}</p>
    `;
}
