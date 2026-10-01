/**
 * Estatísticas: números gerais, gráficos de evolução histórica, desempenho
 * por temporada (com seletor), adversários mais enfrentados e recordes.
 */

import { api } from '../core/api.js';
import { html } from '../core/html.js';
import { CORES, graficoColunas, graficoLinha, legenda, tabelaDoGrafico } from '../components/charts.js';
import { gameRow } from '../components/game.js';
import { card, linkAcao } from '../components/layout.js';
import { barrasDesempenho, corAproveitamento, kpi, rankList, resumoKpis, sequenciaTile } from '../components/stats.js';
import { formatarData, formatarNumero, formatarPorcentagem, plural } from '../utils/format.js';
import { TIPOS_NACIONAIS_E_INTERNACIONAIS, titulosDoAno } from '../utils/titulos.js';

/** @param {any} temporada */
function painelTemporada(temporada) {
    if (!temporada) return html`<p class="text-gray-400 text-sm">Nenhum dado encontrado.</p>`;
    return html`
        <div class="space-y-6">
            ${resumoKpis(temporada)} ${barrasDesempenho(temporada)}
            <div class="text-right">${linkAcao(`/temporadas/${temporada.ano}`, `Ver temporada ${temporada.ano}`)}</div>
        </div>
    `;
}

function listaRecordes(titulo, jogos, destaque) {
    return card(
        { titulo },
        jogos.length
            ? html`<ul>
                  ${jogos.map((j) => gameRow(j, { destaque: destaque(j) }))}
              </ul>`
            : html`<p class="text-gray-400 text-sm">Sem dados.</p>`,
    );
}

/**
 * Soma gols pró e contra por década a partir das temporadas.
 * @param {{ ano: number, golsPro: number, golsContra: number }[]} temporadas
 */
function golsPorDecada(temporadas) {
    const mapa = new Map();
    for (const t of temporadas) {
        const d = Math.floor(t.ano / 10) * 10;
        const atual = mapa.get(d) ?? { pro: 0, contra: 0 };
        mapa.set(d, { pro: atual.pro + t.golsPro, contra: atual.contra + t.golsContra });
    }
    const decadas = [...mapa.keys()].sort((a, b) => a - b);
    return { decadas, pro: decadas.map((d) => mapa.get(d).pro), contra: decadas.map((d) => mapa.get(d).contra) };
}

/**
 * "Anos 1950" ou, para a década em andamento, "Anos 2020 (até 2025)".
 * @param {number} decada
 * @param {number} ultimoAno
 */
function rotuloDecada(decada, ultimoAno) {
    return ultimoAno < decada + 9 ? `Anos ${decada} (até ${ultimoAno})` : `Anos ${decada}`;
}

/** Seção com os dois gráficos de evolução (desenhados no mount). */
function secaoEvolucao(temporadas, resumo) {
    const cronologica = [...temporadas].sort((a, b) => a.ano - b.ano);
    const gols = golsPorDecada(temporadas);
    return html`
        <section class="space-y-6">
            <h2 class="text-3xl font-display font-bold text-white pt-4">Evolução Histórica</h2>

            ${card(
                {
                    titulo: 'Aproveitamento por Temporada',
                    subtitulo: 'Passe o mouse (ou toque) no gráfico para ver cada ano',
                },
                html`
                    <div class="space-y-4">
                        ${legenda([
                            { cor: CORES.linha, rotulo: 'Aproveitamento no ano', forma: 'linha' },
                            { cor: CORES.destaque, rotulo: 'Título nacional ou internacional', forma: 'ponto' },
                            {
                                cor: CORES.eixo,
                                rotulo: `Média histórica (${formatarPorcentagem(resumo.aproveitamento)})`,
                                forma: 'linha',
                            },
                        ])}
                        <div data-grafico="aproveitamento" class="min-h-[280px]"></div>
                        ${tabelaDoGrafico(
                            ['Ano', 'Jogos', 'V', 'E', 'D', 'Aproveitamento'],
                            cronologica.map((t) => [
                                t.ano,
                                t.jogos,
                                t.vitorias,
                                t.empates,
                                t.derrotas,
                                formatarPorcentagem(t.aproveitamento),
                            ]),
                        )}
                    </div>
                `,
            )}
            ${card(
                {
                    titulo: 'Gols por Década',
                    subtitulo: `Gols marcados e sofridos em cada década (a última vai até ${Math.max(...temporadas.map((t) => t.ano))})`,
                },
                html`
                    <div class="space-y-4">
                        ${legenda([
                            { cor: CORES.vitoria, rotulo: 'Gols marcados' },
                            { cor: CORES.derrota, rotulo: 'Gols sofridos' },
                        ])}
                        <div data-grafico="gols" class="min-h-[260px]"></div>
                        ${tabelaDoGrafico(
                            ['Década', 'Marcados', 'Sofridos', 'Saldo'],
                            gols.decadas.map((d, i) => [
                                rotuloDecada(d, Math.max(...temporadas.map((t) => t.ano))),
                                formatarNumero(gols.pro[i]),
                                formatarNumero(gols.contra[i]),
                                formatarNumero(gols.pro[i] - gols.contra[i]),
                            ]),
                        )}
                    </div>
                `,
            )}
        </section>
    `;
}

