/**
 * Peças comuns dos mini jogos: uniformes dos times (só cores, nada de
 * escudos), retrospecto de cada jogo contra cada rival (no navegador) e o
 * seletor de rival.
 */

import { html } from '../core/html.js';
import { botaoCompartilhar } from './compartilhar.js';
import { campeao, faseDaEliminacao, jogoDoTimao, nomeFase } from '../utils/torneio.js';

/** Uniformes (só cores; nada de escudos). */
export const TIMAO = {
    batedor: { camisa: '#f4f4f4', numero: '#111111', calcao: '#111111', meiao: '#111111', nome: 'FIEL', num: '10' },
    goleiro: { camisa: '#1f1f1f', detalhe: '#d4af37', calcao: '#111111', meiao: '#1f1f1f' },
};
export const RIVAIS = {
    palmeiras: {
        nome: 'Palmeiras',
        classico: 'Derby',
        batedor: {
            camisa: '#0f7a3c',
            numero: '#ffffff',
            calcao: '#f4f4f4',
            meiao: '#0f7a3c',
            nome: 'SEM',
            num: 'MUNDIAL',
        },
        goleiro: { camisa: '#2a3f94', detalhe: '#ffffff', calcao: '#1b2a66', meiao: '#2a3f94' },
    },
    'sao-paulo': {
        nome: 'São Paulo',
        classico: 'Majestoso',
        batedor: {
            camisa: '#f5f5f5',
            faixa: ['#d6001c', '#f5f5f5', '#111111'],
            numero: '#111111',
            calcao: '#f5f5f5',
            meiao: '#f5f5f5',
            num: '9',
        },
        goleiro: { camisa: '#e8661c', detalhe: '#111111', calcao: '#111111', meiao: '#e8661c' },
    },
    santos: {
        nome: 'Santos',
        classico: 'Clássico Alvinegro',
        batedor: { camisa: '#f5f5f5', numero: '#111111', calcao: '#f5f5f5', meiao: '#f5f5f5', num: '9' },
        goleiro: { camisa: '#5a36a6', detalhe: '#ffffff', calcao: '#2b1a55', meiao: '#5a36a6' },
    },
};

/** Monta um time a partir das cores (para o torneio). */
const time = (nome, batedor, goleiro) => ({
    nome,
    batedor: { numero: '#f4f4f4', num: String(7 + (nome.length % 5)), ...batedor },
    goleiro: { detalhe: '#ffffff', calcao: '#111111', ...goleiro },
});
const V = (...cores) => ({ tipo: 'v', cores });
const Hz = (...cores) => ({ tipo: 'h', cores });
const D = (cor) => ({ tipo: 'd', cores: [cor] });
const BR = '#f4f4f4';
const PT = '#111111';

