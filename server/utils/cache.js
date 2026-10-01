/**
 * Cache em memória com expiração (TTL).
 *
 * Os dados do acervo são históricos e mudam raramente; agregações pesadas
 * (recordes, sequências) podem ser reaproveitadas por alguns minutos.
 */

const DEFAULT_TTL_MS = 5 * 60 * 1000;

/** @type {Map<string, { expiraEm: number, valor: Promise<unknown> }>} */
const entradas = new Map();

/**
 * Retorna o valor em cache ou executa `carregar` e guarda o resultado.
 * Promessas rejeitadas não ficam em cache.
 *
 * @template T
 * @param {string} chave
 * @param {() => Promise<T>} carregar
 * @param {number} [ttlMs]
 * @returns {Promise<T>}
 */
export function comCache(chave, carregar, ttlMs = DEFAULT_TTL_MS) {
    const agora = Date.now();
    const existente = entradas.get(chave);
    if (existente && existente.expiraEm > agora) {
        return /** @type {Promise<T>} */ (existente.valor);
    }

    const valor = carregar().catch((err) => {
        entradas.delete(chave);
        throw err;
    });
    entradas.set(chave, { expiraEm: agora + ttlMs, valor });
    return valor;
}

/** Limpa todo o cache (útil em testes). */
export function limparCache() {
    entradas.clear();
}
