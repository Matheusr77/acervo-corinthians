/**
 * Validação e normalização de parâmetros de entrada (rota e query string).
 * Tudo que chega do cliente passa por aqui antes de chegar ao SQL.
 */

import { HttpError } from './httpError.js';

export const RESULTADOS = Object.freeze(['V', 'E', 'D']);
export const MANDOS = Object.freeze(['casa', 'fora']);

export const PAGINACAO = Object.freeze({
    limitePadrao: 20,
    limiteMaximo: 100,
});

const ANO_MINIMO = 1900;
const ANO_MAXIMO = 2100;
const TAMANHO_MAXIMO_BUSCA = 60;

/**
 * Garante que o valor é um inteiro positivo (IDs).
 * @param {unknown} value
 * @param {string} campo - Nome do campo para a mensagem de erro
 * @returns {number}
 */
export function parseId(value, campo = 'id') {
    const num = Number(value);
    if (!Number.isSafeInteger(num) || num <= 0) {
        throw HttpError.badRequest(`Parâmetro "${campo}" inválido.`);
    }
    return num;
}

/**
 * Garante que o valor é um ano plausível.
 * @param {unknown} value
 * @returns {number}
 */
export function parseAno(value) {
    const num = Number(value);
    if (!Number.isInteger(num) || num < ANO_MINIMO || num > ANO_MAXIMO) {
        throw HttpError.badRequest('Parâmetro "ano" inválido.');
    }
    return num;
}

/**
 * Normaliza um texto livre de busca (trim + limite de tamanho).
 * @param {unknown} value
 * @returns {string | null}
 */
export function parseBusca(value) {
    if (typeof value !== 'string') return null;
    const texto = value.trim().slice(0, TAMANHO_MAXIMO_BUSCA);
    return texto.length > 0 ? texto : null;
}

/**
 * Lê `pagina` e `limite` da query string com valores padrão seguros.
 * @param {Record<string, unknown>} q
 * @returns {{ pagina: number, limite: number, offset: number }}
 */
export function parsePaginacao(q) {
    const pagina = Math.max(1, Number.parseInt(String(q.pagina ?? ''), 10) || 1);
    const limiteBruto = Number.parseInt(String(q.limite ?? ''), 10) || PAGINACAO.limitePadrao;
    const limite = Math.min(Math.max(1, limiteBruto), PAGINACAO.limiteMaximo);
    return { pagina, limite, offset: (pagina - 1) * limite };
}

/**
 * Lê e valida os filtros da listagem de jogos.
 * Filtros vazios são ignorados; valores inválidos geram 400.
 *
 * @param {Record<string, unknown>} q - req.query
 * @returns {{
 *   ano: number | null,
 *   campeonato: string | null,
 *   adversario: string | null,
 *   adversarioId: number | null,
 *   resultado: 'V' | 'E' | 'D' | null,
 *   mando: 'casa' | 'fora' | null,
 *   ordem: 'asc' | 'desc'
 * }}
 */
export function parseFiltrosJogos(q) {
    const vazio = (v) => v === undefined || v === null || v === '';

    const resultado = vazio(q.resultado) ? null : String(q.resultado).toUpperCase();
    if (resultado && !RESULTADOS.includes(resultado)) {
        throw HttpError.badRequest('Parâmetro "resultado" deve ser V, E ou D.');
    }

    const mando = vazio(q.mando) ? null : String(q.mando).toLowerCase();
    if (mando && !MANDOS.includes(mando)) {
        throw HttpError.badRequest('Parâmetro "mando" deve ser "casa" ou "fora".');
    }

    return {
        ano: vazio(q.ano) ? null : parseAno(q.ano),
        campeonato: parseBusca(q.campeonato),
        adversario: parseBusca(q.adversario),
        adversarioId: vazio(q.adversarioId) ? null : parseId(q.adversarioId, 'adversarioId'),
        resultado,
        mando,
        ordem: String(q.ordem).toLowerCase() === 'asc' ? 'asc' : 'desc',
    };
}

/**
 * Data completa 'AAAA-MM-DD' válida (confere dia do mês, inclusive 29/02).
 * @param {unknown} value
 * @param {string} [campo]
 * @returns {string}
 */
export function parseData(value, campo = 'data') {
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(value ?? ''));
    const data = m ? new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]))) : null;
    const valida = data && data.getUTCMonth() === Number(m[2]) - 1 && data.getUTCDate() === Number(m[3]);
    if (!valida || Number(m[1]) < ANO_MINIMO || Number(m[1]) > ANO_MAXIMO) {
        throw HttpError.badRequest(`Parâmetro "${campo}" deve ser uma data no formato AAAA-MM-DD.`);
    }
    return m[0];
}

/**
 * Dia do ano 'MM-DD' (aceita 02-29).
 * @param {unknown} value
 * @returns {{ mes: number, dia: number }}
 */
export function parseDiaMes(value) {
    const m = /^(\d{2})-(\d{2})$/.exec(String(value ?? ''));
    const mes = m ? Number(m[1]) : 0;
    const dia = m ? Number(m[2]) : 0;
    const diasNoMes = [31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
    if (!m || mes < 1 || mes > 12 || dia < 1 || dia > diasNoMes[mes - 1]) {
        throw HttpError.badRequest('Parâmetro "dia" deve estar no formato MM-DD.');
    }
    return { mes, dia };
}