/** Todos os times dos torneios (os três clássicos + outros clubes do Brasil). */
export const TIMES = {
    ...RIVAIS,
    flamengo: time(
        'Flamengo',
        { camisa: '#c8102e', padrao: Hz('#c8102e', PT), calcao: BR, meiao: PT },
        { camisa: '#f2c500', meiao: '#f2c500', detalhe: PT },
    ),
    vasco: time('Vasco', { camisa: PT, padrao: D(BR), calcao: PT, meiao: PT }, { camisa: '#1e8a4c', meiao: '#1e8a4c' }),
    fluminense: time(
        'Fluminense',
        { camisa: '#7a1032', padrao: V('#7a1032', BR, '#00613c', BR), calcao: BR, meiao: BR },
        { camisa: '#2b2b2b', meiao: '#2b2b2b', detalhe: '#7a1032' },
    ),
    botafogo: time(
        'Botafogo',
        { camisa: PT, padrao: V(PT, BR), calcao: PT, meiao: '#8a8a8a' },
        { camisa: '#e8661c', meiao: '#e8661c' },
    ),
    gremio: time(
        'Grêmio',
        { camisa: '#0d80bf', padrao: V('#0d80bf', PT, '#0d80bf', BR), calcao: PT, meiao: BR },
        { camisa: '#3a3a3a', meiao: '#3a3a3a', detalhe: '#0d80bf' },
    ),
    internacional: time(
        'Internacional',
        { camisa: '#c8102e', calcao: BR, meiao: '#c8102e' },
        { camisa: '#0f5aa8', meiao: '#0f5aa8' },
    ),
    'atletico-mg': time(
        'Atlético-MG',
        { camisa: PT, padrao: V(PT, BR), calcao: PT, meiao: BR },
        { camisa: '#f2c500', meiao: '#f2c500', detalhe: PT },
    ),
    cruzeiro: time('Cruzeiro', { camisa: '#1a3d9e', calcao: BR, meiao: BR }, { camisa: '#e8661c', meiao: '#e8661c' }),
    bahia: time(
        'Bahia',
        { camisa: BR, faixa: ['#c8102e', '#1a3d9e'], numero: '#1a3d9e', calcao: '#1a3d9e', meiao: BR },
        { camisa: PT, meiao: PT },
    ),
    'athletico-pr': time(
        'Athletico-PR',
        { camisa: '#c8102e', padrao: Hz('#c8102e', PT), calcao: PT, meiao: '#c8102e' },
        { camisa: '#2b2b2b', meiao: '#2b2b2b', detalhe: '#c8102e' },
    ),
    fortaleza: time(
        'Fortaleza',
        { camisa: '#1a3d9e', padrao: Hz('#c8102e', '#1a3d9e', BR), calcao: '#1a3d9e', meiao: BR },
        { camisa: PT, meiao: PT },
    ),
    sport: time(
        'Sport',
        { camisa: '#c8102e', padrao: Hz(PT, '#c8102e'), calcao: PT, meiao: PT },
        { camisa: '#f2c500', meiao: '#f2c500', detalhe: PT },
    ),
    'ponte-preta': time(
        'Ponte Preta',
        { camisa: BR, padrao: D(PT), numero: PT, calcao: PT, meiao: BR },
        { camisa: '#e8661c', meiao: '#e8661c' },
    ),
    guarani: time('Guarani', { camisa: '#0b7a3e', calcao: BR, meiao: BR }, { camisa: PT, meiao: PT }),
    portuguesa: time(
        'Portuguesa',
        { camisa: '#c8102e', faixa: ['#0b7a3e', '#0b7a3e'], calcao: BR, meiao: '#c8102e' },
        { camisa: '#1a3d9e', meiao: '#1a3d9e' },
    ),
    goias: time('Goiás', { camisa: '#0b7a3e', calcao: BR, meiao: '#0b7a3e' }, { camisa: PT, meiao: PT }),
    coritiba: time(
        'Coritiba',
        { camisa: BR, faixa: ['#0b7a3e', '#0b7a3e'], numero: PT, calcao: PT, meiao: BR },
        { camisa: '#e8661c', meiao: '#e8661c' },
    ),
};

/* ---------- retrospecto (localStorage) ---------- */

/** @param {string} chave */
export function lerRetrospecto(chave) {
    try {
        return JSON.parse(localStorage.getItem(chave) ?? '{}') ?? {};
    } catch {
        return {};
    }
}

/**
 * @param {string} chave
 * @param {string} rival
 * @param {boolean} venceu
 */
export function somarRetrospecto(chave, rival, venceu) {
    const r = lerRetrospecto(chave);
    const atual = r[rival] ?? { v: 0, d: 0 };
    r[rival] = { v: atual.v + (venceu ? 1 : 0), d: atual.d + (venceu ? 0 : 1) };
    try {
        localStorage.setItem(chave, JSON.stringify(r));
    } catch {
        /* sem armazenamento: só não lembra depois */
    }
    return r[rival];
}

export const textoRetrospecto = (r) =>
    r ? `${r.v} ${r.v === 1 ? 'vitória' : 'vitórias'} e ${r.d} ${r.d === 1 ? 'derrota' : 'derrotas'}` : '';

/** Sorteia um rival quando a pessoa escolhe "Sortear". */
export const resolverRival = (slug) =>
    slug === 'sortear' || !RIVAIS[slug] ? Object.keys(RIVAIS)[Math.floor(Math.random() * 3)] : slug;

