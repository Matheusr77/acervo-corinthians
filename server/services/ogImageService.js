/**
 * Imagem de prévia (Open Graph) de cada jogo: placar, escudos e competição.
 * É o que aparece quando alguém manda o link do jogo no WhatsApp, X, Telegram...
 *
 * Desenhada como SVG e convertida em PNG com resvg (sem navegador), usando a
 * fonte Poppins que vem com o projeto (server/assets/fonts, licença OFL).
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Resvg } from '@resvg/resvg-js';
import config from '../config/index.js';
import * as jogosRepo from '../repositories/jogosRepository.js';
import { mapearJogo } from '../repositories/mappers.js';

const LARGURA = 1200;
const ALTURA = 630;
const OURO = '#D4AF37';
const MAX_CACHE = 300;

const PASTA_FONTES = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'assets', 'fonts');
const FONTES = ['Poppins_500Medium.ttf', 'Poppins_700Bold.ttf', 'Poppins_800ExtraBold.ttf'].map((f) =>
    path.join(PASTA_FONTES, f),
);

/** Cache simples em memória (os jogos são históricos: a imagem não muda). */
const cache = new Map();

const ESCAPES = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
const xml = (v) => String(v ?? '').replace(/[&<>"']/g, (c) => ESCAPES[c]);
const dataBr = (iso) => iso.split('-').reverse().join('/');

/** Lê um arquivo público como data URI (só PNG/JPG, que o resvg desenha). */
function dataUri(urlPublica) {
    if (!urlPublica) return null;
    const ext = path.extname(urlPublica).toLowerCase();
    const tipo = { '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg' }[ext];
    if (!tipo) return null;
    try {
        const arquivo = path.join(config.paths.public, urlPublica.replace(/^\/+/, ''));
        return `data:${tipo};base64,${fs.readFileSync(arquivo).toString('base64')}`;
    } catch {
        return null;
    }
}

/**
 * Tamanho de fonte que faz o texto caber na largura (estimativa por caractere).
 * @param {string} texto
 * @param {number} tamanho
 * @param {number} larguraMax
 */
export function ajustarFonte(texto, tamanho, larguraMax) {
    const larguraEstimada = String(texto).length * tamanho * 0.58;
    return larguraEstimada <= larguraMax
        ? tamanho
        : Math.max(18, Math.floor(larguraMax / (String(texto).length * 0.58)));
}

/** Escudo (imagem) ou círculo com a sigla. */
function escudoSvg(time, cx, cy, eClube) {
    const img = dataUri(time.escudo);
    if (img) {
        return `<image href="${img}" x="${cx - 80}" y="${cy - 80}" width="160" height="160" preserveAspectRatio="xMidYMid meet"/>`;
    }
    const sigla = eClube ? 'CP' : (time.sigla || time.nome.slice(0, 3)).toUpperCase();
    const [bg, fg] = eClube ? ['#ffffff', '#000000'] : ['#262626', '#ffffff'];
    return `
        <circle cx="${cx}" cy="${cy}" r="78" fill="${bg}" stroke="#404040" stroke-width="6"/>
        <text x="${cx}" y="${cy + 18}" text-anchor="middle" font-family="Poppins" font-weight="800" font-size="${ajustarFonte(sigla, 52, 120)}" fill="${fg}">${xml(sigla)}</text>`;
}

/**
 * Monta o SVG do jogo.
 * @param {ReturnType<typeof mapearJogo>} j
 */
export function svgDoJogo(j) {
    const eClube = (t) => t.id !== j.adversario.id;
    const rotuloResultado = { V: 'VITÓRIA', E: 'EMPATE', D: 'DERROTA' }[j.resultado] ?? '';
    const corResultado = { V: '#16a34a', E: '#737373', D: '#dc2626' }[j.resultado] ?? '#404040';
    const competicao = [j.campeonato?.nome, j.fase].filter(Boolean).join(' · ').toUpperCase();
    const rodape = [dataBr(j.data), j.estadio?.nome].filter(Boolean).join(' · ');
    const placar = `${j.placar.mandante ?? '–'}  x  ${j.placar.visitante ?? '–'}`;

    const nome = (time, x) => {
        const tamanho = ajustarFonte(time.nome, 38, 340);
        return `<text x="${x}" y="440" text-anchor="middle" font-family="Poppins" font-weight="700" font-size="${tamanho}" fill="#ffffff">${xml(time.nome)}</text>`;
    };

    return `<svg xmlns="http://www.w3.org/2000/svg" width="${LARGURA}" height="${ALTURA}" viewBox="0 0 ${LARGURA} ${ALTURA}">
    <defs>
        <radialGradient id="brilho" cx="0.5" cy="0.45" r="0.75">
            <stop offset="0" stop-color="#262626"/>
            <stop offset="1" stop-color="#000000"/>
        </radialGradient>
    </defs>
    <rect width="100%" height="100%" fill="#000"/>
    <rect width="100%" height="100%" fill="url(#brilho)"/>
    <rect x="0" y="0" width="${LARGURA}" height="8" fill="${OURO}"/>

    <text x="60" y="78" font-family="Poppins" font-weight="800" font-size="30" fill="#ffffff">ACERVO <tspan fill="${OURO}">CORINTHIANS</tspan></text>
    ${j.jogoDoTitulo ? `<rect x="${LARGURA - 260}" y="44" width="200" height="48" rx="24" fill="${OURO}"/><text x="${LARGURA - 160}" y="77" text-anchor="middle" font-family="Poppins" font-weight="800" font-size="24" fill="#000">CAMPEÃO</text>` : ''}

    <text x="${LARGURA / 2}" y="150" text-anchor="middle" font-family="Poppins" font-weight="700" font-size="${ajustarFonte(competicao, 26, 1000)}" fill="${OURO}" letter-spacing="3">${xml(competicao)}</text>

    ${escudoSvg(j.mandante, 230, 300, eClube(j.mandante))}
    ${escudoSvg(j.visitante, LARGURA - 230, 300, eClube(j.visitante))}
    ${nome(j.mandante, 230)}
    ${nome(j.visitante, LARGURA - 230)}

    <text x="${LARGURA / 2}" y="335" text-anchor="middle" font-family="Poppins" font-weight="800" font-size="120" fill="#ffffff">${xml(placar)}</text>
    ${rotuloResultado ? `<rect x="${LARGURA / 2 - 90}" y="380" width="180" height="44" rx="22" fill="${corResultado}"/><text x="${LARGURA / 2}" y="410" text-anchor="middle" font-family="Poppins" font-weight="700" font-size="22" fill="#fff">${rotuloResultado}</text>` : ''}

    <text x="${LARGURA / 2}" y="560" text-anchor="middle" font-family="Poppins" font-weight="500" font-size="${ajustarFonte(rodape, 28, 1080)}" fill="#d4d4d4">${xml(rodape)}</text>
</svg>`;
}

/**
 * PNG da prévia do jogo (null se o jogo não existir).
 * @param {number} id
 * @returns {Promise<Buffer | null>}
 */
export async function imagemDoJogo(id) {
    if (cache.has(id)) return cache.get(id);

    const row = await jogosRepo.buscarPorId(id);
    if (!row) return null;

    const resvg = new Resvg(svgDoJogo(mapearJogo(row)), {
        fitTo: { mode: 'width', value: LARGURA },
        font: { fontFiles: FONTES, loadSystemFonts: false, defaultFontFamily: 'Poppins' },
    });
    const png = resvg.render().asPng();

    if (cache.size >= MAX_CACHE) cache.delete(cache.keys().next().value);
    cache.set(id, png);
    return png;
}