const destaqueSaldo = (cor) => (j) =>
    html`<span class="text-sm font-bold ${cor} flex-shrink-0">${Math.abs(j.golsPro - j.golsContra)} gols</span>`;

export default {
    async render({ signal }) {
        const [resumo, temporadas, recordes] = await Promise.all([
            api.resumo(signal),
            api.temporadas(signal),
            api.recordes(signal),
        ]);

        return {
            title: 'Estatísticas',
            content: html`
                <div class="space-y-8">
                    <header class="space-y-2">
                        <h2 class="text-3xl font-display font-bold text-white">Números Gerais</h2>
                        <p class="text-gray-400">
                            De ${formatarData(resumo.primeiroJogo)} a ${formatarData(resumo.ultimoJogo)} ·
                            ${plural(resumo.temporadas, 'temporada')}
                        </p>
                    </header>

                    <div class="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
                        ${kpi('Total de Jogos', formatarNumero(resumo.jogos))}
                        ${kpi('Vitórias', formatarNumero(resumo.vitorias), 'text-green-500')}
                        ${kpi('Gols Marcados', formatarNumero(resumo.golsPro), 'text-white')}
                        ${kpi('Aproveitamento', formatarPorcentagem(resumo.aproveitamento), corAproveitamento(resumo.aproveitamento))}
                    </div>

                    ${secaoEvolucao(temporadas, resumo)}

                    <div class="grid grid-cols-1 md:grid-cols-2 gap-8">
                        ${card(
                            {
                                titulo: 'Desempenho por Temporada',
                                acao: html`
                                    <label for="filtro-ano-stats" class="sr-only">Temporada</label>
                                    <select id="filtro-ano-stats" class="form-control w-auto py-1.5">
                                        ${temporadas.map((t) => html`<option value="${t.ano}">${t.ano}</option>`)}
                                    </select>
                                `,
                            },
                            html`<div id="stats-ano-container">${painelTemporada(temporadas[0])}</div>`,
                        )}
                        ${card(
                            {
                                titulo: 'Adversários Mais Enfrentados',
                                subtitulo: 'Top 5 da história',
                                acao: linkAcao('/adversarios', 'Todos'),
                            },
                            rankList(
                                recordes.adversariosMaisEnfrentados.slice(0, 5).map((a) => ({
                                    href: `/adversarios/${a.id}`,
                                    nome: a.nome,
                                    time: a,
                                    valor: formatarNumero(a.jogos),
                                    detalhe: `${a.vitorias}V ${a.empates}E ${a.derrotas}D · ${formatarPorcentagem(a.aproveitamento)}`,
                                })),
                            ),
                        )}
                    </div>

                    <section class="space-y-6">
                        <h2 class="text-3xl font-display font-bold text-white pt-4">Recordes</h2>

                        <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
                            ${sequenciaTile('Maior invencibilidade', recordes.sequencias.invencibilidade, 'text-white')}
                            ${sequenciaTile('Mais vitórias seguidas', recordes.sequencias.vitorias, 'text-green-400')}
                            ${sequenciaTile('Maior jejum de vitórias', recordes.sequencias.semVencer, 'text-red-400')}
                        </div>

                        <div
                            class="grid grid-cols-1 gap-6 ${recordes.maioresPublicos.length ? 'lg:grid-cols-3' : 'lg:grid-cols-2'}"
                        >
                            ${listaRecordes('Maiores Goleadas', recordes.maioresVitorias, destaqueSaldo('text-green-400'))}
                            ${listaRecordes('Maiores Derrotas', recordes.maioresDerrotas, destaqueSaldo('text-red-400'))}
                            ${
                                recordes.maioresPublicos.length
                                    ? listaRecordes(
                                          'Maiores Públicos',
                                          recordes.maioresPublicos,
                                          (j) =>
                                              html`<span class="text-sm font-bold text-white flex-shrink-0"
                                                  >${formatarNumero(j.publico)}</span
                                              >`,
                                      )
                                    : ''
                            }
                        </div>

                        ${card(
                            { titulo: 'Estádios Mais Frequentes' },
                            rankList(
                                recordes.estadiosMaisFrequentes.map((e) => ({
                                    href: `/estadios/${e.id}`,
                                    nome: e.nome,
                                    detalhe: [e.cidade, `${formatarPorcentagem(e.aproveitamento)} de aproveitamento`]
                                        .filter(Boolean)
                                        .join(' · '),
                                    valor: plural(e.jogos, 'jogo'),
                                })),
                            ),
                        )}
                    </section>
                </div>
            `,
        };
    },

    async mount(root) {
        const [temporadas, resumo, titulos] = await Promise.all([
            api.temporadas(),
            api.resumo(),
            api.titulos().catch(() => null),
        ]); // todos vêm do cache
        const limpezas = [desenharAproveitamento(root, temporadas, resumo, titulos), desenharGols(root, temporadas)];

        const select = /** @type {HTMLSelectElement} */ (root.querySelector('#filtro-ano-stats'));
        const container = /** @type {HTMLElement} */ (root.querySelector('#stats-ano-container'));

        const onChange = async () => {
            const temporadas = await api.temporadas(); // vem do cache
            const temporada = temporadas.find((t) => String(t.ano) === select.value);
            container.innerHTML = String(painelTemporada(temporada));
        };
        select.addEventListener('change', onChange);

        return () => limpezas.forEach((fn) => fn());
    },
};

