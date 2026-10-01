/**
 * Estatísticas gerais, recordes, temporadas e adversários.
 */

import * as jogosRepo from '../repositories/jogosRepository.js';
import * as statsRepo from '../repositories/estatisticasRepository.js';
import { mapearJogo } from '../repositories/mappers.js';
import { comCache } from '../utils/cache.js';
import { calcularSequencias, montarResumo } from '../utils/estatisticas.js';
import { HttpError } from '../utils/httpError.js';
import { clube, escudoDoTime } from './escudosService.js';

const TOP_RECORDES = 5;
const TOP_ADVERSARIOS = 10;

/** Resumo geral de todo o acervo. */
export function resumoGeral() {
    return comCache('stats:resumo', async () => {
        const row = await statsRepo.resumo();
        return {
            ...montarResumo(row),
            primeiroJogo: row?.primeiro_jogo ?? null,
            ultimoJogo: row?.ultimo_jogo ?? null,
            temporadas: Number(row?.temporadas ?? 0),
        };
    });
}

/** Recordes históricos: goleadas, públicos, sequências, adversários e estádios. */
export function recordes() {
    return comCache('stats:recordes', async () => {
        const [vitorias, derrotas, publicos, cronologia, adversarios, estadios] = await Promise.all([
            statsRepo.jogosRecordes('maioresVitorias', TOP_RECORDES),
            statsRepo.jogosRecordes('maioresDerrotas', TOP_RECORDES),
            statsRepo.jogosRecordes('maioresPublicos', TOP_RECORDES),
            statsRepo.resultadosCronologicos(),
            statsRepo.porAdversario({ limite: TOP_ADVERSARIOS }),
            statsRepo.estadiosMaisFrequentes(TOP_RECORDES),
        ]);

        return {
            maioresVitorias: vitorias.map(mapearJogo),
            maioresDerrotas: derrotas.map(mapearJogo),
            maioresPublicos: publicos.map(mapearJogo),
            sequencias: calcularSequencias(cronologia),
            adversariosMaisEnfrentados: adversarios.map(mapearAdversario),
            estadiosMaisFrequentes: estadios.map((e) => ({
                id: e.id,
                nome: e.nome,
                cidade: e.cidade ?? null,
                ...montarResumo(e),
            })),
        };
    });
}

/** Lista de temporadas com o desempenho de cada ano. */
export function temporadas() {
    return comCache('stats:temporadas', async () => {
        const rows = await statsRepo.porAno();
        return rows.map((r) => ({ ano: r.ano, ...montarResumo(r) }));
    });
}

/**
 * Detalhe de uma temporada.
 * @param {number} ano
 */
export async function temporada(ano) {
    const filtro = { ano };
    const [resumoRow, campeonatos, jogos, cronologia, maiorVitoria] = await Promise.all([
        statsRepo.resumo(filtro),
        statsRepo.porCampeonatoNoAno(ano),
        jogosRepo.listarRecentes(1000, filtro),
        statsRepo.resultadosCronologicos(filtro),
        statsRepo.jogosRecordes('maioresVitorias', 1, filtro),
    ]);

    if (!resumoRow || Number(resumoRow.jogos) === 0) {
        throw HttpError.notFound(`Nenhum jogo encontrado em ${ano}.`);
    }

    return {
        ano,
        resumo: montarResumo(resumoRow),
        campeonatos: campeonatos.map((c) => ({ nome: c.nome, ...montarResumo(c) })),
        sequencias: calcularSequencias(cronologia),
        maiorVitoria: maiorVitoria[0] ? mapearJogo(maiorVitoria[0]) : null,
        jogos: jogos.map(mapearJogo),
    };
}

/**
 * Lista de adversários com retrospecto.
 * @param {string | null} busca
 */
export async function adversarios(busca) {
    const rows = busca
        ? await statsRepo.porAdversario({ busca })
        : await comCache('stats:adversarios', () => statsRepo.porAdversario());
    return rows.map(mapearAdversario);
}

/**
 * Retrospecto completo contra um adversário.
 * @param {number} id
 */
export async function adversario(id) {
    const filtro = { adversarioId: id };
    const [time, resumoRow, jogos, maiorVitoria, maiorDerrota] = await Promise.all([
        statsRepo.buscarTime(id),
        statsRepo.resumo(filtro),
        jogosRepo.listarRecentes(5000, filtro),
        statsRepo.jogosRecordes('maioresVitorias', 1, filtro),
        statsRepo.jogosRecordes('maioresDerrotas', 1, filtro),
    ]);

    if (!time || !resumoRow || Number(resumoRow.jogos) === 0) {
        throw HttpError.notFound('Adversário não encontrado.');
    }

    return {
        clube: clube(),
        adversario: { ...time, escudo: escudoDoTime(time.id) },
        resumo: {
            ...montarResumo(resumoRow),
            primeiroJogo: resumoRow.primeiro_jogo,
            ultimoJogo: resumoRow.ultimo_jogo,
        },
        maiorVitoria: maiorVitoria[0] ? mapearJogo(maiorVitoria[0]) : null,
        maiorDerrota: maiorDerrota[0] ? mapearJogo(maiorDerrota[0]) : null,
        jogos: jogos.map(mapearJogo),
    };
}

/** @param {Record<string, any>} r */
function mapearAdversario(r) {
    return {
        id: r.id,
        nome: r.nome,
        sigla: r.sigla ?? null,
        escudo: escudoDoTime(r.id),
        primeiroJogo: r.primeiro_jogo ?? null,
        ultimoJogo: r.ultimo_jogo ?? null,
        ...montarResumo(r),
    };
}
