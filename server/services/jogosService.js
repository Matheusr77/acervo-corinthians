/**
 * Regras de negócio da listagem e do detalhe de jogos.
 */

import * as jogosRepo from '../repositories/jogosRepository.js';
import * as statsRepo from '../repositories/estatisticasRepository.js';
import { mapearJogo } from '../repositories/mappers.js';
import { comCache } from '../utils/cache.js';
import { montarResumo } from '../utils/estatisticas.js';
import { HttpError } from '../utils/httpError.js';

const ULTIMOS_CONFRONTOS = 5;

/**
 * @param {ReturnType<import('../utils/validators.js').parseFiltrosJogos>} filtros
 * @param {ReturnType<import('../utils/validators.js').parsePaginacao>} paginacao
 */
export async function listar(filtros, paginacao) {
    const { rows, total } = await jogosRepo.listar(filtros, paginacao);
    return {
        dados: rows.map(mapearJogo),
        paginacao: {
            pagina: paginacao.pagina,
            limite: paginacao.limite,
            total,
            totalPaginas: Math.max(1, Math.ceil(total / paginacao.limite)),
        },
    };
}

/**
 * Detalhe de um jogo + navegação cronológica + retrospecto contra o adversário.
 * @param {number} id
 */
export async function detalhar(id) {
    const row = await jogosRepo.buscarPorId(id);
    if (!row) throw HttpError.notFound('Jogo não encontrado.');

    const jogo = {
        ...mapearJogo(row),
        renda: row.renda_valor != null ? { valor: row.renda_valor, moeda: row.renda_moeda || null } : null,
    };
    jogo.mandante.cidade = row.mandante_cidade ?? null;
    jogo.visitante.cidade = row.visitante_cidade ?? null;

    const filtroAdversario = { adversarioId: jogo.adversario.id };
    const [navegacao, resumoConfronto, ultimos] = await Promise.all([
        jogosRepo.buscarVizinhos(row),
        statsRepo.resumo(filtroAdversario),
        jogosRepo.listarRecentes(ULTIMOS_CONFRONTOS + 1, filtroAdversario),
    ]);

    return {
        jogo,
        navegacao,
        confronto: {
            ...montarResumo(resumoConfronto),
            ultimos: ultimos
                .filter((r) => r.id_jogo !== id)
                .slice(0, ULTIMOS_CONFRONTOS)
                .map(mapearJogo),
        },
    };
}

/** Valores para popular os filtros (anos e campeonatos). */
export function opcoesFiltro() {
    return comCache('jogos:filtros', () => jogosRepo.listarOpcoesFiltro());
}

/**
 * Jogos mais recentes (usado na home).
 * @param {number} limite
 */
export async function recentes(limite) {
    const rows = await jogosRepo.listarRecentes(limite);
    return rows.map(mapearJogo);
}
