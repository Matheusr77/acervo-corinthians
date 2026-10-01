/**
 * Escudos dos times.
 *
 * Os arquivos ficam em public/assets/img/escudos/ com o id_time como nome
 * (ex.: 102.png = Palmeiras). Não há mudança no banco: basta colocar o arquivo
 * na pasta que o site passa a usar a imagem; sem arquivo, o site mostra a sigla.
 *
 * O script `npm run escudos` baixa escudos do Wikidata/Wikimedia Commons e
 * grava os créditos (autor e licença) em escudos/creditos.json.
 */

import fs from 'node:fs';
import path from 'node:path';
import config from '../config/index.js';

export const PASTA_ESCUDOS = path.join(config.paths.public, 'assets', 'img', 'escudos');
const URL_BASE = '/assets/img/escudos';
const ARQUIVO_CREDITOS = path.join(PASTA_ESCUDOS, 'creditos.json');

/** Ordem de preferência quando há mais de um formato para o mesmo time. */
const EXTENSOES = ['svg', 'webp', 'png', 'jpg', 'jpeg'];
const RELEITURA_MS = 10_000;

let cache = { lidoEm: 0, mapa: new Map() };

/** Lê a pasta (no máximo a cada 10 s) e monta id_time → URL da imagem. */
function mapaDeEscudos() {
    if (Date.now() - cache.lidoEm < RELEITURA_MS) return cache.mapa;

    const mapa = new Map();
    let arquivos = [];
    try {
        arquivos = fs.readdirSync(PASTA_ESCUDOS);
    } catch {
        // pasta ainda não existe: nenhum escudo
    }

    const candidatos = arquivos
        .map((nome) => /^(\d+)\.([a-z]+)$/i.exec(nome))
        .filter((m) => m && EXTENSOES.includes(m[2].toLowerCase()))
        .sort((a, b) => EXTENSOES.indexOf(a[2].toLowerCase()) - EXTENSOES.indexOf(b[2].toLowerCase()));

    for (const [nome, id] of candidatos) {
        if (!mapa.has(Number(id))) mapa.set(Number(id), `${URL_BASE}/${nome}`);
    }

    cache = { lidoEm: Date.now(), mapa };
    return mapa;
}

/**
 * URL do escudo de um time, ou null se não houver arquivo.
 * Todos os IDs do Corinthians (ex.: 1 e 1014) usam o mesmo escudo.
 * @param {number | null | undefined} id
 */
export function escudoDoTime(id) {
    if (!id) return null;
    const mapa = mapaDeEscudos();
    if (config.clubeIds.includes(id)) {
        const idComArquivo = config.clubeIds.find((c) => mapa.has(c));
        return idComArquivo ? mapa.get(idComArquivo) : null;
    }
    return mapa.get(id) ?? null;
}

/** Objeto do próprio clube (nome + escudo), para as páginas de confronto. */
export function clube() {
    return { id: config.clubeIds[0], nome: 'Corinthians', escudo: escudoDoTime(config.clubeIds[0]) };
}

/**
 * Créditos dos escudos baixados pelo script (só dos arquivos que ainda existem).
 * @returns {{ id: number, time: string, autor: string | null, licenca: string | null, fonte: string }[]}
 */
export function creditos() {
    let lista = [];
    try {
        lista = JSON.parse(fs.readFileSync(ARQUIVO_CREDITOS, 'utf8'));
    } catch {
        return [];
    }
    const mapa = mapaDeEscudos();
    return lista
        .filter((c) => mapa.has(Number(c.id)))
        .filter((c) => /^https:\/\//.test(String(c.fonte))) // só links seguros vão para a página
        .sort((a, b) => String(a.time).localeCompare(String(b.time), 'pt-BR'));
}
