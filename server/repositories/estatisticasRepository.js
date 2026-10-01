/**
 * Consultas agregadas (desempenho, recordes, temporadas e adversários).
 */

import config from '../config/index.js';
import { query, queryOne } from '../db/pool.js';
import {
    AGREGADOS,
    COLUNAS_JOGO,
    JOGOS_DO_CLUBE,
    JOINS_DETALHES,
    ORDEM_CRONOLOGICA,
    escaparLike,
    montarFiltros,
} from './sql.js';

const clube = () => ({ clube: config.clubeIds });

/**
 * Totais de desempenho, opcionalmente filtrados.
 * @param {Parameters<typeof montarFiltros>[0]} [filtros]
 */
export async function resumo(filtros = {}) {
    const { where, params } = montarFiltros(filtros);
    return queryOne(
        `SELECT ${AGREGADOS},
                MIN(jc.data) AS primeiro_jogo,
                MAX(jc.data) AS ultimo_jogo,
                COUNT(DISTINCT YEAR(jc.data)) AS temporadas
         FROM (${JOGOS_DO_CLUBE}) jc
         LEFT JOIN campeonato c ON c.id_campeonato = jc.id_campeonato
         INNER JOIN time adv ON adv.id_time = jc.id_adversario
         ${where}`,
        { ...clube(), ...params },
    );
}

/** Desempenho agrupado por ano (mais recente primeiro). */
export async function porAno() {
    return query(
        `SELECT YEAR(jc.data) AS ano, ${AGREGADOS}
         FROM (${JOGOS_DO_CLUBE}) jc
         WHERE jc.data IS NOT NULL
         GROUP BY YEAR(jc.data)
         ORDER BY ano DESC`,
        clube(),
    );
}

/**
 * Desempenho por campeonato em um ano.
 * @param {number} ano
 */
export async function porCampeonatoNoAno(ano) {
    const { where, params } = montarFiltros({ ano });
    return query(
        `SELECT c.nome, ${AGREGADOS}
         FROM (${JOGOS_DO_CLUBE}) jc
         INNER JOIN campeonato c ON c.id_campeonato = jc.id_campeonato
         ${where}
         GROUP BY c.nome
         ORDER BY jogos DESC, c.nome`,
        { ...clube(), ...params },
    );
}

/**
 * Desempenho contra cada adversário.
 * @param {{ busca?: string | null, limite?: number | null }} [opcoes]
 */
export async function porAdversario({ busca = null, limite = null } = {}) {
    const { where, params } = montarFiltros({ adversario: busca });
    const limit = limite ? 'LIMIT :limite' : '';
    return query(
        `SELECT adv.id_time AS id, adv.nome, adv.sigla, ${AGREGADOS},
                MIN(jc.data) AS primeiro_jogo,
                MAX(jc.data) AS ultimo_jogo
         FROM (${JOGOS_DO_CLUBE}) jc
         INNER JOIN time adv ON adv.id_time = jc.id_adversario
         ${where}
         GROUP BY adv.id_time, adv.nome, adv.sigla
         ORDER BY jogos DESC, adv.nome
         ${limit}`,
        { ...clube(), ...params, limite },
    );
}

/**
 * Dados cadastrais de um time.
 * @param {number} id
 */
export async function buscarTime(id) {
    return queryOne('SELECT id_time AS id, nome, sigla, cidade, estado, pais FROM time WHERE id_time = :id', { id });
}

/**
 * Estádios onde o Corinthians mais jogou.
 * @param {number} limite
 */
export async function estadiosMaisFrequentes(limite) {
    return query(
        `SELECT e.id_estadio AS id, e.nome, e.cidade, ${AGREGADOS}
         FROM (${JOGOS_DO_CLUBE}) jc
         INNER JOIN estadio e ON e.id_estadio = jc.id_estadio
         WHERE e.nome NOT LIKE '%encontrad%' AND e.nome NOT LIKE '%informad%'
         GROUP BY e.id_estadio, e.nome, e.cidade
         ORDER BY jogos DESC
         LIMIT :limite`,
        { ...clube(), limite },
    );
}

