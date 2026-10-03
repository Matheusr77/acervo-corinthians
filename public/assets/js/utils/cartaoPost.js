/**
 * Imagens prontas para as redes do @sccpacervo (painel /admin/posts):
 *  - "Hoje na História": um jogo do Timão na data de hoje;
 *  - "Aniversário": um título conquistado nesta data.
 * Desenhadas em <canvas>, nos tamanhos do X, do feed e do story do Instagram.
 */

import { SIGLA_CLUBE } from '../components/game.js';
import { formatarData } from './format.js';

export const FORMATOS_POST = {
    x: { nome: 'X', descricao: '1600×900', largura: 1600, altura: 900 },
    feed: { nome: 'Feed', descricao: '1080×1350', largura: 1080, altura: 1350 },
    story: { nome: 'Story', descricao: '1080×1920', largura: 1080, altura: 1920 },
};

const OURO = '#D4AF37';
const COR_RESULTADO = { V: '#16a34a', E: '#737373', D: '#dc2626' };
const ROTULO_RESULTADO = { V: 'VITÓRIA', E: 'EMPATE', D: 'DERROTA' };
const MESES = [
    'janeiro',
    'fevereiro',
    'março',
    'abril',
    'maio',
    'junho',
    'julho',
    'agosto',
    'setembro',
    'outubro',
    'novembro',
    'dezembro',
];

/** "13 de outubro de 1977" */
export function dataExtensa(iso) {
    const [a, m, d] = iso.split('-').map(Number);
    return `${d} de ${MESES[m - 1]} de ${a}`;
}

/** Anos completos entre a data do jogo e a data de referência (AAAA-MM-DD). */
export function anosDesde(iso, referencia) {
    const [a1, m1, d1] = iso.split('-').map(Number);
    const [a2, m2, d2] = referencia.split('-').map(Number);
    return a2 - a1 - (m2 < m1 || (m2 === m1 && d2 < d1) ? 1 : 0);
}

const placarTexto = (j) => `${j.placar.mandante ?? '–'} x ${j.placar.visitante ?? '–'}`;
const linhaJogo = (j) => `${j.mandante.nome} ${placarTexto(j)} ${j.visitante.nome}`;
const hashtagDe = (nome) =>
    `#${nome
        .normalize('NFD')
        .replace(/[̀-ͯ]/g, '')
        .replace(/[^A-Za-z0-9 ]/g, '')
        .split(' ')
        .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
        .join('')}`;

/**
 * Legenda pronta para colar no post.
 * @param {{ tipo: 'hoje', jogo: any } | { tipo: 'aniversario', jogo: any, competicao: string, edicao: number | string }} post
 * @param {string} hoje - AAAA-MM-DD (para o "há N anos")
 * @param {string} site
 */
export function legendaPost(post, hoje, site) {
    const j = post.jogo;
    const anos = anosDesde(j.data, hoje);
    const competicao = [j.campeonato?.nome, j.fase].filter(Boolean).join(', ');
    const estadio = j.estadio?.nome ? `\n📍 ${j.estadio.nome}` : '';
    const tags = ['#Corinthians', '#VaiCorinthians'];
    const haAnos = `${anos} ${anos === 1 ? 'ano' : 'anos'}`;
    let texto;
    if (post.tipo === 'aniversario') {
        texto =
            `🏆 Há ${haAnos}, o Corinthians era campeão: ${post.competicao} ${post.edicao}!\n\n` +
            `Na decisão, em ${formatarData(j.data)}: ${linhaJogo(j)}.${estadio}`;
        tags.push(hashtagDe(post.competicao), '#Campeão');
    } else {
        const reacao = { V: 'Vitória do Timão! ⚫⚪', E: 'Empate.', D: 'Derrota.' }[j.resultado] ?? '';
        texto =
            `📅 Hoje na história, há ${haAnos} (${formatarData(j.data)}): ${linhaJogo(j)}` +
            `${competicao ? ` (${competicao})` : ''}. ${reacao}${estadio}` +
            (j.observacoes ? `\n\n🏆 ${j.observacoes}` : '');
        tags.push('#HojeNaHistória');
    }
    return `${texto}\n\n🦅 Veja mais em ${site}\n${tags.join(' ')}`;
}

// ---------------------------------------------------------------------------
// Desenho
// ---------------------------------------------------------------------------

async function carregarFontes() {
    if (!document.fonts) return;
    const fontes = ['800 100px Poppins', '700 60px Poppins', '500 40px Inter', '700 40px Inter'];
    await Promise.race([
        Promise.all(fontes.map((f) => document.fonts.load(f))),
        new Promise((r) => setTimeout(r, 2500)),
    ]).catch(() => {});
}

const imagens = new Map();
function carregarImagem(src) {
    if (!imagens.has(src)) {
        imagens.set(
            src,
            new Promise((resolve) => {
                const img = new Image();
                img.onload = () => resolve(img);
                img.onerror = () => resolve(null);
                img.src = src;
            }),
        );
    }
    return imagens.get(src);
}

