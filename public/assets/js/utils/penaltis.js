/**
 * Regras da Disputa de Pênaltis (sem DOM, para dar para testar).
 *
 * O gol é dividido em 6 zonas: 3 colunas (0 esquerda, 1 meio, 2 direita)
 * × 2 linhas (0 alto, 1 baixo). Zona = linha * 3 + coluna.
 */

export const ZONAS = [0, 1, 2, 3, 4, 5];
export const NOMES_ZONA = [
    'Ângulo esquerdo',
    'Alto, no meio',
    'Ângulo direito',
    'Baixo, à esquerda',
    'Rasteiro, no meio',
    'Baixo, à direita',
];

export const coluna = (z) => z % 3;
export const linha = (z) => Math.floor(z / 3);

/** Chance de a bola ir para fora ou na trave, por zona (mirar no ângulo é arriscado). */
const CHANCE_ERRO = [0.17, 0.09, 0.17, 0.06, 0.02, 0.06];
/** No ângulo, mesmo pulando certo, o goleiro nem sempre alcança. */
const ALCANCE_ANGULO = 0.7;

/** Onde o batedor do computador costuma bater (mais nos cantos de baixo). */
const PESO_CHUTE_CPU = [0.14, 0.12, 0.14, 0.22, 0.16, 0.22];
/** Para onde o goleiro do computador costuma pular (mais nos cantos de baixo). */
const PESO_PULO_CPU = [0.15, 0.1, 0.15, 0.24, 0.12, 0.24];

/**
 * Sorteia uma zona com pesos.
 * @param {number[]} pesos
 * @param {() => number} [aleatorio]
 */
export function sortearZona(pesos, aleatorio = Math.random) {
    const total = pesos.reduce((a, b) => a + b, 0);
    let r = aleatorio() * total;
    for (let z = 0; z < pesos.length; z++) {
        r -= pesos[z];
        if (r < 0) return z;
    }
    return pesos.length - 1;
}

export const chuteCpu = (aleatorio = Math.random) => sortearZona(PESO_CHUTE_CPU, aleatorio);
export const puloCpu = (aleatorio = Math.random) => sortearZona(PESO_PULO_CPU, aleatorio);

/**
 * Resultado de uma cobrança.
 * @param {number} chute - zona onde a bola foi
 * @param {number} pulo - zona para onde o goleiro pulou
 * @param {() => number} [aleatorio]
 * @returns {'gol' | 'defesa' | 'fora' | 'trave'}
 */
export function cobranca(chute, pulo, aleatorio = Math.random) {
    if (aleatorio() < CHANCE_ERRO[chute]) return aleatorio() < 0.5 ? 'trave' : 'fora';
    const mesmaColuna = coluna(chute) === coluna(pulo);
    // No meio, o goleiro alcança alto e baixo; nos lados, precisa acertar a altura
    const alcancou = mesmaColuna && (coluna(chute) === 1 || linha(chute) === linha(pulo));
    if (!alcancou) return 'gol';
    const angulo = linha(chute) === 0 && coluna(chute) !== 1;
    return angulo && aleatorio() >= ALCANCE_ANGULO ? 'gol' : 'defesa';
}

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
