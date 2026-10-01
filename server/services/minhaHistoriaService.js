/**
 * "O Timão na sua vida": tudo o que o Corinthians viveu desde uma data
 * (normalmente o nascimento do torcedor). Nada é gravado: a data só é usada
 * para calcular a resposta.
 */

import * as jogosRepo from '../repositories/jogosRepository.js';
import * as statsRepo from '../repositories/estatisticasRepository.js';
import { mapearJogo } from '../repositories/mappers.js';
import { calcularSequencias, montarResumo } from '../utils/estatisticas.js';
import { HttpError } from '../utils/httpError.js';
import * as classicosService from './classicosService.js';
import * as estatisticasService from './estatisticasService.js';
import * as titulosService from './titulosService.js';

const MINIMO_JOGOS_TEMPORADA = 20;

/**
 * Títulos conquistados a partir da data, agrupados por competição.
 * @param {Awaited<ReturnType<typeof titulosService.titulos>>} titulos
 * @param {string} desde
 */
function titulosDesde(titulos, desde) {
    const principais = titulos.categorias.filter((c) => c.principal);
    const competicoes = principais
        .flatMap((cat) =>
            cat.competicoes.map((c) => ({
                nome: c.nome,
                categoria: cat.rotulo,
                conquistas: c.conquistas.filter((q) => q.jogo.data >= desde),
            })),
        )
        .filter((c) => c.conquistas.length)
        .map((c) => ({
            nome: c.nome,
            categoria: c.categoria,
            total: c.conquistas.length,
            edicoes: c.conquistas.map((q) => q.edicao),
        }));

    const todas = principais
        .flatMap((cat) => cat.competicoes.flatMap((c) => c.conquistas.map((q) => ({ ...q, competicao: c.nome }))))
        .filter((q) => q.jogo.data >= desde)
        .sort((a, b) => a.jogo.data.localeCompare(b.jogo.data));

    return {
        total: todas.length,
        competicoes,
        primeiro: todas[0] ? { competicao: todas[0].competicao, edicao: todas[0].edicao, jogo: todas[0].jogo } : null,
    };
}

/**
 * @param {string} desde - 'AAAA-MM-DD'
 */
export async function calcular(desde) {
    const filtro = { desde };
    const [resumoRow, primeiros, cronologia, maiorVitoria, titulos, temporadas, classicos] = await Promise.all([
        statsRepo.resumo(filtro),
        jogosRepo.listarProximos(1, desde),
        statsRepo.resultadosCronologicos(filtro),
        statsRepo.jogosRecordes('maioresVitorias', 1, filtro),
        titulosService.titulos(),
        estatisticasService.temporadas(),
        classicosService.listar(),
    ]);

    if (!resumoRow || Number(resumoRow.jogos) === 0) {
        throw HttpError.notFound('O acervo ainda não tem jogos a partir dessa data.');
    }

    const anoInicial = Number(desde.slice(0, 4));
    const temporadasCompletas = temporadas.filter((t) => t.ano > anoInicial && t.jogos >= MINIMO_JOGOS_TEMPORADA);
    const melhorTemporada = [...temporadasCompletas].sort((a, b) => b.aproveitamento - a.aproveitamento)[0] ?? null;

    const resumoClassicos = await Promise.all(
        classicos.map(async (c) => {
            const r = await statsRepo.resumo({ ...filtro, adversarioIds: c.times.map((t) => t.id) });
            return { slug: c.slug, nome: c.nome, rival: c.rival, ...montarResumo(r) };
        }),
    );

    return {
        desde,
        resumo: { ...montarResumo(resumoRow), temporadas: Number(resumoRow.temporadas ?? 0) },
        primeiroJogo: primeiros[0] ? mapearJogo(primeiros[0]) : null,
        titulos: titulosDesde(titulos, desde),
        classicos: resumoClassicos.filter((c) => c.jogos > 0),
        maiorVitoria: maiorVitoria[0] ? mapearJogo(maiorVitoria[0]) : null,
        melhorTemporada,
        sequencias: calcularSequencias(cronologia),
    };
}
