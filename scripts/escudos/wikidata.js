/**
 * Acesso ao Wikidata (consulta SPARQL) e ao Wikimedia Commons (imagem e licença).
 *
 * A Wikimedia pede um User-Agent que identifique o projeto e um contato:
 * defina ESCUDOS_CONTATO no .env (ex.: seu e-mail).
 */

import { lerRespostaSparql, textoSemHtml } from './correspondencia.js';

const SPARQL_URL = 'https://query.wikidata.org/sparql';
const COMMONS_API = 'https://commons.wikimedia.org/w/api.php';
const COMMONS_ARQUIVO = 'https://commons.wikimedia.org/wiki/Special:FilePath/';

const USER_AGENT = `AcervoCorinthians/2.0 (projeto academico; contato: ${process.env.ESCUDOS_CONTATO || 'nao informado'})`;
const PAUSA_MS = 400;

const esperar = (ms) => new Promise((r) => setTimeout(r, ms));

/**
 * fetch com User-Agent, tentativas e pausa entre chamadas (respeita os servidores da Wikimedia).
 * @param {string} url
 * @param {RequestInit} [opcoes]
 */
async function requisitar(url, opcoes = {}) {
    for (let tentativa = 1; tentativa <= 3; tentativa += 1) {
        await esperar(PAUSA_MS * tentativa);
        const resposta = await fetch(url, {
            ...opcoes,
            headers: { 'User-Agent': USER_AGENT, 'Api-User-Agent': USER_AGENT, ...(opcoes.headers ?? {}) },
        });
        if (resposta.ok) return resposta;
        if (resposta.status !== 429 && resposta.status < 500) {
            throw new Error(`HTTP ${resposta.status} em ${url.slice(0, 120)}`);
        }
        const espera = Number(resposta.headers.get('retry-after')) * 1000 || 5000 * tentativa;
        console.warn(`   … servidor ocupado (HTTP ${resposta.status}), nova tentativa em ${espera / 1000}s`);
        await esperar(espera);
    }
    throw new Error(`Falha após 3 tentativas: ${url.slice(0, 120)}`);
}

/**
 * Consulta SPARQL: clubes de futebol de um país que têm logo (P154) no Wikidata.
 * @param {string} pais - Nome do país em português, como está no banco (ex.: "Brasil")
 */
function consultaDoPais(pais) {
    const literal = JSON.stringify(pais); // escapa aspas
    return `
SELECT ?clube (SAMPLE(?r) AS ?rotulo) (SAMPLE(?re) AS ?rotuloEn) (SAMPLE(?l) AS ?logo)
       (GROUP_CONCAT(DISTINCT ?a; separator="|") AS ?apelidos) (SAMPLE(?c) AS ?cidade)
WHERE {
  ?pais rdfs:label ${literal}@pt .
  ?clube wdt:P31 wd:Q476028 ;
         wdt:P17 ?pais ;
         wdt:P154 ?l .
  OPTIONAL { ?clube rdfs:label ?r FILTER(LANG(?r) = "pt") }
  OPTIONAL { ?clube rdfs:label ?re FILTER(LANG(?re) = "en") }
  OPTIONAL { ?clube skos:altLabel ?a FILTER(LANG(?a) IN ("pt", "pt-br", "en")) }
  OPTIONAL { ?clube wdt:P159|wdt:P131 ?sede . ?sede rdfs:label ?c FILTER(LANG(?c) = "pt") }
}
GROUP BY ?clube`;
}

/**
 * Clubes (com escudo) de um país.
 * @param {string} pais
 */
export async function clubesDoPais(pais) {
    const resposta = await requisitar(SPARQL_URL, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            Accept: 'application/sparql-results+json',
        },
        body: new URLSearchParams({ query: consultaDoPais(pais) }),
    });
    return lerRespostaSparql(await resposta.json());
}

/**
 * Autor, licença e página do arquivo no Commons (para os créditos).
 * @param {string} arquivo - ex.: "Palmeiras logo.svg"
 */
export async function infoDoArquivo(arquivo) {
    const params = new URLSearchParams({
        action: 'query',
        format: 'json',
        prop: 'imageinfo',
        iiprop: 'url|extmetadata',
        titles: `File:${arquivo}`,
    });
    const json = await (await requisitar(`${COMMONS_API}?${params}`)).json();
    const pagina = Object.values(json.query?.pages ?? {})[0];
    const info = pagina?.imageinfo?.[0];
    const meta = info?.extmetadata ?? {};
    return {
        autor: textoSemHtml(meta.Artist?.value),
        licenca: meta.LicenseShortName?.value ?? null,
        licencaUrl: meta.LicenseUrl?.value ?? null,
        fonte: info?.descriptionurl ?? `https://commons.wikimedia.org/wiki/File:${encodeURIComponent(arquivo)}`,
    };
}

/**
 * Baixa a imagem já redimensionada (SVGs chegam convertidos em PNG).
 * @param {string} arquivo
 * @param {number} largura
 * @returns {Promise<{ dados: Buffer, extensao: string }>}
 */
export async function baixarImagem(arquivo, largura) {
    const url = `${COMMONS_ARQUIVO}${encodeURIComponent(arquivo)}?width=${largura}`;
    const resposta = await requisitar(url);
    const tipo = resposta.headers.get('content-type') ?? '';
    const extensao = tipo.includes('png')
        ? 'png'
        : tipo.includes('jpeg')
          ? 'jpg'
          : tipo.includes('webp')
            ? 'webp'
            : tipo.includes('svg')
              ? 'svg'
              : 'png';
    return { dados: Buffer.from(await resposta.arrayBuffer()), extensao };
}
