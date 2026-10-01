/**
 * Cliente da API REST do acervo.
 * Centraliza URLs, tratamento de erro e cache das respostas estáticas.
 */

export class ApiError extends Error {
    /**
     * @param {number} status
     * @param {string} message
     */
    constructor(status, message) {
        super(message);
        this.name = 'ApiError';
        this.status = status;
        /** @type {Record<string, string> | null} erros por campo (formulários) */
        this.detalhes = null;
    }
}

/** Cache em memória (vale enquanto a aba estiver aberta). */
const cache = new Map();

/**
 * Monta a URL removendo parâmetros vazios.
 * @param {string} path
 * @param {Record<string, unknown>} [params]
 */
function buildUrl(path, params = {}) {
    const search = new URLSearchParams();
    for (const [key, value] of Object.entries(params)) {
        if (value !== undefined && value !== null && value !== '') search.set(key, String(value));
    }
    const qs = search.toString();
    return `/api${path}${qs ? `?${qs}` : ''}`;
}

/**
 * Faz um GET na API e devolve o JSON.
 * @param {string} path
 * @param {{ params?: Record<string, unknown>, signal?: AbortSignal, cache?: boolean }} [options]
 */
async function get(path, { params, signal, cache: useCache = false } = {}) {
    const url = buildUrl(path, params);
    if (useCache && cache.has(url)) return cache.get(url);

    let response;
    try {
        response = await fetch(url, { signal, headers: { Accept: 'application/json' } });
    } catch (err) {
        if (err.name === 'AbortError') throw err;
        throw new ApiError(0, 'Não foi possível conectar ao servidor. Verifique sua conexão.');
    }

    const body = await response.json().catch(() => null);
    if (!response.ok) {
        throw new ApiError(response.status, body?.erro?.mensagem ?? `Erro ${response.status} ao carregar dados.`);
    }

    if (useCache) cache.set(url, body);
    return body;
}

/**
 * Envia dados (POST/PATCH) ou lê rotas protegidas. Nunca usa cache.
 * O erro traz `detalhes` (erros por campo) quando o servidor devolve.
 * @param {string} method
 * @param {string} path
 * @param {{ body?: unknown, token?: string, params?: Record<string, unknown> }} [options]
 */
async function enviar(method, path, { body, token, params } = {}) {
    const headers = { Accept: 'application/json' };
    if (body !== undefined) headers['Content-Type'] = 'application/json';
    if (token) headers.Authorization = `Bearer ${token}`;

    let response;
    try {
        response = await fetch(buildUrl(path, params), {
            method,
            headers,
            body: body === undefined ? undefined : JSON.stringify(body),
        });
    } catch {
        throw new ApiError(0, 'Não foi possível conectar ao servidor. Verifique sua conexão.');
    }
    const resposta = await response.json().catch(() => null);
    if (!response.ok) {
        const erro = new ApiError(response.status, resposta?.erro?.mensagem ?? `Erro ${response.status}.`);
        erro.detalhes = resposta?.erro?.detalhes ?? null;
        throw erro;
    }
    return resposta;
}

export const api = {
    /** @param {Record<string, unknown>} params @param {AbortSignal} [signal] */
    jogos: (params, signal) => get('/jogos', { params, signal }),
    /** @param {number|string} id */
    jogo: (id, signal) => get(`/jogos/${encodeURIComponent(id)}`, { signal }),
    filtrosJogos: (signal) => get('/jogos/filtros', { signal, cache: true }),
    recentes: (limite, signal) => get('/jogos/recentes', { params: { limite }, signal, cache: true }),

    resumo: (signal) => get('/estatisticas/resumo', { signal, cache: true }),
    recordes: (signal) => get('/estatisticas/recordes', { signal, cache: true }),

    temporadas: (signal) => get('/temporadas', { signal, cache: true }),
    /** @param {number|string} ano */
    temporada: (ano, signal) => get(`/temporadas/${encodeURIComponent(ano)}`, { signal, cache: true }),

    adversarios: (signal) => get('/adversarios', { signal, cache: true }),

    classicos: (signal) => get('/classicos', { signal, cache: true }),
    /** @param {string} slug */
    classico: (slug, signal) => get(`/classicos/${encodeURIComponent(slug)}`, { signal, cache: true }),

    titulos: (signal) => get('/titulos', { signal, cache: true }),
    /** @param {string} dia - 'MM-DD' */
    hoje: (dia, signal) => get('/hoje', { params: { dia }, signal, cache: true }),
    /** @param {string} desde - 'AAAA-MM-DD' */
    minhaHistoria: (desde, signal) => get('/minha-historia', { params: { desde }, signal, cache: true }),
    fregueses: (signal) => get('/fregueses', { signal, cache: true }),
    mapa: (signal) => get('/mapa', { signal, cache: true }),
    estadios: (signal) => get('/estadios', { signal, cache: true }),
    /** @param {number|string} id */
    estadio: (id, signal) => get(`/estadios/${encodeURIComponent(id)}`, { signal, cache: true }),
    /** @param {string} q */
    busca: (q, signal) => get('/busca', { params: { q }, signal, cache: true }),
    /** @param {string} [dia] - 'AAAA-MM-DD' (padrão: hoje) */
    quiz: (dia, signal) => get('/quiz', { params: { dia }, signal, cache: true }),
    creditosEscudos: (signal) => get('/escudos/creditos', { signal, cache: true }),
    /** @param {number|string} id */
    adversario: (id, signal) => get(`/adversarios/${encodeURIComponent(id)}`, { signal, cache: true }),

    /** "Achou um erro? Avise" */
    enviarCorrecao: (dados) => enviar('POST', '/correcoes', { body: dados }),
    /** Painel (exige ADMIN_TOKEN) */
    correcoes: (token, status) => enviar('GET', '/admin/correcoes', { token, params: { status } }),
    atualizarCorrecao: (token, id, status) =>
        enviar('PATCH', `/admin/correcoes/${encodeURIComponent(id)}`, { token, body: { status } }),
};