/** Texto que diminui até caber. Devolve a largura final. */
function texto(ctx, t, x, y, { tamanho, peso = 700, familia = 'Poppins', cor = '#fff', max, alinhar = 'center' }) {
    let tam = tamanho;
    const fonte = () => `${peso} ${tam}px ${familia}, system-ui, sans-serif`;
    ctx.font = fonte();
    while (max && ctx.measureText(t).width > max && tam > 12) {
        tam -= 2;
        ctx.font = fonte();
    }
    ctx.fillStyle = cor;
    ctx.textAlign = alinhar;
    ctx.fillText(t, x, y);
    return ctx.measureText(t).width;
}

function pilula(ctx, t, cx, y, { tamanho, fundo, cor }) {
    ctx.font = `800 ${tamanho}px Poppins, system-ui, sans-serif`;
    const w = ctx.measureText(t).width + tamanho * 1.6;
    const h = tamanho * 1.9;
    ctx.fillStyle = fundo;
    ctx.beginPath();
    ctx.roundRect(cx - w / 2, y - h * 0.68, w, h, h / 2);
    ctx.fill();
    texto(ctx, t, cx, y, { tamanho, peso: 800, cor });
}

function escudo(ctx, time, cx, cy, r, eClube) {
    const sigla = eClube ? SIGLA_CLUBE : (time.sigla || time.nome.slice(0, 3)).toUpperCase();
    ctx.fillStyle = eClube ? '#ffffff' : '#262626';
    ctx.strokeStyle = '#404040';
    ctx.lineWidth = r * 0.08;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    texto(ctx, sigla, cx, cy + r * 0.24, {
        tamanho: Math.round(r * (sigla.length > 3 ? 0.52 : 0.66)),
        peso: 800,
        cor: eClube ? '#000' : '#fff',
        max: r * 1.6,
    });
}

/**
 * Gera a imagem do post.
 * @param {{ tipo: 'hoje' | 'aniversario', jogo: any, competicao?: string, edicao?: number | string }} post
 * @param {{ formato: keyof typeof FORMATOS_POST, hoje: string, site: string }} opcoes
 * @returns {Promise<Blob>}
 */
