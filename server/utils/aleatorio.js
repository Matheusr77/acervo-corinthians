/**
 * Números pseudoaleatórios com semente: a mesma data gera sempre o mesmo quiz.
 */

/**
 * Hash simples (FNV-1a) de um texto para um inteiro de 32 bits.
 * @param {string} texto
 */
export function hashTexto(texto) {
    let h = 0x811c9dc5;
    for (let i = 0; i < texto.length; i += 1) {
        h ^= texto.charCodeAt(i);
        h = Math.imul(h, 0x01000193);
    }
    return h >>> 0;
}

/**
 * Gerador mulberry32: devolve uma função que retorna números em [0, 1).
 * @param {number} semente
 */
export function criarAleatorio(semente) {
    let a = semente >>> 0;
    const proximo = () => {
        a = (a + 0x6d2b79f5) >>> 0;
        let t = a;
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
    return {
        proximo,
        /** @template T @param {T[]} lista @returns {T} */
        escolher: (lista) => lista[Math.floor(proximo() * lista.length)],
        /** @template T @param {T[]} lista @returns {T[]} */
        embaralhar: (lista) => {
            const copia = [...lista];
            for (let i = copia.length - 1; i > 0; i -= 1) {
                const j = Math.floor(proximo() * (i + 1));
                [copia[i], copia[j]] = [copia[j], copia[i]];
            }
            return copia;
        },
    };
}
