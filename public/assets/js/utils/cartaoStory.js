/**
 * Gera a imagem "O Timão na minha vida" no formato de story (1080×1920),
 * desenhada em <canvas> no navegador. Nenhum dado sai do computador do usuário.
 */

import { formatarData, formatarNumero, formatarPorcentagem } from './format.js';

const LARGURA = 1080;
const ALTURA = 1920;
const MARGEM = 90;
const OURO = '#D4AF37';
const CINZA = '#a3a3a3';

/** Nomes curtos (singular, plural) para caber na imagem. */
const NOMES_CURTOS = {
    'Mundial de Clubes': ['Mundial', 'Mundiais'],
    'Libertadores da América': ['Libertadores', 'Libertadores'],
    'Recopa Sul-Americana': ['Recopa', 'Recopas'],
    'Campeonato Brasileiro': ['Brasileiro', 'Brasileiros'],
    'Copa do Brasil': ['Copa do Brasil', 'Copas do Brasil'],
    'Supercopa do Brasil': ['Supercopa', 'Supercopas'],
    'Campeonato Brasileiro Série B': ['Série B', 'Séries B'],
    'Torneio Rio - São Paulo': ['Rio-São Paulo', 'Rio-São Paulo'],
    'Campeonato Paulista': ['Paulista', 'Paulistas'],
};

/** Ordem em que os títulos aparecem na imagem (os que a torcida mais valoriza primeiro). */
const PRIORIDADE = [
    'Mundial de Clubes',
    'Libertadores da América',
    'Campeonato Brasileiro',
    'Copa do Brasil',
    'Campeonato Paulista',
    'Recopa Sul-Americana',
    'Supercopa do Brasil',
    'Torneio Rio - São Paulo',
    'Campeonato Brasileiro Série B',
];

/**
 * Títulos ordenados por importância para a torcida (competições fora da lista vão para o fim).
 * @template {{ nome: string }} T
 * @param {T[]} competicoes
 * @returns {T[]}
 */
export function ordenarPorPrestigio(competicoes) {
    const peso = (nome) => {
        const i = PRIORIDADE.indexOf(nome);
        return i === -1 ? PRIORIDADE.length : i;
    };
    return [...competicoes].sort((a, b) => peso(a.nome) - peso(b.nome));
}

/**
 * "4 Brasileiros", "1 Mundial"...
 * @param {{ nome: string, total: number }} c
 */
export function rotuloTitulo(c) {
    const [singular, pluralNome] = NOMES_CURTOS[c.nome] ?? [c.nome, c.nome];
    return `${c.total} ${c.total === 1 ? singular : pluralNome}`;
}

/** Espera as fontes do site (com limite de tempo: sem internet, usa a fonte padrão). */
async function carregarFontes() {
    if (!document.fonts) return;
    const fontes = ['800 100px Poppins', '700 60px Poppins', '500 40px Inter', '700 40px Inter'];
    await Promise.race([
        Promise.all(fontes.map((f) => document.fonts.load(f))),
        new Promise((r) => setTimeout(r, 2500)),
    ]).catch(() => {});
}

/** @param {string} src */
function carregarImagem(src) {
    return new Promise((resolve) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = () => resolve(null); // a imagem é decorativa: segue sem ela
        img.src = src;
    });
}

/**
 * Escreve texto reduzindo a fonte até caber na largura.
 * @param {CanvasRenderingContext2D} ctx
 * @param {string} texto
 * @param {number} x
 * @param {number} y
 * @param {{ peso: number, tamanho: number, familia: string, cor: string, larguraMax: number, alinhamento?: CanvasTextAlign }} o
 */
function texto(ctx, texto, x, y, o) {
    let tamanho = o.tamanho;
    const fonte = () => `${o.peso} ${tamanho}px ${o.familia}, system-ui, sans-serif`;
    ctx.font = fonte();
    while (ctx.measureText(texto).width > o.larguraMax && tamanho > 16) {
        tamanho -= 2;
        ctx.font = fonte();
    }
    ctx.fillStyle = o.cor;
    ctx.textAlign = o.alinhamento ?? 'left';
    ctx.fillText(texto, x, y);
}

/**
 * Desenha o cartão e devolve o PNG.
 * @param {any} dados - resposta de /api/minha-historia
 * @param {{ nome?: string, site: string }} opcoes
 * @returns {Promise<Blob>}
 */