export async function gerarPost(post, { formato, hoje, site }) {
    const F = FORMATOS_POST[formato] ?? FORMATOS_POST.x;
    const W = F.largura;
    const H = F.altura;
    const k = formato === 'x' ? 0.82 : formato === 'story' ? 1.12 : 1; // escala do texto
    const j = post.jogo;
    const aniversario = post.tipo === 'aniversario';
    const anos = anosDesde(j.data, hoje);

    await carregarFontes();
    const canvas = document.createElement('canvas');
    canvas.width = W;
    canvas.height = H;
    const ctx = /** @type {CanvasRenderingContext2D} */ (canvas.getContext('2d'));

    // Fundo: preto, Arena esmaecida e brilho dourado no aniversário
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, W, H);
    const fundo = await carregarImagem(
        aniversario ? '/assets/img/story/bicampeao.jpg' : '/assets/img/story/acervo.jpg',
    );
    if (fundo) {
        const esc = Math.max(W / fundo.width, H / fundo.height);
        ctx.globalAlpha = 0.28;
        ctx.drawImage(
            fundo,
            (W - fundo.width * esc) / 2,
            (H - fundo.height * esc) / 2,
            fundo.width * esc,
            fundo.height * esc,
        );
        ctx.globalAlpha = 1;
    }
    const brilho = ctx.createRadialGradient(W / 2, H * 0.45, 0, W / 2, H * 0.45, Math.max(W, H) * 0.7);
    brilho.addColorStop(0, aniversario ? 'rgba(212,175,55,0.18)' : 'rgba(40,40,40,0.35)');
    brilho.addColorStop(1, 'rgba(0,0,0,0.85)');
    ctx.fillStyle = brilho;
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = OURO;
    ctx.fillRect(0, 0, W, Math.round(8 * k));

    // Marca no topo
    const logo = await carregarImagem('/assets/img/logo-256.png');
    const m = Math.round(60 * k);
    const tamLogo = Math.round(84 * k);
    if (logo) ctx.drawImage(logo, m, m, tamLogo, tamLogo);
    texto(ctx, 'ACERVO', m + tamLogo * 1.18, m + tamLogo * 0.46, {
        tamanho: Math.round(30 * k),
        peso: 800,
        alinhar: 'left',
    });
    texto(ctx, 'CORINTHIANS', m + tamLogo * 1.18, m + tamLogo * 0.86, {
        tamanho: Math.round(30 * k),
        peso: 800,
        cor: OURO,
        alinhar: 'left',
    });

    // Bloco central, montado de cima para baixo e centralizado na altura livre
    const cx = W / 2;
    const max = W - m * 2;
    const blocos = [];
    const add = (altura, desenhar) => blocos.push({ altura, desenhar });

    add(70 * k, (y) =>
        pilula(ctx, aniversario ? 'ANIVERSÁRIO DE CONQUISTA' : 'HOJE NA HISTÓRIA', cx, y + 40 * k, {
            tamanho: Math.round(26 * k),
            fundo: aniversario ? OURO : '#ffffff',
            cor: '#000',
        }),
    );
    if (aniversario) {
        add(150 * k, (y) =>
            texto(ctx, `HÁ ${anos} ${anos === 1 ? 'ANO' : 'ANOS'}`, cx, y + 120 * k, {
                tamanho: Math.round(118 * k),
                peso: 800,
                cor: OURO,
                max,
            }),
        );
        add(80 * k, (y) =>
            texto(ctx, `${post.competicao} ${post.edicao}`.toUpperCase(), cx, y + 58 * k, {
                tamanho: Math.round(52 * k),
                peso: 800,
                max,
            }),
        );
    } else {
        add(110 * k, (y) =>
            texto(ctx, dataExtensa(j.data).toUpperCase(), cx, y + 80 * k, {
                tamanho: Math.round(64 * k),
                peso: 800,
                max,
            }),
        );
        add(56 * k, (y) =>
            texto(ctx, `Há ${anos} ${anos === 1 ? 'ano' : 'anos'}`, cx, y + 40 * k, {
                tamanho: Math.round(36 * k),
                peso: 500,
                familia: 'Inter',
                cor: '#a3a3a3',
            }),
        );
    }
    const competicao = [j.campeonato?.nome, j.fase].filter(Boolean).join(' · ').toUpperCase();
    if (competicao) {
        add(60 * k, (y) => texto(ctx, competicao, cx, y + 44 * k, { tamanho: Math.round(28 * k), cor: OURO, max }));
    }

    // Placar: escudos (círculo com a sigla), nomes e números
    const r = Math.round((formato === 'x' ? 78 : 92) * k);
    const altPlacar = r * 2 + 110 * k;
    add(altPlacar, (y) => {
        const yc = y + r + 10 * k;
        const dx = Math.min(W * 0.3, 380 * k);
        const eClube = (t) => t.id !== j.adversario.id;
        escudo(ctx, j.mandante, cx - dx, yc, r, eClube(j.mandante));
        escudo(ctx, j.visitante, cx + dx, yc, r, eClube(j.visitante));
        texto(ctx, placarTexto(j).replace(' x ', '  x  '), cx, yc + 44 * k, {
            tamanho: Math.round(118 * k),
            peso: 800,
        });
        const largNome = dx * 1.2;
        texto(ctx, j.mandante.nome, cx - dx, yc + r + 60 * k, { tamanho: Math.round(36 * k), max: largNome });
        texto(ctx, j.visitante.nome, cx + dx, yc + r + 60 * k, { tamanho: Math.round(36 * k), max: largNome });
    });
    if (!aniversario && j.resultado) {
        add(80 * k, (y) =>
            pilula(ctx, ROTULO_RESULTADO[j.resultado], cx, y + 46 * k, {
                tamanho: Math.round(26 * k),
                fundo: COR_RESULTADO[j.resultado],
                cor: '#fff',
            }),
        );
    }
    const local = [formatarData(j.data), j.estadio?.nome].filter(Boolean).join(' · ');
    add(56 * k, (y) =>
        texto(ctx, aniversario ? `Final: ${local}` : (j.estadio?.nome ?? ''), cx, y + 40 * k, {
            tamanho: Math.round(30 * k),
            peso: 500,
            familia: 'Inter',
            cor: '#d4d4d4',
            max,
        }),
    );
    if (!aniversario && j.observacoes && formato !== 'x') {
        add(70 * k, (y) =>
            texto(ctx, j.observacoes, cx, y + 50 * k, {
                tamanho: Math.round(30 * k),
                peso: 700,
                familia: 'Inter',
                cor: OURO,
                max,
            }),
        );
    }

    const topo = m + tamLogo + 20 * k;
    const base = H - m - 70 * k;
    const total = blocos.reduce((s, b) => s + b.altura, 0);
    let y = topo + Math.max(0, (base - topo - total) / 2);
    for (const b of blocos) {
        b.desenhar(y);
        y += b.altura;
    }

    // Rodapé
    const largSite = (() => {
        ctx.font = `700 ${Math.round(30 * k)}px Inter, system-ui, sans-serif`;
        return ctx.measureText(`${site}  ·  @sccpacervo`).width;
    })();
    const x0 = cx - largSite / 2;
    const ySite = H - m;
    const w1 = texto(ctx, site, x0, ySite, { tamanho: Math.round(30 * k), familia: 'Inter', alinhar: 'left' });
    texto(ctx, '  ·  @sccpacervo', x0 + w1, ySite, {
        tamanho: Math.round(30 * k),
        familia: 'Inter',
        cor: OURO,
        alinhar: 'left',
    });

    return new Promise((resolve, reject) => {
        canvas.toBlob(
            (blob) => (blob ? resolve(blob) : reject(new Error('Não foi possível gerar a imagem.'))),
            'image/png',
        );
    });
}