/**
 * Cards para escolher o rival.
 * @param {string} chave - chave do retrospecto do jogo
 * @param {string} intro
 */
export function escolhaDeRival(chave, intro) {
    const retro = lerRetrospecto(chave);
    return html`
        <p class="text-gray-300">${intro}</p>
        <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
            ${Object.entries(RIVAIS).map(
                ([slug, r]) => html`
                    <button
                        type="button"
                        data-rival="${slug}"
                        class="group text-left bg-sccp-gray border border-gray-800 hover:border-sccp-gold rounded-xl p-5 transition"
                    >
                        <span
                            class="block h-1.5 w-12 rounded-full mb-4"
                            style="background: linear-gradient(90deg, ${r.batedor.camisa} 50%, ${
                                r.batedor.faixa?.[0] ?? r.batedor.calcao
                            } 50%)"
                        ></span>
                        <span class="block text-xs font-bold uppercase tracking-[0.2em] text-sccp-gold"
                            >${r.classico}</span
                        >
                        <span class="block text-2xl font-display font-bold text-white mt-1">${r.nome}</span>
                        <span class="block text-sm text-gray-400 mt-2"
                            >${retro[slug] ? `Você: ${textoRetrospecto(retro[slug])}` : 'Ainda não jogou'}</span
                        >
                    </button>
                `,
            )}
        </div>
        <button type="button" data-rival="sortear" class="btn-ghost text-sm">🎲 Sortear o rival</button>
    `;
}

/* ---------- menu: jogo rápido ou torneio ---------- */

/** Títulos de torneio por tamanho, guardados no navegador. */
export function lerTitulos(jogo) {
    try {
        return JSON.parse(localStorage.getItem(`acervo:${jogo}:titulos`) ?? '{}') ?? {};
    } catch {
        return {};
    }
}

export function somarTitulo(jogo, tamanho) {
    const t = lerTitulos(jogo);
    t[tamanho] = (t[tamanho] ?? 0) + 1;
    try {
        localStorage.setItem(`acervo:${jogo}:titulos`, JSON.stringify(t));
    } catch {
        /* ignora */
    }
}

/**
 * Tela inicial do jogo: Jogo rápido ou Torneio (4, 8 ou 16 times).
 * @param {string} jogo - 'penaltis' | 'paredao'
 */
export function telaModo(jogo) {
    const titulos = lerTitulos(jogo);
    const total = Object.values(titulos).reduce((a, b) => a + b, 0);
    const opcoes = [
        { n: 4, fase: 'Semifinal e final' },
        { n: 8, fase: 'Quartas, semi e final' },
        { n: 16, fase: 'Oitavas até a final' },
    ];
    return html`
        <div class="grid grid-cols-1 md:grid-cols-2 gap-5">
            <button
                type="button"
                data-modo="rapido"
                class="group text-left rounded-2xl border border-gray-800 bg-sccp-gray hover:border-sccp-gold p-6 transition flex flex-col gap-3"
            >
                <span class="text-4xl" aria-hidden="true">⚡</span>
                <span class="text-2xl font-display font-black text-white">Jogo rápido</span>
                <span class="text-gray-400">Um clássico: Palmeiras, São Paulo ou Santos.</span>
                <span
                    class="mt-auto inline-flex w-fit items-center gap-2 rounded-lg bg-white/10 px-4 py-2 text-sm font-bold text-white group-hover:bg-sccp-gold group-hover:text-black transition"
                    >Escolher rival →</span
                >
            </button>
            <div
                class="rounded-2xl border border-sccp-gold/40 bg-gradient-to-br from-sccp-gold/10 to-transparent p-6 flex flex-col gap-3"
            >
                <span class="text-4xl" aria-hidden="true">🏆</span>
                <span class="text-2xl font-display font-black text-white">Torneio mata-mata</span>
                <span class="text-gray-400">
                    O Timão contra os grandes do Brasil, um jogo por fase, até a taça.
                    ${total ? html`<strong class="text-sccp-gold">Você já ergueu ${total} ${total === 1 ? 'taça' : 'taças'}.</strong>` : ''}
                </span>
                <div class="mt-auto grid grid-cols-3 gap-2">
                    ${opcoes.map(
                        (o) => html`
                            <button
                                type="button"
                                data-torneio="${o.n}"
                                class="rounded-xl border border-gray-700 bg-black/30 hover:border-sccp-gold hover:bg-sccp-gold/10 px-2 py-3 text-center transition"
                            >
                                <span class="block text-2xl font-display font-black text-white">${o.n}</span>
                                <span class="block text-[11px] font-bold uppercase tracking-wider text-gray-400"
                                    >times</span
                                >
                                <span class="block text-[11px] text-gray-500 mt-1 leading-tight">${o.fase}</span>
                                ${
                                    titulos[o.n]
                                        ? html`<span class="block text-xs text-sccp-gold mt-1"
                                              >🏆 ×${titulos[o.n]}</span
                                          >`
                                        : ''
                                }
                            </button>
                        `,
                    )}
                </div>
            </div>
        </div>
    `;
}

