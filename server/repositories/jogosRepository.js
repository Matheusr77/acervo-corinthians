/**
 * Acesso a dados de jogos.
 */

import config from '../config/index.js';
import { query, queryOne } from '../db/pool.js';
import {
    COLUNAS_JOGO,
    JOGOS_DO_CLUBE,
    JOINS_DETALHES,
    ORDEM_CRONOLOGICA,
    ORDEM_RECENTE,
    montarFiltros,
} from './sql.js';

const clube = () => ({ clube: config.clubeIds });

/**
 * Lista jogos com filtros e paginação.
 * @param {ReturnType<import('../utils/validators.js').parseFiltrosJogos>} filtros
 * @param {{ limite: number, offset: number }} paginacao
 * @returns {Promise<{ rows: any[], total: number }>}
 */
export async function listar(filtros, { limite, offset }) {
    const { where, params } = montarFiltros(filtros);
    const ordem = filtros.ordem === 'asc' ? ORDEM_CRONOLOGICA : ORDEM_RECENTE;
    const from = `
        FROM (${JOGOS_DO_CLUBE}) jc
        ${JOINS_DETALHES}
        INNER JOIN time adv ON adv.id_time = jc.id_adversario
        ${where}
    `;

    const [rows, totalRow] = await Promise.all([
        query(`SELECT ${COLUNAS_JOGO} ${from} ORDER BY ${ordem} LIMIT :limite OFFSET :offset`, {
            ...clube(),
            ...params,
            limite,
            offset,
        }),
        queryOne(`SELECT COUNT(*) AS total ${from}`, { ...clube(), ...params }),
    ]);

    return { rows, total: Number(totalRow?.total ?? 0) };
}

/**
 * Busca um jogo pelo ID (somente jogos do Corinthians).
 * @param {number} id
 */
export async function buscarPorId(id) {
    return queryOne(
        `SELECT ${COLUNAS_JOGO}, j.renda_valor, j.renda_moeda,
                tm.cidade AS mandante_cidade, tv.cidade AS visitante_cidade
         FROM (${JOGOS_DO_CLUBE}) jc
         INNER JOIN jogo j ON j.id_jogo = jc.id_jogo
         ${JOINS_DETALHES}
         WHERE jc.id_jogo = :id`,
        { ...clube(), id },
    );
}

/**
 * IDs do jogo anterior e do próximo em ordem cronológica.
 * @param {{ id_jogo: number, data: string }} jogo
 * @returns {Promise<{ anterior: number | null, proximo: number | null }>}
 */
export async function buscarVizinhos(jogo) {
    const params = { ...clube(), id: jogo.id_jogo, data: jogo.data };
    const [anterior, proximo] = await Promise.all([
        queryOne(
            `SELECT jc.id_jogo FROM (${JOGOS_DO_CLUBE}) jc
             WHERE jc.data < :data OR (jc.data = :data AND jc.id_jogo < :id)
             ORDER BY ${ORDEM_RECENTE} LIMIT 1`,
            params,
        ),
        queryOne(
            `SELECT jc.id_jogo FROM (${JOGOS_DO_CLUBE}) jc
             WHERE jc.data > :data OR (jc.data = :data AND jc.id_jogo > :id)
             ORDER BY ${ORDEM_CRONOLOGICA} LIMIT 1`,
            params,
        ),
    ]);
    return { anterior: anterior?.id_jogo ?? null, proximo: proximo?.id_jogo ?? null };
}

/**
 * Últimos jogos (mais recentes primeiro), com filtros opcionais.
 * @param {number} limite
 * @param {Parameters<typeof montarFiltros>[0]} [filtros]
 */
export async function listarRecentes(limite, filtros = {}) {
    const { where, params } = montarFiltros(filtros);
    return query(
        `SELECT ${COLUNAS_JOGO}
         FROM (${JOGOS_DO_CLUBE}) jc
         ${JOINS_DETALHES}
         INNER JOIN time adv ON adv.id_time = jc.id_adversario
         ${where}
         ORDER BY ${ORDEM_RECENTE}
         LIMIT :limite`,
        { ...clube(), ...params, limite },
    );
}

/** Valores disponíveis para os filtros da tela de jogos. */
export async function listarOpcoesFiltro() {
    const [anos, campeonatos] = await Promise.all([
        query(
            `SELECT DISTINCT YEAR(jc.data) AS ano
             FROM (${JOGOS_DO_CLUBE}) jc
             WHERE jc.data IS NOT NULL
             ORDER BY ano DESC`,
            clube(),
        ),
        query(
            `SELECT c.nome, COUNT(*) AS jogos
             FROM (${JOGOS_DO_CLUBE}) jc
             INNER JOIN campeonato c ON c.id_campeonato = jc.id_campeonato
             GROUP BY c.nome
             ORDER BY c.nome`,
            clube(),
        ),
    ]);

    return {
        anos: anos.map((r) => r.ano),
        campeonatos: campeonatos.map((r) => ({ nome: r.nome, jogos: Number(r.jogos) })),
    };
}

/**
 * Primeiros jogos a partir de uma data (ordem cronológica).
 * @param {number} limite
 * @param {string} desde - 'AAAA-MM-DD'
 */
export async function listarProximos(limite, desde) {
    const { where, params } = montarFiltros({ desde });
    return query(
        `SELECT ${COLUNAS_JOGO}
         FROM (${JOGOS_DO_CLUBE}) jc
         ${JOINS_DETALHES}
         ${where}
         ORDER BY ${ORDEM_CRONOLOGICA}
         LIMIT :limite`,
        { ...clube(), ...params, limite },
    );
}
