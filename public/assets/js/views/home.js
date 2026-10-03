/**
 * Página inicial: hero, números do acervo, últimos jogos e atalhos.
 */

import { api } from '../core/api.js';
import { mapaDoSite } from '../components/navegacao.js';
import { html } from '../core/html.js';
import { gameCard } from '../components/game.js';
import { linkAcao } from '../components/layout.js';
import { secaoHojeHome } from '../components/hoje.js';
import { formatarNumero, formatarPorcentagem, hojeDiaMes } from '../utils/format.js';
import { totalDaCompeticao } from '../utils/titulos.js';

const ULTIMOS_JOGOS = 4;

const ATALHOS = [
    {
        href: '/temporadas',
        titulo: 'Linha do Tempo',
        texto: 'Viaje ano a ano pela história gloriosa.',
        imagem: "bg-[url('https://images.unsplash.com/photo-1508098682722-e99c43a406b2?q=80&w=800&auto=format&fit=crop')]",
    },
    {
        href: '/adversarios',
        titulo: 'Confrontos',
        texto: 'Histórico de duelos contra cada rival.',
        imagem: "bg-[url('https://images.unsplash.com/photo-1431324155629-1a6deb1dec8d?q=80&w=800&auto=format&fit=crop')]",
    },
    {
        href: '/estatisticas',
        titulo: 'Recordes',
        texto: 'Goleadas, sequências e marcas históricas.',
        imagem: "bg-[url('https://plus.unsplash.com/premium_photo-1684713510986-2342c262744c?q=80&w=800&auto=format&fit=crop')]",
    },
];

/** A home continua útil mesmo se a API falhar: os números viram "—". */
async function carregarDados(signal) {
    const [resumo, recentes, titulos, hoje] = await Promise.allSettled([
        api.resumo(signal),
        api.recentes(ULTIMOS_JOGOS, signal),
        api.titulos(signal),
        api.hoje(hojeDiaMes(), signal),
    ]);
    if (signal.aborted) throw new DOMException('Navegação cancelada', 'AbortError');
    const valor = (r) => (r.status === 'fulfilled' ? r.value : null);
    return { resumo: valor(resumo), recentes: valor(recentes), titulos: valor(titulos), hoje: valor(hoje) };
}

/**
 * Frases do título da home (linha de cima, linha de baixo em degradê).
 * Uma é sorteada a cada visita, sem repetir a anterior. Para trocar, edite a lista.
 * @type {((resumo: any) => [string, string] | null)[]}
 */
const FRASES = [
    () => ['TODA A HISTÓRIA', 'DO TIMÃO'],
    () => ['JOGO A JOGO', 'DESDE 1910'],
    () => ['A MEMÓRIA', 'DA FIEL'],
    () => ['AQUI TEM UM', 'BANDO DE LOUCOS'],
    () => ['MALOQUEIRO', 'E SOFREDOR'],
    () => ['FIEL', 'DESDE 1910'],
    () => ['ETERNO', 'ALVINEGRO'],
    (resumo) => (resumo ? [`${formatarNumero(resumo.jogos)} JOGOS.`, 'UMA PAIXÃO.'] : null),
    () => ['O TIME', 'DO POVO'],
    () => ['A CASA', 'DO POVO'],
];
const CHAVE_FRASE = 'acervo:frase-home';

/** Sorteia uma frase diferente da última mostrada neste navegador. */
function sortearFrase(resumo) {
    let ultima = -1;
    try {
        ultima = Number(localStorage.getItem(CHAVE_FRASE) ?? -1);
    } catch {
        /* sem armazenamento: só não evita a repetição */
    }
    const validas = FRASES.map((f, i) => [i, f(resumo)]).filter(([i, f]) => f && i !== ultima);
    const [indice, frase] = validas[Math.floor(Math.random() * validas.length)];
    try {
        localStorage.setItem(CHAVE_FRASE, String(indice));
    } catch {
        /* idem */
    }
    return frase;
}

/**
 * Frases compridas usam letra menor para não estourar a tela.
 * Em telas baixas (notebook) o título também encolhe, para caber tudo no topo.
 */
const TELA_BAIXA = 'md:[@media(max-height:800px)]:text-6xl lg:[@media(max-height:800px)]:text-7xl';
function tamanhoTitulo([linha1, linha2]) {
    const maior = Math.max(linha1.length, linha2.length);
    if (maior <= 7) return `text-6xl md:text-8xl lg:text-9xl ${TELA_BAIXA}`;
    if (maior <= 10)
        return `text-[clamp(2rem,12.5vw,2.75rem)] leading-[0.95] sm:text-6xl md:text-7xl lg:text-8xl ${TELA_BAIXA}`;
    return `text-[clamp(1.8rem,10.5vw,2.6rem)] leading-[0.95] sm:text-6xl md:text-7xl lg:text-8xl ${TELA_BAIXA}`;
}