/* ---------- chaveamento ---------- */

const corDoTime = (slug) => (slug === 'corinthians' ? '#f4f4f4' : (TIMES[slug]?.batedor.camisa ?? '#888'));
const nomeDoTime = (slug) => (slug === 'corinthians' ? 'Corinthians' : (TIMES[slug]?.nome ?? slug));

function linhaTime(slug, gols, venceu, definido) {
    const timao = slug === 'corinthians';
    return html`
        <div
            class="flex items-center gap-2 px-2.5 py-1.5 ${timao ? 'bg-sccp-gold/15' : ''} ${definido && !venceu ? 'opacity-50' : ''}"
        >
            <span
                class="w-2.5 h-2.5 rounded-full flex-shrink-0 border border-white/20"
                style="background:${corDoTime(slug)}"
            ></span>
            <span
                class="flex-1 truncate text-sm ${venceu ? 'font-bold text-white' : 'text-gray-300'} ${timao ? 'text-sccp-gold' : ''}"
                >${nomeDoTime(slug)}</span
            >
            <span class="text-sm tabular-nums ${venceu ? 'font-bold text-white' : 'text-gray-400'}">${gols ?? ''}</span>
        </div>
    `;
}

/**
 * Chave do torneio, uma coluna por fase.
 * @param {import('../utils/torneio.js').Torneio} t
 * @param {(t: any, rodada: number) => string} nomeFase
 */
export function chaveamento(t, nomeFase) {
    const rodadas = Math.log2(t.tamanho);
    const colunas = [];
    for (let r = 0; r < rodadas; r++) {
        const jogos = t.rodadas[r] ?? Array.from({ length: t.tamanho / 2 ** (r + 1) }, () => null);
        colunas.push(html`
            <div class="flex flex-col min-w-[170px] flex-1">
                <p class="text-[11px] font-bold uppercase tracking-wider text-gray-400 mb-2">${nomeFase(t, r)}</p>
                <div class="flex flex-col justify-around flex-1 gap-3">
                    ${jogos.map((j) =>
                        j
                            ? html`<div
                                  class="rounded-lg border ${j.a === 'corinthians' || j.b === 'corinthians' ? 'border-sccp-gold/60' : 'border-gray-800'} bg-sccp-gray overflow-hidden divide-y divide-gray-800"
                              >
                                  ${linhaTime(j.a, j.placar?.a, j.vencedor === j.a, !!j.vencedor)}
                                  ${linhaTime(j.b, j.placar?.b, j.vencedor === j.b, !!j.vencedor)}
                              </div>`
                            : html`<div
                                  class="rounded-lg border border-dashed border-gray-800 px-2.5 py-3 text-xs text-gray-500"
                              >
                                  A definir
                              </div>`,
                    )}
                </div>
            </div>
        `);
    }
    return html`<div class="overflow-x-auto -mx-4 px-4 pb-2">
        <div class="flex gap-4 min-w-max md:min-w-0">${colunas}</div>
    </div>`;
}

/* ---------- tela cheia ---------- */

/**
 * Liga o botão de tela cheia ([data-acao="tela-cheia"]) para `raiz`.
 * Usa a tela cheia do navegador e, onde ela não existe (iPhone), amplia com CSS.
 * Os canvas com data-aspecto são encaixados no espaço disponível.
 * @param {HTMLElement} raiz
 */