/**
 * Jogos extremos segundo um critério fixo.
 * @param {'maioresVitorias' | 'maioresDerrotas' | 'maioresPublicos'} tipo
 * @param {number} limite
 * @param {Parameters<typeof montarFiltros>[0]} [filtros]
 */
export async function jogosRecordes(tipo, limite, filtros = {}) {
    const criterios = {
        maioresVitorias: {
            condicao: "jc.resultado = 'V'",
            ordem: '(jc.gols_pro - jc.gols_contra) DESC, jc.gols_pro DESC, jc.data ASC',
        },
        maioresDerrotas: {
            condicao: "jc.resultado = 'D'",
            ordem: '(jc.gols_contra - jc.gols_pro) DESC, jc.gols_contra DESC, jc.data ASC',
        },
        maioresPublicos: {
            condicao: 'jc.publico IS NOT NULL AND jc.publico > 0',
            ordem: 'jc.publico DESC',
        },
    };
    const criterio = criterios[tipo];
    if (!criterio) throw new Error(`Tipo de recorde desconhecido: ${tipo}`);

    const { where, params } = montarFiltros(filtros, [criterio.condicao]);

    return query(
        `SELECT ${COLUNAS_JOGO}
         FROM (${JOGOS_DO_CLUBE}) jc
         ${JOINS_DETALHES}
         INNER JOIN time adv ON adv.id_time = jc.id_adversario
         ${where}
         ORDER BY ${criterio.ordem}
         LIMIT :limite`,
        { ...clube(), ...params, limite },
    );
}

/**
 * Resultados em ordem cronológica (base para cálculo de sequências).
 * @param {Parameters<typeof montarFiltros>[0]} [filtros]
 */
export async function resultadosCronologicos(filtros = {}) {
    const { where, params } = montarFiltros(filtros);
    return query(
        `SELECT jc.id_jogo AS id, jc.data, jc.resultado
         FROM (${JOGOS_DO_CLUBE}) jc
         INNER JOIN time adv ON adv.id_time = jc.id_adversario
         LEFT JOIN campeonato c ON c.id_campeonato = jc.id_campeonato
         ${where}
         ORDER BY ${ORDEM_CRONOLOGICA}`,
        { ...clube(), ...params },
    );
}

/**
 * Jogos com observação que pode indicar título (o filtro fino é feito em JS,
 * em utils/titulos.js). Ordem cronológica.
 */
export async function jogosComMencaoATitulo() {
    return query(
        `SELECT ${COLUNAS_JOGO}
         FROM (${JOGOS_DO_CLUBE}) jc
         ${JOINS_DETALHES}
         WHERE jc.observacoes LIKE '%ampe%'
         ORDER BY ${ORDEM_CRONOLOGICA}`,
        clube(),
    );
}

/**
 * Localiza times pelo par nome + cidade.
 * @param {{ nome: string, cidade: string }[]} times
 * @returns {Promise<{ id: number, nome: string, sigla: string | null, cidade: string | null }[]>}
 */
export async function buscarTimesPorNomeECidade(times) {
    if (!times.length) return [];
    const condicoes = times.map((_, i) => `(nome = :nome${i} AND cidade = :cidade${i})`).join(' OR ');
    const params = Object.fromEntries(
        times.flatMap((t, i) => [
            [`nome${i}`, t.nome],
            [`cidade${i}`, t.cidade],
        ]),
    );
    return query(`SELECT id_time AS id, nome, sigla, cidade FROM time WHERE ${condicoes}`, params);
}

/**
 * Todos os resultados em ordem cronológica, com adversário e mando
 * (base para sequências em andamento e tabus).
 */
export async function resultadosComAdversario() {
    return query(
        `SELECT jc.id_jogo AS id, jc.data, jc.resultado, jc.em_casa, jc.id_estadio, jc.id_adversario
         FROM (${JOGOS_DO_CLUBE}) jc
         ORDER BY ${ORDEM_CRONOLOGICA}`,
        clube(),
    );
}

