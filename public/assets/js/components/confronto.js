/**
 * Blocos compartilhados pelas páginas de confronto (adversário e clássico):
 * placar histórico, KPIs, gráfico por década e lista paginada de jogos.
 */

import { html } from '../core/html.js';
import { formatarData, formatarNumero, formatarPorcentagem, formatarSaldo, plural } from '../utils/format.js';
import { graficoColunas, legenda, tabelaDoGrafico, vedPorDecada } from './charts.js';
import { gameCard, teamCrest } from './game.js';
import { card, linkAcao } from './layout.js';
import { corAproveitamento, kpi } from './stats.js';

const POR_PAGINA = 20;

/**
 * Cartão "Corinthians V · E · V Rival".
 * @param {{ nome: string, sigla?: string | null, cidade?: string | null, estado?: string | null, pais?: string | null }} rival
 * @param {any} resumo
 * @param {{ titulo?: string, clube?: { nome: string, escudo?: string | null } }} [opcoes]
 */
export function placarConfronto(rival, resumo, { titulo, clube } = {}) {
    const local = [rival.cidade, rival.estado, rival.pais].filter(Boolean).join(' · ');
    return html`
        <div class="bg-gradient-to-br from-gray-900 to-black border border-gray-800 rounded-xl p-6 md:p-10">
            ${
                titulo
                    ? html`<p class="text-center text-gray-400 text-sm font-bold uppercase tracking-[0.2em] mb-6">
                          ${titulo}
                      </p>`
                    : ''
            }
            <div class="flex items-start justify-center gap-4 md:gap-12">
                <div class="flex-1 text-center">
                    ${teamCrest(clube ?? { nome: 'Corinthians' }, { clube: true, tamanho: 'md' })}
                    <h2 class="text-lg md:text-2xl font-bold text-white mt-3">Corinthians</h2>
                    ${local ? html`<p class="text-xs text-gray-400">São Paulo · SP</p>` : ''}
                    <p class="text-3xl md:text-5xl font-display font-bold text-green-400 mt-2">${resumo.vitorias}</p>
                    <p class="text-xs text-gray-400 uppercase">Vitórias</p>
                </div>
                <div class="text-center flex-shrink-0 self-center">
                    <p class="text-3xl md:text-5xl font-display font-bold text-gray-400">${resumo.empates}</p>
                    <p class="text-xs text-gray-400 uppercase">Empates</p>
                </div>
                <div class="flex-1 text-center">
                    ${teamCrest(rival, { tamanho: 'md' })}
                    <h2 class="text-lg md:text-2xl font-bold text-white mt-3 leading-tight">${rival.nome}</h2>
                    ${local ? html`<p class="text-xs text-gray-400">${local}</p>` : ''}
                    <p class="text-3xl md:text-5xl font-display font-bold text-red-400 mt-2">${resumo.derrotas}</p>
                    <p class="text-xs text-gray-400 uppercase">Vitórias</p>
                </div>
            </div>
            <p class="text-center text-gray-400 text-sm mt-6">
                ${plural(resumo.jogos, 'jogo')} entre ${formatarData(resumo.primeiroJogo)} e
                ${formatarData(resumo.ultimoJogo)}
            </p>
        </div>
    `;
}

/** @param {any} resumo */
export function kpisConfronto(resumo) {
    return html`
        <div class="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
            ${kpi('Jogos', formatarNumero(resumo.jogos))}
            ${kpi('Aproveitamento', formatarPorcentagem(resumo.aproveitamento), corAproveitamento(resumo.aproveitamento))}
            ${kpi('Gols', `${resumo.golsPro}:${resumo.golsContra}`, 'text-white')}
            ${kpi('Saldo', formatarSaldo(resumo.saldo), resumo.saldo >= 0 ? 'text-green-500' : 'text-red-400')}
        </div>
    `;
}

/**
 * Cartão do gráfico V/E/D por década (o desenho acontece em montarGraficoDecadas).
 * @param {any[]} jogos
 */
export function cardGraficoDecadas(jogos) {
    const { decadas, series } = vedPorDecada(jogos);
    return card(
        { titulo: 'Resultados por Década', subtitulo: 'Vitórias, empates e derrotas em cada década' },
        html`
            <div class="space-y-4">
                ${legenda(series.map((s) => ({ cor: s.cor, rotulo: s.nome })))}
                <div data-grafico="decadas" class="min-h-[260px]"></div>
                ${tabelaDoGrafico(
                    ['Década', 'V', 'E', 'D'],
                    decadas.map((d, i) => [
                        `Anos ${d}`,
                        series[0].valores[i],
                        series[1].valores[i],
                        series[2].valores[i],
                    ]),
                )}
            </div>
        `,
    );
}

/**
 * @param {HTMLElement} root
 * @param {any[]} jogos
 * @returns {() => void}
 */
export function montarGraficoDecadas(root, jogos) {
    const alvo = /** @type {HTMLElement | null} */ (root.querySelector('[data-grafico="decadas"]'));
    if (!alvo) return () => {};
    const { categorias, decadas, series } = vedPorDecada(jogos);
    return graficoColunas(alvo, {
        categorias,
        series,
        empilhado: true,
        tituloTooltip: (_c, i) => `Anos ${decadas[i]}`,
        descricao: 'Gráfico de colunas empilhadas: vitórias, empates e derrotas por década.',
    });
}

/**
 * Seção "Todos os jogos" com botão "mostrar mais" (ligado em montarListaJogos).
 * @param {any[]} jogos
 * @param {string} linkFiltro
 */
export function secaoJogos(jogos, linkFiltro) {
    return html`
        <section class="space-y-4">
            <div class="flex items-end justify-between border-b border-gray-800 pb-3 gap-4">
                <h3 class="text-2xl font-display font-bold text-white">Todos os Jogos</h3>
                ${linkAcao(linkFiltro, 'Filtrar jogos')}
            </div>
            <div id="lista-confronto" class="space-y-3">${jogos.slice(0, POR_PAGINA).map(gameCard)}</div>
            <div class="text-center">
                <button type="button" id="mostrar-mais" class="btn-ghost" ${jogos.length > POR_PAGINA ? '' : 'hidden'}>
                    Mostrar mais jogos
                </button>
            </div>
        </section>
    `;
}

/**
 * @param {HTMLElement} root
 * @param {any[]} jogos
 */
export function montarListaJogos(root, jogos) {
    const botao = /** @type {HTMLButtonElement | null} */ (root.querySelector('#mostrar-mais'));
    const lista = /** @type {HTMLElement | null} */ (root.querySelector('#lista-confronto'));
    if (!botao || !lista) return;
    let exibidos = POR_PAGINA;
    botao.addEventListener('click', () => {
        const proximos = jogos.slice(exibidos, exibidos + POR_PAGINA);
        lista.insertAdjacentHTML('beforeend', String(html`${proximos.map(gameCard)}`));
        exibidos += proximos.length;
        botao.hidden = exibidos >= jogos.length;
    });
}