export function ligarTelaCheia(raiz) {
    const ampliado = () => raiz.classList.contains('jogo-ampliado');

    function encaixar() {
        for (const canvas of /** @type {NodeListOf<HTMLCanvasElement>} */ (
            raiz.querySelectorAll('canvas[data-aspecto]')
        )) {
            if (!ampliado()) {
                canvas.style.width = '';
                continue;
            }
            const palco = /** @type {HTMLElement} */ (canvas.parentElement);
            const aspecto = Number(canvas.dataset.aspecto) || 1.6;
            const largura = Math.min(palco.clientWidth, palco.clientHeight * aspecto);
            canvas.style.width = `${Math.floor(largura)}px`;
        }
        for (const b of raiz.querySelectorAll('[data-acao="tela-cheia"]')) {
            b.textContent = ampliado() ? '✕ Sair da tela cheia' : '⛶ Tela cheia';
        }
    }

    function marcar(ligado) {
        raiz.classList.toggle('jogo-ampliado', ligado);
        document.documentElement.classList.toggle('overflow-hidden', ligado);
        requestAnimationFrame(encaixar);
    }

    async function alternar() {
        if (ampliado()) {
            if (document.fullscreenElement) await document.exitFullscreen().catch(() => {});
            marcar(false);
            return;
        }
        marcar(true);
        if (raiz.requestFullscreen) {
            try {
                await raiz.requestFullscreen({ navigationUI: 'hide' });
                // No celular, deita a tela (onde o navegador deixa)
                await /** @type {any} */ (screen.orientation)?.lock?.('landscape').catch(() => {});
            } catch {
                /* sem tela cheia de verdade: fica o modo ampliado */
            }
        }
    }

    const aoClicar = (e) => {
        if (/** @type {HTMLElement} */ (e.target).closest('[data-acao="tela-cheia"]')) alternar();
    };
    const aoMudar = () => {
        if (!document.fullscreenElement && ampliado()) marcar(false);
        else encaixar();
    };
    const aoTeclar = (e) => {
        if (e.key === 'Escape' && ampliado() && !document.fullscreenElement) marcar(false);
    };
    raiz.addEventListener('click', aoClicar);
    document.addEventListener('fullscreenchange', aoMudar);
    window.addEventListener('resize', encaixar);
    document.addEventListener('keydown', aoTeclar);
    const observador = new MutationObserver(() => requestAnimationFrame(encaixar));
    observador.observe(raiz, { childList: true, subtree: true });

    return () => {
        raiz.removeEventListener('click', aoClicar);
        document.removeEventListener('fullscreenchange', aoMudar);
        window.removeEventListener('resize', encaixar);
        document.removeEventListener('keydown', aoTeclar);
        observador.disconnect();
        if (document.fullscreenElement === raiz) document.exitFullscreen().catch(() => {});
        document.documentElement.classList.remove('overflow-hidden');
    };
}

/* ---------- tela do torneio ---------- */

/** "na final", "na semifinal", "nas quartas de final", "nas oitavas de final". */
const naFase = (fase) =>
    fase === 'Final' || fase === 'Semifinal' ? `na ${fase.toLowerCase()}` : `nas ${fase.toLowerCase()}`;

/**
 * Situação do torneio: próximo jogo (ou taça / eliminação) e a chave.
 * @param {import('../utils/torneio.js').Torneio} t
 * @param {{ nomeJogo: string, ultimo?: { venceu: boolean, texto: string } | null }} o
 */
