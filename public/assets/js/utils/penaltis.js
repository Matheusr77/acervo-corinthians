/**
 * Regras da Disputa de Pênaltis (sem DOM, para dar para testar).
 *
 * Posições no gol em coordenadas normalizadas:
 *   u = 0 trave esquerda … 1 trave direita
 *   v = 0 travessão … 1 chão
 * Fora desse intervalo, a bola saiu.
 */

/** @typedef {{ u: number, v: number }} Ponto */
/** @typedef {'gol' | 'defesa' | 'fora' | 'trave'} Resultado */

/** Força ideal do chute (barra verde). Acima: bola sobe. Abaixo: bola fraca. */
export const FORCA_IDEAL = { min: 0.5, max: 0.78 };
const FORCA_FRACA = 0.32;
/** Espessura da trave/travessão, em unidades do gol. */
const TRAVE = 0.022;
const TRAVESSAO = 0.035;
/** Alcance do goleiro (meio-eixos da elipse em torno do ponto do pulo). */
const ALCANCE = { u: 0.16, v: 0.46 };
const ALCANCE_PARADO = { u: 0.12, v: 0.5 };
/** O goleiro não alcança o rente da trave nem pula para fora do gol. */
const PULO_MIN = 0.12;
const PULO_MAX = 0.88;

const limitar = (x, min, max) => Math.min(max, Math.max(min, x));
/** Número aproximadamente normal (média 0, desvio 1). */
const normal = (aleatorio) => (aleatorio() + aleatorio() + aleatorio() - 1.5) * 2;

/**
 * Onde a bola vai de fato, a partir da mira e da força.
 * @param {Ponto} mira
 * @param {number} forca - 0 a 1 (posição em que a barra parou)
 * @param {() => number} [aleatorio]
 * @returns {Ponto}
 */
export function trajetoria(mira, forca, aleatorio = Math.random) {
    const foraDaFaixa =
        forca > FORCA_IDEAL.max ? forca - FORCA_IDEAL.max : forca < FORCA_IDEAL.min ? FORCA_IDEAL.min - forca : 0;
    const erro = 0.035 + foraDaFaixa * 0.5;
    const subida = forca > FORCA_IDEAL.max ? (forca - FORCA_IDEAL.max) * 1.6 : 0;
    return {
        u: mira.u + normal(aleatorio) * erro,
        v: Math.min(0.97, mira.v + normal(aleatorio) * erro * 0.8 - subida),
    };
}

/**
 * Resultado da cobrança.
 * @param {Ponto} bola - onde a bola cruza a linha do gol (saída de trajetoria)
 * @param {Ponto} pulo - para onde o goleiro pulou
 * @param {number} forca
 * @returns {Resultado}
 */
export function resultadoCobranca(bola, pulo, forca) {
    const { u, v } = bola;
    if (u < -TRAVE || u > 1 + TRAVE || v < -TRAVESSAO) return 'fora';
    if (u <= TRAVE || u >= 1 - TRAVE || v <= TRAVESSAO) return 'trave';

    const p = { u: limitar(pulo.u, PULO_MIN, PULO_MAX), v: limitar(pulo.v, 0.15, 0.95) };
    const parado = Math.abs(p.u - 0.5) < 0.08;
    const base = parado ? ALCANCE_PARADO : ALCANCE;
    const fator = forca < FORCA_FRACA ? 1.4 : 1; // bola fraca dá tempo ao goleiro
    const du = (u - p.u) / (base.u * fator);
    const dv = (v - p.v) / (base.v * fator);
    return du * du + dv * dv <= 1 ? 'defesa' : 'gol';
}

/**
 * Batida do computador: escolhe um canto (às vezes o meio) e uma força.
 * @param {() => number} [aleatorio]
 * @param {number} [nivel] - 0 a 1 (fases finais do torneio): mais canto, menos erro de força
 */
export function chuteCpu(aleatorio = Math.random, nivel = 0) {
    const canto = 0.84 + nivel * 0.1;
    const r = aleatorio();
    const u =
        r < canto / 2
            ? 0.06 + aleatorio() * (0.22 - nivel * 0.06)
            : r < canto
              ? 0.72 + nivel * 0.06 + aleatorio() * (0.22 - nivel * 0.06)
              : 0.38 + aleatorio() * 0.24;
    const v = 0.12 + aleatorio() * 0.8;
    const forca = aleatorio() < 0.12 * (1 - nivel * 0.7) ? 0.8 + aleatorio() * 0.15 : 0.45 + aleatorio() * 0.33;
    return { mira: { u, v }, forca };
}

/**
 * Pulo do goleiro do computador: escolhe um lado (às vezes fica no meio).
 * Nas fases finais, às vezes "lê" o lado da sua mira.
 * @param {() => number} [aleatorio]
 * @param {number} [nivel]
 * @param {Ponto | null} [mira]
 */
export function puloCpu(aleatorio = Math.random, nivel = 0, mira = null) {
    if (mira && aleatorio() < nivel * 0.3) {
        return { u: Math.min(0.88, Math.max(0.12, mira.u + (aleatorio() - 0.5) * 0.2)), v: 0.3 + aleatorio() * 0.5 };
    }
    const r = aleatorio();
    const u = r < 0.45 ? 0.14 + aleatorio() * 0.2 : r < 0.9 ? 0.66 + aleatorio() * 0.2 : 0.5;
    return { u, v: 0.3 + aleatorio() * 0.5 };
}

/**
 * Força da barra no instante t (vai e volta, ~1,1 s por ciclo).
 * @param {number} ms - tempo desde que a barra apareceu
 */
export const forcaNoTempo = (ms) => (1 - Math.cos((ms / 1100) * Math.PI * 2)) / 2;

/**
 * A disputa acabou? Segue a regra oficial: 5 cobranças para cada lado
 * (encerra antes se um não puder mais alcançar o outro) e, empatando,
 * alternadas até um converter e o outro não.
 * @param {boolean[]} nossos - acertos do Corinthians, em ordem
 * @param {boolean[]} deles - acertos do rival, em ordem
 * @returns {'corinthians' | 'rival' | null}
 */
export function vencedor(nossos, deles) {
    const gN = nossos.filter(Boolean).length;
    const gD = deles.filter(Boolean).length;
    const n = nossos.length;
    const d = deles.length;
    if (n <= 5 && d <= 5) {
        const restaN = 5 - n;
        const restaD = 5 - d;
        if (gN > gD + restaD) return 'corinthians';
        if (gD > gN + restaN) return 'rival';
        if (n < 5 || d < 5) return null;
    }
    // Morte súbita: decide quando os dois já bateram o mesmo número de vezes
    if (n === d && gN !== gD) return gN > gD ? 'corinthians' : 'rival';
    return null;
}

/** Quadradinhos para compartilhar: ✅ gol, ❌ perdeu. */
export const emojis = (cobrancas) => cobrancas.map((g) => (g ? '✅' : '❌')).join('');
