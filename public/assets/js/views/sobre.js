/**
 * Página Sobre: o que é o Acervo, números, quem faz, como ajudar,
 * perguntas frequentes, fontes e aviso legal.
 */

import { api } from '../core/api.js';
import { html } from '../core/html.js';
import { botaoCorrecao } from '../components/correcao.js';
import { CONTATO, REDES, iconesRedes } from '../components/redes.js';
import { anoDe, formatarNumero } from '../utils/format.js';

const PERGUNTAS = [
    {
        pergunta: 'Os dados são oficiais?',
        resposta:
            'Não. O Acervo é um projeto de torcedor: os jogos vêm de fontes públicas e são revisados aos poucos, com a ajuda da própria torcida.',
    },
    {
        pergunta: 'Encontrei um erro. E agora?',
        resposta:
            'Use o botão "Achou um erro? Avise" (tem um no fim de cada página de jogo, temporada, confronto e estádio). Cada aviso é conferido antes de qualquer correção.',
    },
    {
        pergunta: 'O site tem ligação com o clube?',
        resposta:
            'Não. É um projeto independente e sem fins lucrativos, sem vínculo com o Sport Club Corinthians Paulista.',
    },
    {
        pergunta: 'Por que alguns jogos não têm público, árbitro ou escalação?',
        resposta:
            'Porque essas informações ainda não foram reunidas para todos os jogos. O acervo vai sendo completado com o tempo.',
    },
    {
        pergunta: 'Com que frequência o acervo é atualizado?',
        resposta:
            'Os jogos novos entram depois de cada partida. O site está em versão beta e ganha novidades com frequência.',
    },
];

const CREDITOS = [
    {
        nome: 'Todo Poderoso Timão',
        url: 'https://www.todopoderosotimao.com.br',
        texto: 'fonte dos jogos e resultados',
    },
    {
        nome: 'geodata-br-states',
        url: 'https://github.com/giuliano-oliveira/geodata-br-states',
        texto: 'contorno dos estados no mapa (licença MIT)',
    },
    {
        nome: 'municipios-brasileiros',
        url: 'https://github.com/kelvins/municipios-brasileiros',
        texto: 'posição das cidades no mapa (licença MIT, dados do IBGE)',
    },
    {
        nome: 'Natural Earth',
        url: 'https://www.naturalearthdata.com',
        texto: 'contorno dos países no mapa (domínio público)',
    },
];

const titulo = (texto) => html`<h3 class="text-2xl font-display font-bold text-white">${texto}</h3>`;
const linkTexto = 'text-white underline underline-offset-4 decoration-gray-500 hover:decoration-white';

/** @param {{ valor: number | null, rotulo: string }[]} itens */
function numeros(itens) {
    return html`
        <dl class="grid grid-cols-2 sm:grid-cols-3 gap-3">
            ${itens.map(
                (i) => html`
                    <div class="bg-gray-900 border border-gray-800 rounded-xl p-4 text-center">
                        <dd class="text-3xl font-display font-bold text-white">
                            ${i.valor === null ? '—' : formatarNumero(i.valor)}
                        </dd>
                        <dt class="text-xs text-gray-400 uppercase font-bold tracking-wider mt-1">${i.rotulo}</dt>
                    </div>
                `,
            )}
        </dl>
    `;
}