export function telaTorneio(t, { nomeJogo, ultimo = null }) {
    const proximo = jogoDoTimao(t);
    const queda = faseDaEliminacao(t);
    let destaque;
    if (t.status === 'campeao') {
        destaque = html`
            <section
                class="rounded-2xl border border-sccp-gold/70 bg-gradient-to-br from-sccp-gold/25 via-sccp-gold/5 to-transparent p-6 md:p-8 text-center space-y-3"
            >
                <p class="text-6xl" aria-hidden="true">🏆</p>
                <p class="text-xs font-bold uppercase tracking-[0.25em] text-sccp-gold">É campeão!</p>
                <p class="text-3xl md:text-5xl font-display font-black text-white leading-tight">
                    O Timão levou o torneio
                </p>
                ${ultimo ? html`<p class="text-gray-300">Final: ${ultimo.texto}</p>` : ''}
                <div class="flex flex-wrap justify-center gap-3 pt-2">
                    ${botaoCompartilhar('compartilhar-torneio', 'Compartilhar a taça')}
                    <button type="button" data-acao="novo-torneio" class="btn-primary">Novo torneio</button>
                    <button type="button" data-acao="menu" class="btn-secondary">Menu</button>
                </div>
            </section>
        `;
    } else if (t.status === 'eliminado' && queda) {
        destaque = html`
            <section
                class="rounded-2xl border border-gray-700 bg-gradient-to-br from-gray-900 to-black p-6 md:p-8 text-center space-y-3"
            >
                <p class="text-xs font-bold uppercase tracking-[0.25em] text-gray-400">Fim da linha</p>
                <p class="text-3xl md:text-4xl font-display font-black text-white leading-tight">
                    Eliminado ${naFase(nomeFase(t, queda.rodada))}
                </p>
                ${ultimo ? html`<p class="text-gray-300">${ultimo.texto}</p>` : ''}
                <p class="text-sm text-gray-400">Campeão: ${nomeDoTime(/** @type {string} */ (campeao(t)))}</p>
                <div class="flex flex-wrap justify-center gap-3 pt-2">
                    ${botaoCompartilhar('compartilhar-torneio', 'Compartilhar')}
                    <button type="button" data-acao="novo-torneio" class="btn-primary">Tentar de novo</button>
                    <button type="button" data-acao="menu" class="btn-secondary">Menu</button>
                </div>
            </section>
        `;
    } else if (proximo) {
        destaque = html`
            <section class="rounded-2xl border border-sccp-gold/40 bg-sccp-gray p-6 md:p-8 space-y-4">
                ${
                    ultimo
                        ? html`<p class="text-sm font-bold text-green-400">✓ Classificado! ${ultimo.texto}</p>`
                        : html`<p class="text-sm text-gray-400">Chave sorteada. Bora, Timão!</p>`
                }
                <p class="text-xs font-bold uppercase tracking-[0.25em] text-sccp-gold">${nomeFase(t)}</p>
                <div class="flex items-center justify-center gap-4 md:gap-8 text-center">
                    <span class="flex-1 text-2xl md:text-4xl font-display font-black text-white">Corinthians</span>
                    <span class="text-gray-500 font-bold">x</span>
                    <span class="flex-1 text-2xl md:text-4xl font-display font-black text-white"
                        >${nomeDoTime(proximo.adversario)}</span
                    >
                </div>
                <div class="flex flex-wrap justify-center gap-3">
                    <button type="button" data-acao="jogar-torneio" class="btn-primary text-base px-8">Jogar</button>
                    <button type="button" data-acao="menu" class="btn-ghost text-sm">Abandonar torneio</button>
                </div>
            </section>
        `;
    }
    return html`
        <div class="space-y-6">
            <p class="text-sm font-bold text-gray-400">🏆 Torneio de ${nomeJogo} · ${t.tamanho} times</p>
            ${destaque}
            <section class="space-y-3">
                <h3 class="text-sm font-bold uppercase tracking-[0.2em] text-gray-400">Chaveamento</h3>
                ${chaveamento(t, nomeFase)}
            </section>
        </div>
    `;
}

/** Texto para compartilhar o torneio. */
export function textoTorneio(t, nomeJogo, ultimoTexto) {
    if (t.status === 'campeao') {
        return `🏆 Campeão do Torneio de ${nomeJogo} do Acervo Corinthians (${t.tamanho} times)!\nFinal: ${ultimoTexto}\nVai encarar?\n`;
    }
    const q = faseDaEliminacao(t);
    const fase = q ? nomeFase(t, q.rodada) : '';
    return `Caí ${naFase(fase)} do Torneio de ${nomeJogo} 😤\n${ultimoTexto}\nMe ajuda na revanche?\n`;
}