function hero(resumo) {
    const frase = sortearFrase(resumo);
    return html`
        <section
            class="relative min-h-[max(560px,85vh)] w-full overflow-hidden flex items-end justify-start group bg-black"
        >
            <div
                class="absolute inset-0 bg-[url('/assets/img/arena-hero.jpg')] bg-cover bg-center transition-transform duration-[2000ms] group-hover:scale-105 opacity-80"
            ></div>
            <div class="absolute inset-0 bg-gradient-to-t from-sccp-black via-sccp-black/50 to-transparent"></div>

            <div
                class="relative z-10 w-full max-w-7xl mx-auto px-6 pt-10 pb-16 md:pb-28 [@media(max-height:800px)]:md:pb-16"
            >
                <div class="max-w-4xl space-y-6 animate-fade-in">
                    <div
                        class="inline-flex items-center gap-3 px-4 py-2 rounded-full bg-black/60 backdrop-blur-md border border-gray-700 text-white font-bold text-[10px] sm:text-xs uppercase tracking-[0.15em] sm:tracking-[0.2em] whitespace-nowrap mb-4"
                    >
                        <span class="w-2 h-2 rounded-full bg-sccp-gold animate-pulse shadow-[0_0_10px_#D4AF37]"></span>
                        Acervo histórico · Desde 1910
                    </div>

                    <h1
                        class="${tamanhoTitulo(frase)} font-display font-black text-white leading-[0.9] tracking-tighter drop-shadow-2xl"
                    >
                        ${frase[0]} <br />
                        <span class="text-transparent bg-clip-text bg-gradient-to-r from-white to-gray-500"
                            >${frase[1]}</span
                        >
                    </h1>

                    <p
                        class="text-gray-300 text-lg md:text-2xl md:[@media(max-height:800px)]:text-xl max-w-xl leading-relaxed font-light border-l-4 border-sccp-gold pl-6 mt-6"
                    >
                        "Bem-vinda, Fiel!" <br />
                        ${
                            resumo
                                ? `${formatarNumero(resumo.jogos)} jogos, ${formatarNumero(resumo.temporadas)} temporadas: a história do Timão partida a partida.`
                                : 'O palco onde a loucura acontece e a história é escrita a cada jogo.'
                        }
                    </p>

                    <div class="flex flex-col sm:flex-row gap-4 pt-8 [@media(max-height:800px)]:pt-4">
                        <a href="/jogos" class="btn-hero-primary">Explorar Jogos</a>
                        <a href="/minha-historia" class="btn-hero-secondary">O Timão na sua vida</a>
                    </div>
                </div>
            </div>
        </section>
    `;
}

function barraNumeros(resumo) {
    const itens = [
        { valor: formatarNumero(resumo?.jogos), rotulo: 'Jogos no Acervo' },
        { valor: formatarNumero(resumo?.vitorias), rotulo: 'Vitórias' },
        { valor: formatarNumero(resumo?.golsPro), rotulo: 'Gols Marcados' },
        { valor: formatarPorcentagem(resumo?.aproveitamento), rotulo: 'Aproveitamento' },
    ];
    return html`
        <div class="bg-sccp-black border-y border-gray-900 relative z-20">
            <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
                <div class="grid grid-cols-2 md:grid-cols-4 gap-y-8 text-center md:divide-x divide-gray-800">
                    ${itens.map(
                        (item) => html`
                            <a href="/estatisticas" class="group hover:opacity-80 transition">
                                <p
                                    class="text-3xl md:text-5xl font-display font-bold text-white group-hover:text-gray-300 transition"
                                >
                                    ${item.valor}
                                </p>
                                <p class="text-[10px] md:text-xs text-gray-400 uppercase tracking-[0.2em] mt-2">
                                    ${item.rotulo}
                                </p>
                            </a>
                        `,
                    )}
                </div>
            </div>
        </div>
    `;
}

function ultimosJogos(recentes) {
    if (!recentes?.length) return '';
    return html`
        <section class="py-16">
            <div class="flex flex-wrap items-end justify-between mb-8 border-b border-gray-800 pb-4 gap-x-4 gap-y-2">
                <h3 class="text-3xl font-display font-bold text-white">Últimos Jogos</h3>
                ${linkAcao('/jogos', 'Ver todos')}
            </div>
            <div class="grid grid-cols-1 lg:grid-cols-2 gap-3">${recentes.map(gameCard)}</div>
        </section>
    `;
}

