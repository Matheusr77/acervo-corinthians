/**
 * SEO e prévia de links (Open Graph).
 *
 * Robôs de busca e apps de mensagem (WhatsApp, Telegram...) não executam o
 * JavaScript da SPA. Por isso o servidor já entrega o index.html com título,
 * descrição e imagem corretos para cada rota, e responde 404 para rotas
 * inexistentes. Também gera o sitemap.xml e o robots.txt.
 */

import fs from 'node:fs/promises';
import path from 'node:path';
import config from '../config/index.js';
import * as jogosRepo from '../repositories/jogosRepository.js';
import * as statsRepo from '../repositories/estatisticasRepository.js';
import { mapearJogo } from '../repositories/mappers.js';
import { comCache } from '../utils/cache.js';
import { montarResumo } from '../utils/estatisticas.js';
import * as classicosService from './classicosService.js';
import * as estadiosService from './estadiosService.js';
import * as estatisticasService from './estatisticasService.js';
import * as titulosService from './titulosService.js';

const SITE_NAME = 'Acervo Corinthians';
const DESCRICAO_PADRAO =
    'Acervo histórico de jogos do Sport Club Corinthians Paulista: resultados, temporadas, clássicos, títulos e estatísticas desde 1910.';
const IMAGEM = '/assets/img/og-cover.jpg';
const INDEX_PATH = path.join(config.paths.public, 'index.html');

/** @typedef {{ status: number, titulo: string | null, descricao: string, imagem?: string, noindex?: boolean }} Meta */