/** Desempenho em cada estádio (sem os marcadores "não encontrado"). */
export async function porEstadio() {
    return query(
        `SELECT e.id_estadio AS id, e.nome, e.cidade, e.estado, e.pais, ${AGREGADOS},
                MIN(jc.data) AS primeiro_jogo, MAX(jc.data) AS ultimo_jogo
         FROM (${JOGOS_DO_CLUBE}) jc
         INNER JOIN estadio e ON e.id_estadio = jc.id_estadio
         WHERE e.nome NOT LIKE '%encontrad%' AND e.nome NOT LIKE '%informad%'
         GROUP BY e.id_estadio, e.nome, e.cidade, e.estado, e.pais
         ORDER BY jogos DESC, e.nome`,
        clube(),
    );
}

/**
 * Placares mais frequentes (do ponto de vista do Corinthians).
 * @param {Parameters<typeof montarFiltros>[0]} filtros
 * @param {number} limite
 */
export async function placaresMaisComuns(filtros, limite) {
    const { where, params } = montarFiltros(filtros, ['jc.gols_pro IS NOT NULL']);
    return query(
        `SELECT jc.gols_pro, jc.gols_contra, COUNT(*) AS vezes
         FROM (${JOGOS_DO_CLUBE}) jc
         ${where}
         GROUP BY jc.gols_pro, jc.gols_contra
         ORDER BY vezes DESC, jc.gols_pro DESC
         LIMIT :limite`,
        { ...clube(), ...params, limite },
    );
}

/**
 * Busca por nome em times (que já enfrentaram o Corinthians), estádios e campeonatos.
 * @param {string} termo
 * @param {number} limite
 */
export async function buscar(termo, limite) {
    const like = `%${escaparLike(termo)}%`;
    const inicio = `${escaparLike(termo)}%`;
    const [times, estadios, campeonatos] = await Promise.all([
        query(
            `SELECT adv.id_time AS id, adv.nome, adv.cidade, COUNT(*) AS jogos
             FROM (${JOGOS_DO_CLUBE}) jc
             INNER JOIN time adv ON adv.id_time = jc.id_adversario
             WHERE adv.nome LIKE :like
             GROUP BY adv.id_time, adv.nome, adv.cidade
             ORDER BY (adv.nome LIKE :inicio) DESC, jogos DESC
             LIMIT :limite`,
            { ...clube(), like, inicio, limite },
        ),
        query(
            `SELECT e.id_estadio AS id, e.nome, e.cidade, COUNT(*) AS jogos
             FROM (${JOGOS_DO_CLUBE}) jc
             INNER JOIN estadio e ON e.id_estadio = jc.id_estadio
             WHERE e.nome LIKE :like AND e.nome NOT LIKE '%encontrad%'
             GROUP BY e.id_estadio, e.nome, e.cidade
             ORDER BY (e.nome LIKE :inicio) DESC, jogos DESC
             LIMIT :limite`,
            { ...clube(), like, inicio, limite },
        ),
        query(
            `SELECT c.nome, COUNT(*) AS jogos
             FROM (${JOGOS_DO_CLUBE}) jc
             INNER JOIN campeonato c ON c.id_campeonato = jc.id_campeonato
             WHERE c.nome LIKE :like
             GROUP BY c.nome
             ORDER BY (c.nome LIKE :inicio) DESC, jogos DESC
             LIMIT :limite`,
            { ...clube(), like, inicio, limite },
        ),
    ]);
    return { times, estadios, campeonatos };
}

/**
 * Dados cadastrais de um estádio.
 * @param {number} id
 */
export async function buscarEstadio(id) {
    return queryOne('SELECT id_estadio AS id, nome, cidade, estado, pais FROM estadio WHERE id_estadio = :id', { id });
}

/** Desempenho por cidade/estado/país dos estádios (sem os marcadores "não encontrado"). */
export async function porLocalidade() {
    return query(
        `SELECT e.cidade, e.estado, e.pais, ${AGREGADOS}, COUNT(DISTINCT e.id_estadio) AS estadios
         FROM (${JOGOS_DO_CLUBE}) jc
         INNER JOIN estadio e ON e.id_estadio = jc.id_estadio
         WHERE e.nome NOT LIKE '%encontrad%' AND e.nome NOT LIKE '%informad%'
         GROUP BY e.cidade, e.estado, e.pais`,
        clube(),
    );
}