/** Chamada para o "O Timão na sua vida". */
function chamadaMinhaHistoria() {
    return html`
        <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <a
                href="/minha-historia"
                class="lg:col-span-2 group flex flex-col md:flex-row items-start md:items-center justify-between gap-6 rounded-xl border border-sccp-gold/40 bg-gradient-to-r from-sccp-gold/15 via-black to-black p-8 hover:border-gray-500 transition"
            >
                <div>
                    <p class="text-sccp-gold text-xs font-bold uppercase tracking-[0.2em]">Novo</p>
                    <h3 class="text-3xl md:text-4xl font-display font-bold text-white mt-2">O Timão na sua vida</h3>
                    <p class="text-gray-400 mt-2">
                        Quantos jogos, vitórias e títulos o Corinthians viveu com você? Descubra e poste no story.
                    </p>
                </div>
                <span class="btn-primary flex-shrink-0 group-hover:bg-sccp-goldHover">Descobrir agora →</span>
            </a>
            <a
                href="/quiz"
                class="group flex flex-col justify-between gap-4 rounded-xl border border-gray-800 bg-gray-900 p-8 hover:border-gray-600 transition"
            >
                <div>
                    <p class="text-gray-400 text-xs font-bold uppercase tracking-[0.2em]">Todo dia</p>
                    <h3 class="text-2xl font-display font-bold text-white mt-2">Quiz do Timão</h3>
                    <p class="text-gray-400 mt-2 text-sm">
                        5 perguntas sobre a história do Corinthians. Quanto você sabe?
                    </p>
                </div>
                <span
                    class="text-white text-sm font-bold uppercase tracking-wider group-hover:underline underline-offset-4"
                    >Jogar agora →</span
                >
            </a>
        </div>
    `;
}

/** Faixa com os principais troféus, levando à sala de troféus. */
const TROFEUS_HOME = [
    { nome: 'Mundial de Clubes', rotulo: 'Mundiais' },
    { nome: 'Libertadores da América', rotulo: 'Libertadores' },
    { nome: 'Campeonato Brasileiro', rotulo: 'Brasileiros' },
    { nome: 'Copa do Brasil', rotulo: 'Copas do Brasil' },
    { nome: 'Campeonato Paulista', rotulo: 'Paulistas' },
];

function salaDeTrofeus(titulos) {
    if (!titulos) return '';
    return html`
        <section class="pt-4 pb-12">
            <div class="flex flex-wrap items-end justify-between mb-8 border-b border-gray-800 pb-4 gap-x-4 gap-y-2">
                <h3 class="text-3xl font-display font-bold text-white">Sala de Troféus</h3>
                ${linkAcao('/titulos', 'Todos os títulos')}
            </div>
            <a href="/titulos" class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4 group">
                ${TROFEUS_HOME.map(
                    (t) => html`
                        <div
                            class="bg-gray-900 border border-gray-800 rounded-xl py-6 text-center group-hover:border-gray-600 transition"
                        >
                            <p class="text-4xl font-display font-bold text-sccp-gold">
                                ${totalDaCompeticao(titulos, t.nome)}
                            </p>
                            <p class="text-xs text-gray-400 uppercase font-bold tracking-wider mt-2">${t.rotulo}</p>
                        </div>
                    `,
                )}
            </a>
        </section>
    `;
}

function explorar() {
    return html`
        <section class="pb-8 pt-4">
            <div class="flex flex-wrap items-end justify-between mb-10 border-b border-gray-800 pb-4 gap-x-4 gap-y-2">
                <h3 class="text-3xl font-display font-bold text-white">Explorar o Museu</h3>
                ${linkAcao('/jogos', 'Ver arquivo completo')}
            </div>

            <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
                ${ATALHOS.map(
                    (a) => html`
                        <a
                            href="${a.href}"
                            class="group relative block bg-gray-900 h-80 rounded-xl overflow-hidden border border-gray-800 hover:border-gray-600 transition-all duration-500"
                        >
                            <div
                                class="absolute inset-0 ${a.imagem} bg-cover bg-center opacity-30 group-hover:opacity-50 group-hover:scale-110 transition duration-700"
                            ></div>
                            <div class="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-transparent"></div>
                            <div class="absolute bottom-0 left-0 p-8">
                                <h4 class="text-3xl font-bold text-white mb-2 font-display italic">${a.titulo}</h4>
                                <p class="text-gray-400 text-sm">${a.texto}</p>
                                <div
                                    class="mt-4 w-12 h-1 bg-white transform origin-left group-hover:scale-x-150 transition-transform"
                                ></div>
                            </div>
                        </a>
                    `,
                )}
            </div>
        </section>
    `;
}

export default {
    async render({ signal }) {
        const { resumo, recentes, titulos, hoje } = await carregarDados(signal);
        return {
            title: '',
            content: html`
                <div>
                    ${hero(resumo)} ${barraNumeros(resumo)} ${secaoHojeHome(hoje)} ${chamadaMinhaHistoria()}
                    ${ultimosJogos(recentes)} ${salaDeTrofeus(titulos)} ${explorar()} ${mapaDoSite()}
                </div>
            `,
        };
    },
};
