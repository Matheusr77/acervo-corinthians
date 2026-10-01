/**
 * Fragmentos SQL compartilhados entre os repositórios.
 *
 * Toda consulta parte de `JOGOS_DO_CLUBE`: uma tabela derivada que já
 * enxerga cada jogo do ponto de vista do Corinthians (gols pró/contra,
 * adversário, mando e resultado). Isso elimina os CASE repetidos em
 * cada query e garante que todas as telas calculem igual.
 *
 * Parâmetro obrigatório em todas as consultas: `:clube` (lista de IDs do Corinthians;
 * o mysql2 expande o array para `1, 1014`).
 */

export const JOGOS_DO_CLUBE = `
    SELECT
        j.id_jogo,
        j.data,
        j.horario,
        j.fase,
        j.gols_mandante,
        j.gols_visitante,
        j.penaltis_mandante,
        j.penaltis_visitante,
        j.publico,
        j.arbitro,
        j.observacoes,
        j.id_mandante,
        j.id_visitante,
        j.id_estadio,
        j.id_campeonato,
        (j.id_mandante IN (:clube))                                      AS em_casa,
        IF(j.id_mandante IN (:clube), j.gols_mandante, j.gols_visitante)   AS gols_pro,
        IF(j.id_mandante IN (:clube), j.gols_visitante, j.gols_mandante)   AS gols_contra,
        IF(j.id_mandante IN (:clube), j.id_visitante, j.id_mandante)       AS id_adversario,
        CASE
            WHEN j.gols_mandante IS NULL OR j.gols_visitante IS NULL THEN NULL
            WHEN j.gols_mandante = j.gols_visitante                  THEN 'E'
            WHEN (j.gols_mandante > j.gols_visitante) = (j.id_mandante IN (:clube)) THEN 'V'
            ELSE 'D'
        END                                                              AS resultado
    FROM jogo j
    WHERE j.id_mandante IN (:clube) OR j.id_visitante IN (:clube)
`;

/** Agregados padrão de desempenho sobre a tabela derivada `jc`. */
export const AGREGADOS = `
    COUNT(*)                            AS jogos,
    COALESCE(SUM(jc.resultado = 'V'), 0) AS vitorias,
    COALESCE(SUM(jc.resultado = 'E'), 0) AS empates,
    COALESCE(SUM(jc.resultado = 'D'), 0) AS derrotas,
    COALESCE(SUM(jc.gols_pro), 0)        AS gols_pro,
    COALESCE(SUM(jc.gols_contra), 0)     AS gols_contra
`;

/** Joins com times, estádio e campeonato (LEFT para não perder jogos incompletos). */
export const JOINS_DETALHES = `
    INNER JOIN time       tm  ON tm.id_time        = jc.id_mandante
    INNER JOIN time       tv  ON tv.id_time        = jc.id_visitante
    LEFT  JOIN estadio    e   ON e.id_estadio      = jc.id_estadio
    LEFT  JOIN campeonato c   ON c.id_campeonato   = jc.id_campeonato
`;

/** Colunas de um jogo completo (usar junto com JOINS_DETALHES). */
export const COLUNAS_JOGO = `
    jc.*,
    tm.nome      AS mandante_nome,
    tm.sigla     AS mandante_sigla,
    tv.nome      AS visitante_nome,
    tv.sigla     AS visitante_sigla,
    e.nome       AS estadio_nome,
    e.cidade     AS estadio_cidade,
    e.pais       AS estadio_pais,
    c.nome       AS campeonato_nome,
    c.temporada  AS campeonato_temporada,
    c.tipo       AS campeonato_tipo
`;

/** Ordem cronológica estável (data + id desempata jogos no mesmo dia). */
export const ORDEM_CRONOLOGICA = 'jc.data ASC, jc.id_jogo ASC';
export const ORDEM_RECENTE = 'jc.data DESC, jc.id_jogo DESC';

/**
 * Monta a cláusula WHERE a partir dos filtros validados.
 * Os nomes dos parâmetros são fixos, então é seguro concatenar o SQL.
 *
 * @param {{
 *   ano?: number | null,
 *   desde?: string | null,
 *   diaDoAno?: { mes: number, dia: number } | null,
 *   campeonato?: string | null,
 *   adversario?: string | null,
 *   adversarioId?: number | null,
 *   adversarioIds?: number[] | null,
 *   estadioId?: number | null,
 *   resultado?: string | null,
 *   mando?: string | null
 * }} filtros
 * @param {string[]} [condicoesExtras] - Condições SQL fixas (sem entrada do usuário)
 * @returns {{ where: string, params: Record<string, unknown> }}
 */
export function montarFiltros(filtros = {}, condicoesExtras = []) {
    const condicoes = [...condicoesExtras];
    const params = {};

    if (filtros.ano) {
        condicoes.push('jc.data >= :dataInicio AND jc.data < :dataFim');
        params.dataInicio = `${filtros.ano}-01-01`;
        params.dataFim = `${filtros.ano + 1}-01-01`;
    }
    if (filtros.desde) {
        condicoes.push('jc.data >= :desde');
        params.desde = filtros.desde;
    }
    if (filtros.diaDoAno) {
        condicoes.push('MONTH(jc.data) = :mes AND DAY(jc.data) = :dia');
        params.mes = filtros.diaDoAno.mes;
        params.dia = filtros.diaDoAno.dia;
    }
    if (filtros.campeonato) {
        condicoes.push('c.nome = :campeonato');
        params.campeonato = filtros.campeonato;
    }
    if (filtros.adversarioId) {
        condicoes.push('jc.id_adversario = :adversarioId');
        params.adversarioId = filtros.adversarioId;
    }
    if (filtros.estadioId) {
        condicoes.push('jc.id_estadio = :estadioId');
        params.estadioId = filtros.estadioId;
    }
    if (filtros.adversarioIds?.length) {
        condicoes.push('jc.id_adversario IN (:adversarioIds)');
        params.adversarioIds = filtros.adversarioIds;
    }
    if (filtros.adversario) {
        condicoes.push('adv.nome LIKE :adversario');
        params.adversario = `%${escaparLike(filtros.adversario)}%`;
    }
    if (filtros.resultado) {
        condicoes.push('jc.resultado = :resultado');
        params.resultado = filtros.resultado;
    }
    if (filtros.mando) {
        condicoes.push(filtros.mando === 'casa' ? 'jc.em_casa = 1' : 'jc.em_casa = 0');
    }

    return {
        where: condicoes.length ? `WHERE ${condicoes.join(' AND ')}` : '',
        params,
    };
}

/**
 * Escapa os curingas do LIKE para buscar o texto literal digitado.
 * @param {string} texto
 */
export function escaparLike(texto) {
    return texto.replace(/[\\%_]/g, (m) => `\\${m}`);
}
