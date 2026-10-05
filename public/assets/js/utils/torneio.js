/**
 * Torneio mata-mata dos mini jogos (sem DOM, para dar para testar).
 *
 * O Corinthians sempre está na chave (posição 0) e o Palmeiras do outro
 * lado, para um possível Derby na final. Os jogos sem o Timão são simulados.
 */

import { vencedor } from './penaltis.js';

/** @typedef {{ a: string, b: string, placar?: { a: number, b: number }, vencedor?: string }} Confronto */
/**
 * @typedef {{
 *   tamanho: 4 | 8 | 16,
 *   rodadas: Confronto[][],
 *   rodada: number,
 *   status: 'jogando' | 'campeao' | 'eliminado',
 * }} Torneio
 */

export const TIMAO = 'corinthians';
export const TAMANHOS = [4, 8, 16];

const embaralhar = (lista, rnd) => {
    const a = [...lista];
    for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(rnd() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
};

/**
 * Sorteia a chave.
 * @param {4 | 8 | 16} tamanho
 * @param {string[]} times - possíveis adversários (sem o Corinthians)
 * @param {() => number} [rnd]
 * @returns {Torneio}
 */
export function criarTorneio(tamanho, times, rnd = Math.random) {
    if (!TAMANHOS.includes(tamanho)) throw new Error(`Tamanho inválido: ${tamanho}`);
    const outros = embaralhar(
        times.filter((t) => t !== TIMAO && t !== 'palmeiras'),
        rnd,
    ).slice(0, tamanho - 2);
    const meio = embaralhar(outros, rnd);
    const vagas = [TIMAO, ...meio.slice(0, tamanho - 2), 'palmeiras'];
    const primeira = [];
    for (let i = 0; i < tamanho; i += 2) primeira.push({ a: vagas[i], b: vagas[i + 1] });
    return { tamanho, rodadas: [primeira], rodada: 0, status: 'jogando' };
}

export const totalRodadas = (t) => Math.log2(t.tamanho);

/** Nome da fase: Oitavas, Quartas, Semifinal, Final. */
export function nomeFase(t, rodada = t.rodada) {
    const faltam = totalRodadas(t) - rodada;
    return ['Final', 'Semifinal', 'Quartas de final', 'Oitavas de final'][faltam - 1] ?? 'Fase';
}

/** Dificuldade da fase: 0 na primeira rodada, 1 na final. */
export const nivel = (t) => (totalRodadas(t) > 1 ? t.rodada / (totalRodadas(t) - 1) : 0);

/** Confronto do Timão na rodada atual (ou null, se já caiu ou terminou). */
export function jogoDoTimao(t) {
    if (t.status !== 'jogando') return null;
    const jogos = t.rodadas[t.rodada];
    const indice = jogos.findIndex((j) => j.a === TIMAO || j.b === TIMAO);
    if (indice < 0) return null;
    const j = jogos[indice];
    return { indice, adversario: j.a === TIMAO ? j.b : j.a };
}

/* ---------- placares simulados ---------- */

/** Disputa de pênaltis simulada (75% de conversão). */
export function simularPenaltis(rnd = Math.random) {
    const a = [];
    const b = [];
    while (!vencedor(a, b)) {
        if (a.length === b.length) a.push(rnd() < 0.75);
        else b.push(rnd() < 0.75);
    }
    return { a: a.filter(Boolean).length, b: b.filter(Boolean).length };
}

/** Paredão simulado: defesas x gols em 10 lances, sem empate. */
export function simularParedao(rnd = Math.random) {
    for (;;) {
        let a = 0;
        let b = 0;
        for (let i = 0; i < 10; i++) {
            const r = rnd();
            if (r < 0.45) a++;
            else if (r < 0.9) b++;
        }
        if (a !== b) return { a, b };
    }
}

/**
 * Registra o resultado do Timão, simula os outros jogos da rodada e monta a
 * próxima. Se o Timão cair, simula o resto para mostrar quem foi campeão.
 * @param {Torneio} t
 * @param {{ nos: number, eles: number }} placar - placar do jogo do Timão (sem empate)
 * @param {(rnd: () => number) => { a: number, b: number }} simular
 * @param {() => number} [rnd]
 * @returns {Torneio}
 */
export function registrarResultado(t, placar, simular, rnd = Math.random) {
    if (placar.nos === placar.eles) throw new Error('Mata-mata não tem empate');
    const novo = structuredClone(t);
    const meu = jogoDoTimao(novo);
    if (!meu) return novo;

    const fecharRodada = () => {
        const jogos = novo.rodadas[novo.rodada];
        for (const j of jogos) {
            if (j.vencedor) continue;
            let p = simular(rnd);
            if (p.a === p.b) p = { a: p.a + 1, b: p.b };
            j.placar = p;
            j.vencedor = p.a > p.b ? j.a : j.b;
        }
        if (novo.rodada === totalRodadas(novo) - 1) return false; // era a final
        const proxima = [];
        for (let i = 0; i < jogos.length; i += 2) {
            proxima.push({
                a: /** @type {string} */ (jogos[i].vencedor),
                b: /** @type {string} */ (jogos[i + 1].vencedor),
            });
        }
        novo.rodadas.push(proxima);
        novo.rodada++;
        return true;
    };

    const j = novo.rodadas[novo.rodada][meu.indice];
    const timaoEhA = j.a === TIMAO;
    j.placar = timaoEhA ? { a: placar.nos, b: placar.eles } : { a: placar.eles, b: placar.nos };
    const venceu = placar.nos > placar.eles;
    j.vencedor = venceu ? TIMAO : meu.adversario;

    const continua = fecharRodada();
    if (!venceu) {
        novo.status = 'eliminado';
        while (fecharRodada()) {
            /* simula até a final */
        }
    } else if (!continua) {
        novo.status = 'campeao';
    }
    return novo;
}

/** Campeão do torneio (quando já terminou). */
export function campeao(t) {
    const final = t.rodadas[totalRodadas(t) - 1]?.[0];
    return final?.vencedor ?? null;
}

/** Em que fase o Timão caiu (ou null). */
export function faseDaEliminacao(t) {
    for (let r = 0; r < t.rodadas.length; r++) {
        const j = t.rodadas[r].find((x) => x.a === TIMAO || x.b === TIMAO);
        if (j?.vencedor && j.vencedor !== TIMAO) return { rodada: r, por: j.vencedor, jogo: j };
    }
    return null;
}
