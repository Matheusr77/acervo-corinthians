/**
 * "Hoje na história": jogos do Corinthians em um mesmo dia do ano (ex.: todo 30/09).
 */

import { CLASSICOS } from '../config/classicos.js';
import * as jogosRepo from '../repositories/jogosRepository.js';
import { mapearJogo } from '../repositories/mappers.js';
import { comCache } from '../utils/cache.js';

const NOMES_CLASSICOS = new Set(CLASSICOS.flatMap((c) => c.times.map((t) => t.nome)));

/** Peso do título conforme o tipo do campeonato (Mundial vale mais que Estadual etc.). */
const PESO_TITULO = { Mundial: 4000, Continental: 3500, Nacional: 3000, Interestadual: 2000, Estadual: 2000 };

/**
 * Pontuação para escolher o jogo em destaque do dia:
 * título (Mundial > Continental > Nacional > Estadual...) > vitória em clássico > goleada
 * > vitória > resto (mais recente desempata).
 * @param {ReturnType<typeof mapearJogo>} j
 */
export function relevancia(j) {
    let pontos = 0;
    if (j.jogoDoTitulo) pontos += PESO_TITULO[j.campeonato?.tipo] ?? 1000;
    if (j.resultado === 'V') pontos += 100 + (j.golsPro - j.golsContra) * 10;
    if (NOMES_CLASSICOS.has(j.adversario.nome)) pontos += j.resultado === 'V' ? 60 : 15;
    if (j.resultado === 'E') pontos += 20;
    return pontos + Number(j.data.slice(0, 4)) / 10000;
}

/**
 * Jogos de um dia do ano, do mais recente ao mais antigo, com um destaque.
 * @param {{ mes: number, dia: number }} diaDoAno
 */
export function doDia(diaDoAno) {
    const chave = `hoje:${diaDoAno.mes}-${diaDoAno.dia}`;
    return comCache(chave, async () => {
        const rows = await jogosRepo.listarRecentes(500, { diaDoAno });
        const jogos = rows.map(mapearJogo);
        const destaque = jogos.length ? [...jogos].sort((a, b) => relevancia(b) - relevancia(a))[0] : null;
        return { mes: diaDoAno.mes, dia: diaDoAno.dia, destaque, jogos };
    });
}
