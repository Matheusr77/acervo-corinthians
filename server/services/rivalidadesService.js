/**
 * Fregueses, carrascos, tabus e sequências em andamento.
 * Tudo calculado a partir do último jogo registrado no acervo.
 */

import * as statsRepo from '../repositories/estatisticasRepository.js';
import { comCache } from '../utils/cache.js';
import { CONDICOES, sequenciaAtual } from '../utils/estatisticas.js';
import { escudoDoTime } from './escudosService.js';
import * as estatisticasService from './estatisticasService.js';

/** Jogos mínimos para entrar nos rankings (evita "freguês" com 2 jogos). */
export const MINIMO_JOGOS_RANKING = 30;
/** Jogos mínimos contra o rival para acompanhar tabus. */
const MINIMO_JOGOS_TABU = 20;
/** A partir de quantos jogos uma sequência vira "tabu". */
const TAMANHO_MINIMO_TABU = 4;
/** Só conta como "em andamento" se o rival foi enfrentado nos últimos anos do acervo. */
const ANOS_RIVAL_ATIVO = 5;
const TOP = 15;

/**
 * Ordena adversários por aproveitamento do Corinthians.
 * @param {any[]} adversarios
 * @param {'fregueses' | 'carrascos'} tipo
 */
export function rankear(adversarios, tipo) {
    const elegiveis = adversarios.filter((a) => a.jogos >= MINIMO_JOGOS_RANKING && a.aproveitamento !== null);
    const sinal = tipo === 'fregueses' ? -1 : 1;
    return elegiveis.sort((a, b) => sinal * (a.aproveitamento - b.aproveitamento) || b.jogos - a.jogos).slice(0, TOP);
}

/**
 * Tabus em andamento contra cada rival frequente.
 * @param {{ data: string, resultado: any, id_adversario: number }[]} resultados - ordem cronológica
 * @param {Map<number, any>} adversariosPorId
 */
export function calcularTabus(resultados, adversariosPorId) {
    const ultimaData = resultados.at(-1)?.data ?? '0000-00-00';
    const corte = `${Number(ultimaData.slice(0, 4)) - ANOS_RIVAL_ATIVO}${ultimaData.slice(4)}`;
    const porRival = new Map();
    for (const r of resultados) {
        if (!porRival.has(r.id_adversario)) porRival.set(r.id_adversario, []);
        porRival.get(r.id_adversario).push(r);
    }

    const tabus = [];
    for (const [id, jogos] of porRival) {
        const adv = adversariosPorId.get(id);
        if (!adv || jogos.length < MINIMO_JOGOS_TABU) continue;
        const invicto = sequenciaAtual(jogos, CONDICOES.invicto);
        const semVencer = sequenciaAtual(jogos, CONDICOES.semVencer);
        const ultimo = jogos[jogos.length - 1];
        if (ultimo.data < corte) continue; // rival que não é mais enfrentado (ex.: clubes extintos)
        if (invicto.tamanho >= TAMANHO_MINIMO_TABU) {
            tabus.push({
                tipo: 'favor',
                adversario: adv,
                tamanho: invicto.tamanho,
                desde: invicto.inicio,
                ultimoJogo: ultimo.data,
            });
        } else if (semVencer.tamanho >= TAMANHO_MINIMO_TABU) {
            tabus.push({
                tipo: 'contra',
                adversario: adv,
                tamanho: semVencer.tamanho,
                desde: semVencer.inicio,
                ultimoJogo: ultimo.data,
            });
        }
    }
    return tabus.sort((a, b) => b.tamanho - a.tamanho);
}

/** Sequências gerais em andamento (a partir do último jogo do acervo). */
function sequenciasGerais(resultados) {
    const emCasa = resultados.filter((r) => Number(r.em_casa) === 1);
    return {
        invicto: sequenciaAtual(resultados, CONDICOES.invicto),
        vitorias: sequenciaAtual(resultados, CONDICOES.vitorias),
        semVencer: sequenciaAtual(resultados, CONDICOES.semVencer),
        invictoEmCasa: sequenciaAtual(emCasa, CONDICOES.invicto),
    };
}

/** Página "Fregueses & Tabus". */
export function rivalidades() {
    return comCache('rivalidades', async () => {
        const [adversarios, resultados] = await Promise.all([
            estatisticasService.adversarios(null),
            statsRepo.resultadosComAdversario(),
        ]);
        const porId = new Map(adversarios.map((a) => [a.id, { ...a, escudo: escudoDoTime(a.id) }]));
        const lista = [...porId.values()];
        const tabus = calcularTabus(resultados, porId);

        return {
            minimoJogos: MINIMO_JOGOS_RANKING,
            ultimoJogo: resultados.at(-1)?.data ?? null,
            fregueses: rankear(lista, 'fregueses'),
            carrascos: rankear(lista, 'carrascos'),
            tabusAFavor: tabus.filter((t) => t.tipo === 'favor'),
            tabusContra: tabus.filter((t) => t.tipo === 'contra'),
            sequencias: sequenciasGerais(resultados),
        };
    });
}
