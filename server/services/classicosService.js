/**
 * Clássicos: retrospecto contra os grandes rivais configurados em config/classicos.js.
 */

import { CLASSICOS } from '../config/classicos.js';
import * as jogosRepo from '../repositories/jogosRepository.js';
import * as statsRepo from '../repositories/estatisticasRepository.js';
import { mapearJogo } from '../repositories/mappers.js';
import { comCache } from '../utils/cache.js';
import { calcularSequencias, montarResumo } from '../utils/estatisticas.js';
import { HttpError } from '../utils/httpError.js';
import { clube, escudoDoTime } from './escudosService.js';

/**
 * Resolve os IDs dos times de cada clássico (uma vez, com cache).
 * Clássicos cujo rival não existe no banco são ignorados.
 */
function classicosResolvidos() {
    return comCache(
        'classicos:times',
        async () => {
            const resolvidos = [];
            for (const classico of CLASSICOS) {
                const times = await statsRepo.buscarTimesPorNomeECidade(classico.times);
                if (times.length) resolvidos.push({ ...classico, times });
            }
            return resolvidos;
        },
        60 * 60 * 1000,
    );
}

/** @param {{ slug: string, nome: string, descricao: string, times: any[] }} c */
function cabecalho(c) {
    const times = c.times.map((t) => ({ ...t, escudo: escudoDoTime(t.id) }));
    return { slug: c.slug, nome: c.nome, descricao: c.descricao, clube: clube(), rival: times[0], times };
}

/** Lista dos clássicos com o placar geral de cada um. */
export function listar() {
    return comCache('classicos:lista', async () => {
        const classicos = await classicosResolvidos();
        return Promise.all(
            classicos.map(async (c) => {
                const filtro = { adversarioIds: c.times.map((t) => t.id) };
                const [resumo, ultimo] = await Promise.all([
                    statsRepo.resumo(filtro),
                    jogosRepo.listarRecentes(1, filtro),
                ]);
                return {
                    ...cabecalho(c),
                    resumo: { ...montarResumo(resumo), primeiroJogo: resumo?.primeiro_jogo ?? null },
                    ultimoJogo: ultimo[0] ? mapearJogo(ultimo[0]) : null,
                };
            }),
        );
    });
}

/**
 * Retrospecto completo de um clássico.
 * @param {string} slug
 */
export async function detalhar(slug) {
    const classico = (await classicosResolvidos()).find((c) => c.slug === slug);
    if (!classico) throw HttpError.notFound('Clássico não encontrado.');

    return comCache(`classicos:${slug}`, async () => {
        const filtro = { adversarioIds: classico.times.map((t) => t.id) };
        const [resumo, jogos, cronologia, vitorias, derrotas] = await Promise.all([
            statsRepo.resumo(filtro),
            jogosRepo.listarRecentes(5000, filtro),
            statsRepo.resultadosCronologicos(filtro),
            statsRepo.jogosRecordes('maioresVitorias', 3, filtro),
            statsRepo.jogosRecordes('maioresDerrotas', 3, filtro),
        ]);

        return {
            ...cabecalho(classico),
            resumo: {
                ...montarResumo(resumo),
                primeiroJogo: resumo?.primeiro_jogo ?? null,
                ultimoJogo: resumo?.ultimo_jogo ?? null,
            },
            sequencias: calcularSequencias(cronologia),
            maioresVitorias: vitorias.map(mapearJogo),
            maioresDerrotas: derrotas.map(mapearJogo),
            jogos: jogos.map(mapearJogo),
        };
    });
}

/** Slugs válidos (usado no sitemap e nas meta tags). */
export async function slugs() {
    return (await classicosResolvidos()).map((c) => ({ slug: c.slug, nome: c.nome, descricao: c.descricao }));
}