const ESCAPES = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
const esc = (v) => String(v).replace(/[&<>"']/g, (c) => ESCAPES[c]);
const numero = (n) => new Intl.NumberFormat('pt-BR').format(n);
const data = (iso) => (iso ? iso.split('-').reverse().join('/') : '');
const pct = (n) => (n === null ? '—' : `${n.toFixed(1).replace('.', ',')}%`);

/** @param {ReturnType<typeof montarResumo>} r */
function resumoTexto(r) {
    return `${numero(r.jogos)} jogos · ${r.vitorias}V ${r.empates}E ${r.derrotas}D · ${pct(r.aproveitamento)} de aproveitamento`;
}

const naoEncontrado = () => ({ status: 404, titulo: 'Página não encontrada', descricao: DESCRICAO_PADRAO });
const ok = (titulo, descricao = DESCRICAO_PADRAO) => ({ status: 200, titulo, descricao });

const ESTATICAS = {
    '/': ok(null),
    '/jogos': ok('Jogos', 'Todos os jogos do Corinthians desde 1910, com filtros por ano, competição e adversário.'),
    '/temporadas': ok('Temporadas', 'A história do Corinthians temporada por temporada, de 1910 até hoje.'),
    '/adversarios': ok('Confrontos', 'Retrospecto do Corinthians contra cada adversário da sua história.'),
    '/classicos': ok(
        'Clássicos',
        'Derby, Majestoso e Clássico Alvinegro: o retrospecto do Corinthians contra os grandes rivais.',
    ),
    '/fregueses': ok('Fregueses & Tabus', 'Os maiores fregueses e carrascos do Corinthians, e os tabus em andamento.'),
    '/mapa': ok('O Timão pelo mapa', 'Todas as cidades e países onde o Corinthians já jogou, num mapa interativo.'),
    '/estadios': ok('Estádios', 'O retrospecto do Corinthians em cada estádio da sua história.'),
    '/quiz': ok('Quiz do Timão', 'Cinco perguntas por dia sobre a história do Corinthians. Quanto você sabe?'),
    '/estatisticas': ok('Estatísticas', 'Números gerais, recordes, sequências e gráficos da história do Corinthians.'),
    '/hoje': ok(
        'Hoje na História',
        'O que o Corinthians aprontou neste dia ao longo da história? Todos os jogos do Timão nesta data.',
    ),
    '/minha-historia': ok(
        'O Timão na sua vida',
        'Coloque sua data de nascimento e descubra quantos jogos, vitórias e títulos o Corinthians viveu com você.',
    ),
    '/sobre': ok('Sobre', DESCRICAO_PADRAO),
};

/** Rotas dinâmicas: padrão → função que busca os dados e monta a meta. */
const DINAMICAS = [
    [
        /^\/jogos\/(\d+)$/,
        async ([, id]) => {
            const row = await jogosRepo.buscarPorId(Number(id));
            if (!row) return naoEncontrado();
            const j = mapearJogo(row);
            const placar = `${j.mandante.nome} ${j.placar.mandante ?? ''} x ${j.placar.visitante ?? ''} ${j.visitante.nome}`;
            const detalhes = [j.campeonato?.nome, j.fase, data(j.data), j.estadio?.nome].filter(Boolean).join(' · ');
            return { ...ok(`${placar} (${data(j.data)})`, detalhes), imagem: `/og/jogo/${j.id}.png` };
        },
    ],
    [
        /^\/temporadas\/(\d{4})$/,
        async ([, ano]) => {
            const t = (await estatisticasService.temporadas()).find((x) => x.ano === Number(ano));
            return t ? ok(`Temporada ${ano}`, `Corinthians em ${ano}: ${resumoTexto(t)}.`) : naoEncontrado();
        },
    ],
    [
        /^\/adversarios\/(\d+)$/,
        async ([, id]) => {
            const filtro = { adversarioId: Number(id) };
            const [time, r] = await Promise.all([statsRepo.buscarTime(Number(id)), statsRepo.resumo(filtro)]);
            if (!time || !r || Number(r.jogos) === 0) return naoEncontrado();
            return ok(
                `Corinthians x ${time.nome}`,
                `Retrospecto contra ${time.nome}: ${resumoTexto(montarResumo(r))}.`,
            );
        },
    ],
    [
        /^\/classicos\/([a-z-]+)$/,
        async ([, slug]) => {
            const c = (await classicosService.listar()).find((x) => x.slug === slug);
            return c
                ? ok(`${c.nome}: Corinthians x ${c.rival.nome}`, `${c.descricao} ${resumoTexto(c.resumo)}.`)
                : naoEncontrado();
        },
    ],
    [
        /^\/estadios\/(\d+)$/,
        async ([, id]) => {
            const e = (await estadiosService.listar()).find((x) => x.id === Number(id));
            return e ? ok(`Corinthians no ${e.nome}`, `Retrospecto no ${e.nome}: ${resumoTexto(e)}.`) : naoEncontrado();
        },
    ],
    [
        /^\/titulos$/,
        async () => {
            const t = await titulosService.titulos();
            return ok('Títulos', `A sala de troféus do Corinthians: ${t.total} conquistas registradas no acervo.`);
        },
    ],
];

/**
 * Meta tags da rota (com status HTTP). Falhas no banco não derrubam a página:
 * nesse caso usa a meta padrão.
 * @param {string} pathname
 * @returns {Promise<Meta>}
 */
export async function metaDaRota(pathname) {
    const rota = pathname.length > 1 ? pathname.replace(/\/+$/, '') : pathname;
    if (ESTATICAS[rota]) return ESTATICAS[rota];
    // Painel de administração: existe, mas não entra no Google nem no sitemap
    if (rota === '/admin/correcoes') return { ...ok('Correções recebidas'), noindex: true };

    for (const [padrao, montar] of DINAMICAS) {
        const m = padrao.exec(rota);
        if (!m) continue;
        try {
            return await montar(m);
        } catch (err) {
            console.error('[seo] falha ao montar meta tags:', err.message);
            return ok(null);
        }
    }
    return naoEncontrado();
}

/**
 * URL pública do site: SITE_URL do .env ou, na falta dela, o host da requisição.
 * @param {import('express').Request} req
 */
export function urlBase(req) {
    return (config.siteUrl ?? `${req.protocol}://${req.get('host')}`).replace(/\/+$/, '');
}

async function lerIndex() {
    return fs.readFile(INDEX_PATH, 'utf8');
}

/**
 * index.html com as meta tags da rota aplicadas.
 * @param {Meta} meta
 * @param {string} url - URL absoluta da página
 * @param {string} base - URL base do site
 */
export async function renderIndex(meta, url, base) {
    const template = config.isProduction ? await comCache('seo:index', lerIndex, Infinity) : await lerIndex();
    const titulo = meta.titulo ? `${meta.titulo} · ${SITE_NAME}` : SITE_NAME;
    const imagem = `${base}${meta.imagem ?? IMAGEM}`;

    const tags = [
        `<title>${esc(titulo)}</title>`,
        `<meta name="description" content="${esc(meta.descricao)}" />`,
        meta.status === 404 || meta.noindex
            ? '<meta name="robots" content="noindex" />'
            : `<link rel="canonical" href="${esc(url)}" />`,
        '<meta property="og:type" content="website" />',
        `<meta property="og:site_name" content="${SITE_NAME}" />`,
        '<meta property="og:locale" content="pt_BR" />',
        `<meta property="og:title" content="${esc(titulo)}" />`,
        `<meta property="og:description" content="${esc(meta.descricao)}" />`,
        `<meta property="og:url" content="${esc(url)}" />`,
        `<meta property="og:image" content="${esc(imagem)}" />`,
        '<meta property="og:image:width" content="1200" />',
        '<meta property="og:image:height" content="630" />',
        '<meta name="twitter:card" content="summary_large_image" />',
    ].join('\n        ');

    return template.replace(
        /<!-- seo:start -->[\s\S]*?<!-- seo:end -->/,
        `<!-- seo:start -->\n        ${tags}\n        <!-- seo:end -->`,
    );
}

/**
 * sitemap.xml com as páginas principais, temporadas, clássicos, adversários e jogos.
 * @param {string} base
 */
export function sitemap(base) {
    return comCache(`seo:sitemap:${base}`, async () => {
        const [temporadas, adversarios, classicos, jogos, estadios] = await Promise.all([
            estatisticasService.temporadas(),
            statsRepo.porAdversario(),
            classicosService.slugs(),
            jogosRepo.listarRecentes(100000),
            estadiosService.listar(),
        ]);
        const urls = [
            ...Object.keys(ESTATICAS),
            '/titulos',
            ...classicos.map((c) => `/classicos/${c.slug}`),
            ...estadios.map((e) => `/estadios/${e.id}`),
            ...temporadas.map((t) => `/temporadas/${t.ano}`),
            ...adversarios.map((a) => `/adversarios/${a.id}`),
            ...jogos.map((j) => `/jogos/${j.id_jogo}`),
        ];
        const itens = urls.map((u) => `  <url><loc>${esc(base + u)}</loc></url>`).join('\n');
        return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${itens}\n</urlset>\n`;
    });
}

/** @param {string} base */
export function robots(base) {
    return `User-agent: *\nAllow: /\nDisallow: /api/\nDisallow: /admin\n\nSitemap: ${base}/sitemap.xml\n`;
}