export async function gerarCartaoStory(dados, { nome, site }) {
    await carregarFontes();
    const [fundo, logo] = await Promise.all([
        carregarImagem('/assets/img/arena-hero.jpg'),
        carregarImagem('/assets/img/logo-256.png'),
    ]);

    const canvas = document.createElement('canvas');
    canvas.width = LARGURA;
    canvas.height = ALTURA;
    const ctx = /** @type {CanvasRenderingContext2D} */ (canvas.getContext('2d'));
    const larguraUtil = LARGURA - MARGEM * 2;

    // Fundo: Arena no topo, esmaecendo para o preto
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, LARGURA, ALTURA);
    if (fundo) {
        const altura = 1000;
        const escala = Math.max(LARGURA / fundo.width, altura / fundo.height);
        const w = fundo.width * escala;
        const h = fundo.height * escala;
        ctx.globalAlpha = 0.55;
        ctx.drawImage(fundo, (LARGURA - w) / 2, 0, w, h);
        ctx.globalAlpha = 1;
        const grad = ctx.createLinearGradient(0, 200, 0, altura);
        grad.addColorStop(0, 'rgba(0,0,0,0)');
        grad.addColorStop(1, 'rgba(0,0,0,1)');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, LARGURA, altura + 2);
    }

    // Marca
    if (logo) ctx.drawImage(logo, MARGEM, 110, 120, 120);
    texto(ctx, 'ACERVO', MARGEM + 145, 162, {
        peso: 800,
        tamanho: 40,
        familia: 'Poppins',
        cor: '#fff',
        larguraMax: 600,
    });
    texto(ctx, 'CORINTHIANS', MARGEM + 145, 212, {
        peso: 800,
        tamanho: 40,
        familia: 'Poppins',
        cor: OURO,
        larguraMax: 600,
    });

    // Título
    texto(ctx, 'O TIMÃO NA', MARGEM, 640, {
        peso: 800,
        tamanho: 118,
        familia: 'Poppins',
        cor: '#fff',
        larguraMax: larguraUtil,
    });
    texto(ctx, 'MINHA VIDA', MARGEM, 770, {
        peso: 800,
        tamanho: 118,
        familia: 'Poppins',
        cor: OURO,
        larguraMax: larguraUtil,
    });
    const quem = nome ? `${nome} · desde ${formatarData(dados.desde)}` : `Desde ${formatarData(dados.desde)}`;
    texto(ctx, quem, MARGEM, 850, { peso: 500, tamanho: 44, familia: 'Inter', cor: CINZA, larguraMax: larguraUtil });

    // Três números grandes
    const numeros = [
        [formatarNumero(dados.resumo.jogos), 'JOGOS'],
        [formatarNumero(dados.resumo.vitorias), 'VITÓRIAS'],
        [formatarNumero(dados.titulos.total), dados.titulos.total === 1 ? 'TÍTULO' : 'TÍTULOS'],
    ];
    const coluna = larguraUtil / 3;
    numeros.forEach(([valor, rotulo], i) => {
        const centro = MARGEM + coluna * i + coluna / 2;
        const base = { larguraMax: coluna - 40, alinhamento: /** @type {CanvasTextAlign} */ ('center') };
        texto(ctx, valor, centro, 1040, {
            ...base,
            peso: 800,
            tamanho: 100,
            familia: 'Poppins',
            cor: i === 2 ? OURO : '#fff',
        });
        texto(ctx, rotulo, centro, 1100, { ...base, peso: 700, tamanho: 30, familia: 'Inter', cor: CINZA });
    });

    // Linha divisória
    ctx.fillStyle = '#262626';
    ctx.fillRect(MARGEM, 1170, larguraUtil, 2);

    // Títulos vividos
    let y = 1260;
    const conquistas = ordenarPorPrestigio(dados.titulos.competicoes).slice(0, 5);
    if (conquistas.length) {
        texto(ctx, 'TÍTULOS QUE EU VIVI', MARGEM, y, {
            peso: 700,
            tamanho: 30,
            familia: 'Inter',
            cor: OURO,
            larguraMax: larguraUtil,
        });
        y += 70;
        for (const c of conquistas) {
            ctx.fillStyle = OURO;
            ctx.beginPath();
            ctx.arc(MARGEM + 10, y - 16, 9, 0, Math.PI * 2);
            ctx.fill();
            texto(ctx, rotuloTitulo(c), MARGEM + 40, y, {
                peso: 700,
                tamanho: 48,
                familia: 'Poppins',
                cor: '#fff',
                larguraMax: larguraUtil - 40,
            });
            y += 72;
        }
    } else {
        texto(ctx, `${formatarPorcentagem(dados.resumo.aproveitamento)} de aproveitamento`, MARGEM, y, {
            peso: 700,
            tamanho: 52,
            familia: 'Poppins',
            cor: '#fff',
            larguraMax: larguraUtil,
        });
        y += 72;
    }

    // Derby
    const derby = dados.classicos.find((c) => c.slug === 'derby');
    if (derby && y < 1700) {
        y += 20;
        texto(ctx, `No Derby: ${derby.vitorias}V ${derby.empates}E ${derby.derrotas}D`, MARGEM, y, {
            peso: 500,
            tamanho: 40,
            familia: 'Inter',
            cor: '#d4d4d4',
            larguraMax: larguraUtil,
        });
    }

    // Rodapé
    texto(ctx, 'Descubra o seu em', MARGEM, 1780, {
        peso: 500,
        tamanho: 32,
        familia: 'Inter',
        cor: CINZA,
        larguraMax: larguraUtil,
    });
    texto(ctx, site, MARGEM, 1836, { peso: 700, tamanho: 40, familia: 'Inter', cor: '#fff', larguraMax: larguraUtil });

    return new Promise((resolve, reject) => {
        canvas.toBlob(
            (blob) => (blob ? resolve(blob) : reject(new Error('Não foi possível gerar a imagem.'))),
            'image/png',
        );
    });
}
