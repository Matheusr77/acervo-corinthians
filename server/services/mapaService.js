/**
 * "O Timão pelo mapa": jogos por cidade (Brasil), estado e país.
 *
 * As coordenadas vêm da base gerada por scripts/mapa/gerar-geo.js
 * (server/assets/geo): cada cidade do banco é localizada pelo par nome + UF.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import * as statsRepo from '../repositories/estatisticasRepository.js';
import { comCache } from '../utils/cache.js';
import { montarResumo } from '../utils/estatisticas.js';

const PASTA_GEO = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'assets', 'geo');
const PAIS_PADRAO = 'Brasil';

/**
 * Cidades do banco com nome antigo ou grafia diferente da base do IBGE.
 * (Campo Grande e Corumbá eram MT antes de 1977; Monte Alegre é o antigo nome de Telêmaco Borba.)
 */
const EQUIVALENCIAS_CIDADES = {
    'taguatinga|DF': 'brasilia|DF',
    'santa barbara doeste|SP': 'santa barbara d oeste|SP',
    'dourado|MS': 'dourados|MS',
    'ourinho|SP': 'ourinhos|SP',
    'campo grande|MT': 'campo grande|MS',
    'corumba|MT': 'corumba|MS',
    'campos|RJ': 'campos dos goytacazes|RJ',
    'ipaucu|SP': 'ipaussu|SP',
    'monte azul|SP': 'monte azul paulista|SP',
    'monte alegre|PR': 'telemaco borba|PR',
};

let base = null;
/** Carrega (uma vez) municípios e nomes de países. */
function carregarBase() {
    base ??= {
        municipios: JSON.parse(fs.readFileSync(path.join(PASTA_GEO, 'municipios.json'), 'utf8')),
        paises: JSON.parse(fs.readFileSync(path.join(PASTA_GEO, 'paises.json'), 'utf8')),
    };
    return base;
}

/** Mesmo critério de normalização usado ao gerar a base. */
export const normalizar = (t) =>
    String(t ?? '')
        .normalize('NFD')
        .replace(/[̀-ͯ]/g, '')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, ' ')
        .trim();

/**
 * Soma linhas agregadas (jogos, V, E, D, gols) em um acumulador.
 * @param {Map<string, any>} mapa
 * @param {string} chave
 * @param {Record<string, any>} dadosFixos
 * @param {Record<string, any>} linha
 */
function acumular(mapa, chave, dadosFixos, linha) {
    const atual = mapa.get(chave) ?? {
        ...dadosFixos,
        jogos: 0,
        vitorias: 0,
        empates: 0,
        derrotas: 0,
        gols_pro: 0,
        gols_contra: 0,
        estadios: 0,
    };
    for (const campo of ['jogos', 'vitorias', 'empates', 'derrotas', 'gols_pro', 'gols_contra', 'estadios']) {
        atual[campo] += Number(linha[campo] ?? 0);
    }
    mapa.set(chave, atual);
}

/** Converte o acumulador no formato da API (com aproveitamento). */
const finalizar = ({ gols_pro, gols_contra, estadios, ...resto }) => ({
    ...resto,
    estadios,
    ...montarResumo({ ...resto, gols_pro, gols_contra }),
});

/**
 * Agrupa as linhas por cidade/estado/país e localiza cada uma.
 * Função pura (recebe a base), para poder ser testada.
 * @param {{ cidade: string | null, estado: string | null, pais: string | null }[]} linhas
 * @param {{ municipios: Record<string, [number, number]>, paises: Record<string, string> }} geo
 */
export function montarMapa(linhas, geo) {
    const cidades = new Map();
    const estados = new Map();
    const paises = new Map();
    const naoLocalizadas = new Map();

    for (const l of linhas) {
        const pais = l.pais || PAIS_PADRAO;
        const iso = geo.paises[normalizar(pais)] ?? null;
        acumular(paises, pais, { nome: pais, iso }, l);
        if (!iso) acumular(naoLocalizadas, `pais:${pais}`, { tipo: 'país', nome: pais }, l);

        if (iso !== 'BR') continue;
        const uf = String(l.estado ?? '').toUpperCase();
        if (uf) acumular(estados, uf, { uf }, l);

        const chaveOriginal = `${normalizar(l.cidade)}|${uf}`;
        const chave = EQUIVALENCIAS_CIDADES[chaveOriginal] ?? chaveOriginal;
        const ponto = geo.municipios[chave];
        if (ponto) {
            acumular(cidades, chave, { nome: l.cidade, uf, x: ponto[0], y: ponto[1] }, l);
        } else {
            acumular(
                naoLocalizadas,
                `cidade:${l.cidade}|${uf}`,
                { tipo: 'cidade', nome: [l.cidade, uf].filter(Boolean).join(' - ') },
                l,
            );
        }
    }

    const ordenar = (lista) => lista.map(finalizar).sort((a, b) => b.jogos - a.jogos);
    const listaPaises = ordenar([...paises.values()]);
    const brasil = listaPaises.find((p) => p.iso === 'BR');

    return {
        totais: {
            cidades: cidades.size,
            estados: estados.size,
            paises: paises.size,
            jogosNoBrasil: brasil?.jogos ?? 0,
            jogosNoExterior: listaPaises.filter((p) => p.iso !== 'BR').reduce((s, p) => s + p.jogos, 0),
        },
        cidades: ordenar([...cidades.values()]),
        estados: ordenar([...estados.values()]),
        paises: listaPaises,
        naoLocalizadas: ordenar([...naoLocalizadas.values()]),
    };
}

/** Dados do mapa (com cache). */
export function mapa() {
    return comCache('mapa', async () => montarMapa(await statsRepo.porLocalidade(), carregarBase()));
}
