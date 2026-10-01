/**
 * Estádios: lista com retrospecto e página de cada estádio.
 */

import * as jogosRepo from '../repositories/jogosRepository.js';
import * as statsRepo from '../repositories/estatisticasRepository.js';
import { mapearJogo } from '../repositories/mappers.js';
import { comCache } from '../utils/cache.js';
import { calcularSequencias, montarResumo } from '../utils/estatisticas.js';
import { HttpError } from '../utils/httpError.js';
import * as estatisticasService from './estatisticasService.js';

/** @param {Record<string, any>} e */
function mapearEstadio(e) {
    return {
        id: e.id,
        nome: e.nome,
        cidade: e.cidade ?? null,
        estado: e.estado ?? null,
        pais: e.pais ?? null,
        primeiroJogo: e.primeiro_jogo ?? null,
        ultimoJogo: e.ultimo_jogo ?? null,
        ...montarResumo(e),
    };
}

export function listar() {
    return comCache('estadios', async () => (await statsRepo.porEstadio()).map(mapearEstadio));
}

/**
 * @param {number} id
 */
export function detalhar(id) {
    return comCache(`estadio:${id}`, async () => {
        const filtro = { estadioId: id };
        const [estadio, resumo, jogos, cronologia, placares, vitorias, derrotas] = await Promise.all([
            statsRepo.buscarEstadio(id),
            statsRepo.resumo(filtro),
            jogosRepo.listarRecentes(5000, filtro),
            statsRepo.resultadosCronologicos(filtro),
            statsRepo.placaresMaisComuns(filtro, 5),
            statsRepo.jogosRecordes('maioresVitorias', 3, filtro),
            statsRepo.jogosRecordes('maioresDerrotas', 3, filtro),
        ]);
        if (!estadio || !resumo || Number(resumo.jogos) === 0 || /encontrad|informad/i.test(estadio.nome)) {
            throw HttpError.notFound('Estádio não encontrado.');
        }

        const adversarios = await estatisticasService.adversarios(null);
        const contagem = new Map();
        for (const j of jogos) contagem.set(j.id_adversario, (contagem.get(j.id_adversario) ?? 0) + 1);
        const nomes = new Map(adversarios.map((a) => [a.id, a.nome]));
        const maisEnfrentados = [...contagem.entries()]
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5)
            .map(([idAdv, n]) => ({ id: idAdv, nome: nomes.get(idAdv) ?? '—', jogos: n }));

        return {
            estadio,
            resumo: {
                ...montarResumo(resumo),
                primeiroJogo: resumo.primeiro_jogo,
                ultimoJogo: resumo.ultimo_jogo,
            },
            placaresMaisComuns: placares.map((p) => ({
                golsPro: p.gols_pro,
                golsContra: p.gols_contra,
                vezes: Number(p.vezes),
            })),
            sequencias: calcularSequencias(cronologia),
            maioresVitorias: vitorias.map(mapearJogo),
            maioresDerrotas: derrotas.map(mapearJogo),
            maisEnfrentados,
            jogos: jogos.map(mapearJogo),
        };
    });
}
