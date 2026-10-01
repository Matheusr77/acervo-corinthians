/**
 * Gera a base geográfica do mapa (roda só quando a base precisar ser refeita):
 *
 *   npm run mapa:base
 *
 * Saídas (já versionadas no projeto):
 *   public/assets/geo/brasil.json      contorno dos estados (SVG, já projetado)
 *   public/assets/geo/mundo.json       contorno dos países (SVG, já projetado)
 *   server/assets/geo/municipios.json  posição (x, y) de cada município no mapa do Brasil
 *   server/assets/geo/paises.json      nome do país em português → código ISO
 *
 * Fontes (licenças permissivas):
 *   - Estados: github.com/giuliano-oliveira/geodata-br-states (MIT; dados LAGEAMB/UFPR)
 *   - Municípios: github.com/kelvins/municipios-brasileiros (MIT; dados IBGE)
 *   - Países: pacote world-atlas (Natural Earth, domínio público)
 *   - Nomes dos países: pacote i18n-iso-countries (MIT)
 */

import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { geoMercator, geoNaturalEarth1, geoPath } from 'd3-geo';
import countries from 'i18n-iso-countries';
import { feature } from 'topojson-client';
import { topology } from 'topojson-server';
import { presimplify, quantile, simplify } from 'topojson-simplify';

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const PASTA_FONTES = path.join(RAIZ, 'scripts', 'mapa', 'fontes');

const URL_ESTADOS = 'https://raw.githubusercontent.com/giuliano-oliveira/geodata-br-states/main/geojson/br_states.json';
const URL_MUNICIPIOS = 'https://raw.githubusercontent.com/kelvins/municipios-brasileiros/main/csv/municipios.csv';

/** Tamanho do desenho (unidades do viewBox). */
const BRASIL = { largura: 800, altura: 800, margem: 10 };
const MUNDO = { largura: 1000, altura: 520 };

const UF_POR_CODIGO = {
    11: 'RO',
    12: 'AC',
    13: 'AM',
    14: 'RR',
    15: 'PA',
    16: 'AP',
    17: 'TO',
    21: 'MA',
    22: 'PI',
    23: 'CE',
    24: 'RN',
    25: 'PB',
    26: 'PE',
    27: 'AL',
    28: 'SE',
    29: 'BA',
    31: 'MG',
    32: 'ES',
    33: 'RJ',
    35: 'SP',
    41: 'PR',
    42: 'SC',
    43: 'RS',
    50: 'MS',
    51: 'MT',
    52: 'GO',
    53: 'DF',
};

/** Nomes usados no banco que não são o nome oficial em português (ou países que não existem mais). */
const APELIDOS_PAISES = {
    eua: 'US',
    holanda: 'NL',
    inglaterra: 'GB',
    escocia: 'GB',
    'pais de gales': 'GB',
    'irlanda do norte': 'GB',
    iugoslavia: 'RS',
    urss: 'RU',
    'uniao sovietica': 'RU',
    tchecoslovaquia: 'CZ',
    'alemanha ocidental': 'DE',
    'alemanha oriental': 'DE',
    curacau: 'CW',
    'trinidad e tobago': 'TT',
    'coreia do sul': 'KR',
};

export const normalizar = (t) =>
    String(t ?? '')
        .normalize('NFD')
        .replace(/[̀-ͯ]/g, '')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, ' ')
        .trim();

async function baixar(url, arquivo) {
    const destino = path.join(PASTA_FONTES, arquivo);
    try {
        return await fs.readFile(destino, 'utf8');
    } catch {
        console.log(`⬇️  Baixando ${url}`);
        const resposta = await fetch(url);
        if (!resposta.ok) throw new Error(`HTTP ${resposta.status} ao baixar ${url}`);
        const texto = await resposta.text();
        await fs.mkdir(PASTA_FONTES, { recursive: true });
        await fs.writeFile(destino, texto);
        return texto;
    }
}

