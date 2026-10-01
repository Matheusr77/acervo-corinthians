/**
 * Pool de conexões com o MySQL.
 *
 * - `dateStrings`: datas voltam como texto ('YYYY-MM-DD'), evitando que o
 *   fuso horário do servidor desloque o dia do jogo.
 * - `decimalNumbers`: SUM()/DECIMAL voltam como Number em vez de string.
 * - `namedPlaceholders`: permite reutilizar parâmetros (`:clube`) na mesma query.
 */

import mysql from 'mysql2/promise';
import config from '../config/index.js';

const pool = mysql.createPool({
    ...config.db,
    waitForConnections: true,
    queueLimit: 0,
    dateStrings: true,
    decimalNumbers: true,
    namedPlaceholders: true,
    charset: 'utf8mb4',
});

/**
 * Executa uma consulta parametrizada e devolve apenas as linhas.
 * @param {string} sql
 * @param {Record<string, unknown>} [params]
 * @returns {Promise<any[]>}
 */
export async function query(sql, params = {}) {
    const [rows] = await pool.query(sql, params);
    return rows;
}

/**
 * Executa uma consulta e devolve somente a primeira linha (ou null).
 * @param {string} sql
 * @param {Record<string, unknown>} [params]
 * @returns {Promise<any | null>}
 */
export async function queryOne(sql, params = {}) {
    const rows = await query(sql, params);
    return rows[0] ?? null;
}

/** Verifica se o banco está acessível. */
export async function ping() {
    await pool.query('SELECT 1');
}

/** Encerra todas as conexões (usado no desligamento do servidor). */
export async function close() {
    await pool.end();
}
