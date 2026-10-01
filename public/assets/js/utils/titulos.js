/**
 * Ajuda a consultar os títulos (vindos de /api/titulos) por temporada.
 */

/**
 * Títulos conquistados em um ano (edição).
 * @param {{ porAno: Record<string, { competicao: string, principal: boolean }[]> } | null} titulos
 * @param {number | string} ano
 * @param {{ somentePrincipais?: boolean, tipos?: string[] }} [opcoes]
 *   somentePrincipais: ignora torneios amistosos/internacionais menores;
 *   tipos: restringe a certos `campeonato.tipo` (ex.: ['Mundial', 'Continental', 'Nacional'])
 * @returns {string[]}
 */
export function titulosDoAno(titulos, ano, { somentePrincipais = false, tipos } = {}) {
    const lista = titulos?.porAno?.[String(ano)] ?? [];
    return lista
        .filter((t) => !somentePrincipais || t.principal)
        .filter((t) => !tipos || tipos.includes(t.tipo))
        .map((t) => t.competicao);
}

/** Tipos de campeonato considerados "nacionais ou internacionais". */
export const TIPOS_NACIONAIS_E_INTERNACIONAIS = Object.freeze(['Mundial', 'Continental', 'Nacional']);

/**
 * Total de conquistas de uma competição (0 se nunca venceu).
 * @param {{ categorias: { competicoes: { nome: string, total: number }[] }[] }} titulos
 * @param {string} nome
 */
export function totalDaCompeticao(titulos, nome) {
    for (const cat of titulos.categorias) {
        const c = cat.competicoes.find((x) => x.nome === nome);
        if (c) return c.total;
    }
    return 0;
}
