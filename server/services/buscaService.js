/**
 * Busca geral: times, estádios, campeonatos, temporadas e páginas do site.
 */

import * as statsRepo from '../repositories/estatisticasRepository.js';
import { escudoDoTime } from './escudosService.js';
import * as estatisticasService from './estatisticasService.js';

const LIMITE_POR_GRUPO = 6;

/** Páginas fixas encontráveis pela busca (palavras-chave sem acento). */
const PAGINAS = [
    { titulo: 'O Timão na sua vida', url: '/minha-historia', chaves: 'minha historia vida nascimento story' },
    { titulo: 'Hoje na História', url: '/hoje', chaves: 'hoje dia data historia aniversario' },
    { titulo: 'Quiz do Timão', url: '/quiz', chaves: 'quiz perguntas jogo desafio' },
    { titulo: 'Títulos', url: '/titulos', chaves: 'titulos taças trofeus campeao conquistas' },
    { titulo: 'Clássicos', url: '/classicos', chaves: 'classicos derby majestoso alvinegro' },
    { titulo: 'Fregueses & Tabus', url: '/fregueses', chaves: 'fregueses carrascos tabus freguesia zoeira' },
    { titulo: 'Estádios', url: '/estadios', chaves: 'estadios arena campo' },
    { titulo: 'Estatísticas', url: '/estatisticas', chaves: 'estatisticas recordes numeros graficos' },
];

const normalizar = (t) => String(t).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

/**
 * @param {string} termo - já validado (1 a 60 caracteres)
 */
export async function buscar(termo) {
    const ano = /^\d{4}$/.test(termo) ? Number(termo) : null;
    const [resultado, temporadas] = await Promise.all([
        termo.length >= 2 ? statsRepo.buscar(termo, LIMITE_POR_GRUPO) : { times: [], estadios: [], campeonatos: [] },
        ano ? estatisticasService.temporadas() : [],
    ]);
    const t = normalizar(termo);

    return {
        termo,
        paginas: PAGINAS.filter((p) => normalizar(`${p.titulo} ${p.chaves}`).includes(t)).map(({ titulo, url }) => ({
            titulo,
            url,
        })),
        temporadas: temporadas.filter((x) => x.ano === ano).map((x) => ({ ano: x.ano, jogos: x.jogos })),
        times: resultado.times.map((x) => ({ ...x, jogos: Number(x.jogos), escudo: escudoDoTime(x.id) })),
        estadios: resultado.estadios.map((x) => ({ ...x, jogos: Number(x.jogos) })),
        campeonatos: resultado.campeonatos.map((x) => ({ ...x, jogos: Number(x.jogos) })),
    };
}