/** Simplifica uma FeatureCollection mantendo as fronteiras compartilhadas. */
function simplificar(colecao, nome, fracao) {
    const topo = presimplify(topology({ [nome]: colecao }));
    const simples = simplify(topo, quantile(topo, fracao));
    return feature(simples, simples.objects[nome]);
}

async function gerarBrasil() {
    const estados = JSON.parse(await baixar(URL_ESTADOS, 'br_states.json'));
    const simples = simplificar(estados, 'estados', 0.04);

    const projecao = geoMercator().fitExtent(
        [
            [BRASIL.margem, BRASIL.margem],
            [BRASIL.largura - BRASIL.margem, BRASIL.altura - BRASIL.margem],
        ],
        estados,
    );
    const caminho = geoPath(projecao).digits(1);

    const saida = {
        viewBox: [0, 0, BRASIL.largura, BRASIL.altura],
        estados: simples.features.map((f) => ({
            uf: String(f.properties.SIGLA ?? f.properties.sigla ?? f.id ?? '').toUpperCase(),
            nome: f.properties.Estado ?? f.properties.NOME ?? f.properties.nome ?? '',
            d: caminho(f),
        })),
    };

    const csv = await baixar(URL_MUNICIPIOS, 'municipios.csv');
    const [cabecalho, ...linhas] = csv.trim().split(/\r?\n/);
    const col = Object.fromEntries(cabecalho.split(',').map((c, i) => [c, i]));
    const municipios = {};
    for (const linha of linhas) {
        const c = linha.split(',');
        const uf = UF_POR_CODIGO[Number(c[col.codigo_uf])];
        const ponto = projecao([Number(c[col.longitude]), Number(c[col.latitude])]);
        if (!uf || !ponto) continue;
        municipios[`${normalizar(c[col.nome])}|${uf}`] = [
            Math.round(ponto[0] * 10) / 10,
            Math.round(ponto[1] * 10) / 10,
        ];
    }

    return { saida, municipios };
}

async function gerarMundo() {
    const topo = JSON.parse(
        await fs.readFile(path.join(RAIZ, 'node_modules', 'world-atlas', 'countries-50m.json'), 'utf8'),
    );
    countries.registerLocale(
        JSON.parse(
            await fs.readFile(path.join(RAIZ, 'node_modules', 'i18n-iso-countries', 'langs', 'pt.json'), 'utf8'),
        ),
    );

    const todos = feature(topo, topo.objects.countries);
    todos.features = todos.features.filter((f) => f.id !== '010'); // sem Antártida
    const simples = simplificar(todos, 'paises', 0.06);

    const projecao = geoNaturalEarth1().fitSize([MUNDO.largura, MUNDO.altura], todos);
    const caminho = geoPath(projecao).digits(1);

    const nomes = {};
    const paises = [];
    for (const f of simples.features) {
        const iso = countries.numericToAlpha2(f.id);
        if (!iso) continue;
        const nome = countries.getName(iso, 'pt') ?? f.properties.name;
        nomes[normalizar(nome)] = iso;
        paises.push({ iso, nome, d: caminho(f) });
    }
    Object.assign(nomes, APELIDOS_PAISES);

    return { saida: { viewBox: [0, 0, MUNDO.largura, MUNDO.altura], paises }, nomes };
}

const brasil = await gerarBrasil();
const mundo = await gerarMundo();

await fs.writeFile(path.join(RAIZ, 'public', 'assets', 'geo', 'brasil.json'), JSON.stringify(brasil.saida));
await fs.writeFile(path.join(RAIZ, 'public', 'assets', 'geo', 'mundo.json'), JSON.stringify(mundo.saida));
await fs.writeFile(path.join(RAIZ, 'server', 'assets', 'geo', 'municipios.json'), JSON.stringify(brasil.municipios));
await fs.writeFile(path.join(RAIZ, 'server', 'assets', 'geo', 'paises.json'), JSON.stringify(mundo.nomes));

console.log(
    `✅ ${brasil.saida.estados.length} estados, ${Object.keys(brasil.municipios).length} municípios, ${mundo.saida.paises.length} países`,
);