/**
 * Linha de aproveitamento ano a ano, com anos sem jogos como lacunas.
 * @returns {() => void}
 */
function desenharAproveitamento(root, temporadas, resumo, titulos) {
    const alvo = /** @type {HTMLElement | null} */ (root.querySelector('[data-grafico="aproveitamento"]'));
    if (!alvo) return () => {};

    const porAno = new Map(temporadas.map((t) => [t.ano, t]));
    const anos = temporadas.map((t) => t.ano);
    const pontos = [];
    for (let ano = Math.min(...anos); ano <= Math.max(...anos); ano += 1) {
        const t = porAno.get(ano);
        const conquistas = titulosDoAno(titulos, ano, { somentePrincipais: true });
        const destaque = titulosDoAno(titulos, ano, { tipos: TIPOS_NACIONAIS_E_INTERNACIONAIS });
        pontos.push({
            x: ano,
            y: t?.aproveitamento ?? null,
            marcado: destaque.length > 0,
            tooltip: {
                titulo: String(ano),
                linhas: t
                    ? [
                          {
                              cor: CORES.destaque,
                              valor: formatarPorcentagem(t.aproveitamento),
                              rotulo: 'aproveitamento',
                          },
                          { valor: `${t.vitorias}V ${t.empates}E ${t.derrotas}D`, rotulo: plural(t.jogos, 'jogo') },
                      ]
                    : [{ valor: '—', rotulo: 'sem jogos no acervo' }],
                nota: conquistas.length ? `🏆 ${conquistas.join(', ')}` : undefined,
            },
        });
    }

    return graficoLinha(alvo, {
        pontos,
        yMax: 100,
        formatarY: (v) => `${v}%`,
        referencia: { valor: resumo.aproveitamento, rotulo: 'média' },
        descricao: `Aproveitamento do Corinthians por temporada, de ${pontos[0].x} a ${pontos[pontos.length - 1].x}. Média histórica de ${formatarPorcentagem(resumo.aproveitamento)}.`,
    });
}

/**
 * Colunas agrupadas de gols marcados e sofridos por década.
 * @returns {() => void}
 */
function desenharGols(root, temporadas) {
    const alvo = /** @type {HTMLElement | null} */ (root.querySelector('[data-grafico="gols"]'));
    if (!alvo) return () => {};
    const gols = golsPorDecada(temporadas);
    const ultimoAno = Math.max(...temporadas.map((t) => t.ano));
    return graficoColunas(alvo, {
        categorias: gols.decadas.map(String),
        series: [
            { nome: 'marcados', cor: CORES.vitoria, valores: gols.pro },
            { nome: 'sofridos', cor: CORES.derrota, valores: gols.contra },
        ],
        formatarY: (v) => formatarNumero(v),
        tituloTooltip: (_c, i) => rotuloDecada(gols.decadas[i], ultimoAno),
        descricao: 'Gráfico de colunas com gols marcados e sofridos pelo Corinthians em cada década.',
    });
}