export default {
    async render({ signal }) {
        // Cada número é opcional: se uma consulta falhar, a página continua com "—"
        const opcional = (promessa, padrao) =>
            promessa.catch((err) => {
                if (err.name === 'AbortError') throw err;
                return padrao;
            });
        const [resumo, titulos, mapa, adversarios, estadios] = await Promise.all([
            opcional(api.resumo(signal), null),
            opcional(api.titulos(signal), null),
            opcional(api.mapa(signal), null),
            opcional(api.adversarios(signal), null),
            opcional(api.estadios(signal), null),
        ]);
        const contar = (lista) => (Array.isArray(lista) ? lista.length : null);

        return {
            title: 'Sobre',
            content: html`
                <div class="max-w-3xl mx-auto space-y-14">
                    <!-- 1. O que é -->
                    <header class="text-center space-y-5">
                        <img
                            src="/assets/img/logo-256.png"
                            data-escudo
                            alt=""
                            width="112"
                            height="112"
                            class="w-28 h-28 mx-auto"
                        />
                        <img
                            src="/assets/img/logo-256-claro.png"
                            data-escudo-claro
                            alt=""
                            width="112"
                            height="112"
                            class="w-28 h-28 mx-auto"
                        />
                        <h2 class="text-4xl font-display font-bold text-white">Sobre o Acervo</h2>
                        <p class="text-gray-300 leading-relaxed text-lg max-w-2xl mx-auto">
                            O Acervo Corinthians reúne a história do Timão jogo a jogo,
                            ${resumo ? `desde ${anoDe(resumo.primeiroJogo)}` : 'desde 1910'}, para que todo torcedor
                            encontre placares, clássicos, títulos e recordes num só lugar.
                        </p>
                    </header>

                    <!-- 2. Números -->
                    <section class="space-y-5">
                        ${titulo('O acervo em números')}
                        ${numeros([
                            { valor: resumo?.jogos ?? null, rotulo: 'jogos' },
                            { valor: resumo?.temporadas ?? null, rotulo: 'temporadas' },
                            { valor: titulos?.total ?? null, rotulo: 'títulos' },
                            { valor: contar(adversarios), rotulo: 'adversários' },
                            { valor: contar(estadios), rotulo: 'estádios' },
                            { valor: mapa?.totais?.cidades ?? null, rotulo: 'cidades' },
                        ])}
                    </section>

                    <!-- 3. Quem faz -->
                    <section class="bg-gray-900 border border-gray-800 rounded-xl p-6 md:p-8 flex items-center gap-5">
                        <span class="text-5xl" aria-hidden="true">🦅</span>
                        <div>
                            ${titulo('Quem faz')}
                            <p class="text-gray-300 mt-2">Feito por um Fiel torcedor apaixonado pelo Corinthians.</p>
                        </div>
                    </section>

                    <!-- 4. Ajude o acervo -->
                    <section class="space-y-5">
                        ${titulo('Ajude o acervo')}
                        <p class="text-gray-400 leading-relaxed">
                            O site está em versão beta. Viu algum placar, data ou estádio errado? Avise: cada correção
                            deixa o acervo mais completo para toda a Fiel.
                        </p>
                        <div class="flex flex-wrap items-center gap-4">
                            ${botaoCorrecao()}
                            <a href="mailto:${CONTATO}" class="btn-secondary text-sm">${CONTATO}</a>
                        </div>
                        <div class="flex flex-wrap items-center gap-4">
                            ${iconesRedes()}
                            <p class="text-sm text-gray-400">
                                Siga
                                ${REDES.map(
                                    (r, i) =>
                                        html`${i ? ' e ' : ''}<a
                                                href="${r.url}"
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                class="${linkTexto}"
                                                >${r.usuario} no ${r.nome.replace(' (Twitter)', '')}</a
                                            >`,
                                )}.
                            </p>
                        </div>
                    </section>

                    <!-- Evolução dos escudos -->
                    <section class="space-y-5">
                        ${titulo('Os escudos do Timão')}
                        <p class="text-gray-400 leading-relaxed">
                            Do monograma "CP" de 1910 ao escudo com âncora e remos de hoje: o símbolo do Corinthians
                            mudou várias vezes ao longo da história.
                        </p>
                        <div class="bg-white rounded-xl p-6 flex justify-center">
                            <img
                                src="/assets/img/sobre/evolucao-escudos.jpg"
                                alt="A evolução dos escudos do Corinthians, do monograma CP ao escudo atual"
                                width="454"
                                height="170"
                                loading="lazy"
                                class="w-full max-w-sm h-auto"
                            />
                        </div>
                    </section>

                    <!-- 6. Perguntas frequentes -->
                    <section class="space-y-5">
                        ${titulo('Perguntas frequentes')}
                        <div class="space-y-3">
                            ${PERGUNTAS.map(
                                (p) => html`
                                    <details class="group bg-gray-900 border border-gray-800 rounded-xl">
                                        <summary
                                            class="cursor-pointer list-none flex items-center justify-between gap-4 p-5 font-bold text-white"
                                        >
                                            ${p.pergunta}
                                            <span
                                                class="text-gray-400 transition group-open:rotate-45 text-xl"
                                                aria-hidden="true"
                                                >+</span
                                            >
                                        </summary>
                                        <p class="px-5 pb-5 text-gray-400 leading-relaxed">${p.resposta}</p>
                                    </details>
                                `,
                            )}
                        </div>
                    </section>

                    <!-- 7. Fontes e créditos -->
                    <section class="space-y-5">
                        ${titulo('Fontes e créditos')}
                        <ul class="space-y-2 text-gray-400">
                            ${CREDITOS.map(
                                (c) => html`
                                    <li>
                                        <a
                                            href="${c.url}"
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            class="${linkTexto}"
                                            >${c.nome}</a
                                        >: ${c.texto}
                                    </li>
                                `,
                            )}
                        </ul>
                    </section>

                    <!-- 8. Aviso legal -->
                    <p class="text-xs text-gray-500 leading-relaxed border-t border-gray-800 pt-6">
                        Projeto independente e sem fins lucrativos, sem vínculo com o Sport Club Corinthians Paulista.
                        Nomes, escudos e marcas pertencem aos seus respectivos donos e aparecem apenas para identificar
                        clubes e competições.
                    </p>
                </div>
            `,
        };
    },
};
