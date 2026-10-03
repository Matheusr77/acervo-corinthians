/**
 * Gera a imagem "O Timão na minha vida", desenhada em <canvas> no navegador.
 * Nada sai do computador do usuário (nem a foto própria, se ele escolher uma).
 *
 * Opções: modelo (fundo), formato (story, feed, quadrado), destaque, nome e frase.
 * As fotos de cada modelo ficam em /assets/img/story/{id}.jpg: para trocar uma,
 * basta substituir o arquivo (de preferência em pé, com o principal no meio).
 */

import { formatarData, formatarNumero, formatarPorcentagem } from './format.js';

const LARGURA = 1080;
const MARGEM = 90;
const PASTA = '/assets/img/story';

/**
 * Modelos de cartão.
 * escurecer: força da camada sobre a foto (0 a 1) · foco: altura do ponto principal da foto (0 = topo)
 * padrao: a imagem se repete (estampa) · desenho: fundo desenhado, sem foto
 * subir: desloca a foto para cima (fração da altura), tirando o desenho central de trás dos números
 */
export const MODELOS = [
    { id: 'acervo', nome: 'Acervo', escurecer: 0.55 },
    { id: 'arena', nome: 'Arena', escurecer: 0.45 },
    { id: 'arena2', nome: 'Arena 2', escurecer: 0.6, foco: 0.55 },
    { id: 'trofeu', nome: 'Troféu', escurecer: 0.62, foco: 0.25 },
    { id: 'mundial', nome: 'Mundial', escurecer: 0.6, foco: 0.4 },
    { id: 'bicampeao', nome: 'Bicampeão', escurecer: 0.62, foco: 0.45 },
    { id: 'democracia', nome: 'Democracia', escurecer: 0.55, foco: 0.3 },
    { id: 'fiel', nome: 'Fiel', escurecer: 0.7, foco: 0.4 },
    { id: 'gotico', nome: 'Gótico', escurecer: 0.45, subir: 0.3 },
    { id: 'grunge', nome: 'Grunge', escurecer: 0.55, subir: 0.24 },
    { id: 'minimalista', nome: 'Minimalista', escurecer: 0.25, padrao: true },
    { id: 'uniforme2', nome: 'Uniforme 2', escurecer: 0.8, padrao: true, claro: true },
    { id: 'alvinegro', nome: 'Alvinegro', escurecer: 0.78, desenho: 'listras' },
];

export const FORMATOS = {
    story: { nome: 'Story', descricao: '9:16 · Instagram e WhatsApp', altura: 1920 },
    feed: { nome: 'Feed', descricao: '4:5 · post do Instagram', altura: 1350 },
    quadrado: { nome: 'Quadrado', descricao: '1:1 · X e Facebook', altura: 1080 },
};

export const DESTAQUES = {
    titulos: 'Títulos que eu vivi',
    classicos: 'Clássicos no meu tempo',
    goleada: 'Maior goleada que eu vi',
    temporada: 'Melhor temporada que eu vi',
};

export const FRASE_CORINTHIANO = 'Corinthiano: maloqueiro, sofredor e parte de um bando de loucos.';

/** Posições e tamanhos de cada formato (em pixels da imagem final). */
const LAYOUT = {
    story: {
        marca: { y: 110, logo: 120, fonte: 40 },
        titulo: { y1: 640, y2: 770, fonte: 118 },
        quem: { y: 850, fonte: 44 },
        numeros: { y: 1040, yRotulo: 1100, fonte: 100, rotulo: 30 },
        divisoria: 1170,
        destaque: { y: 1260, max: 5, fonte: 48, passo: 72, rotulo: 30 },
        frase: { y: 1690, fonte: 30 },
        rodape: { y1: 1780, y2: 1836, fonte: 32 },
    },
    feed: {
        marca: { y: 70, logo: 90, fonte: 32 },
        titulo: { y1: 390, y2: 490, fonte: 96 },
        quem: { y: 555, fonte: 36 },
        numeros: { y: 700, yRotulo: 748, fonte: 84, rotulo: 26 },
        divisoria: 800,
        destaque: { y: 870, max: 3, fonte: 40, passo: 58, rotulo: 26 },
        frase: { y: 1135, fonte: 26 },
        rodape: { y1: 1230, y2: 1278, fonte: 28 },
    },
    quadrado: {
        marca: { y: 60, logo: 80, fonte: 30 },
        titulo: { y1: 300, y2: 390, fonte: 84 },
        quem: { y: 445, fonte: 32 },
        numeros: { y: 575, yRotulo: 620, fonte: 76, rotulo: 24 },
        divisoria: 665,
        destaque: { y: 725, max: 2, fonte: 36, passo: 52, rotulo: 24 },
        frase: null, // não cabe no quadrado
        rodape: { y1: 960, y2: 1008, fonte: 26 },
    },
};

const CORES = {
    escuro: { fundo: '#000000', texto: '#ffffff', suave: '#a3a3a3', ouro: '#D4AF37', linha: 'rgba(255,255,255,0.18)' },
    claro: { fundo: '#ffffff', texto: '#0a0a0a', suave: '#525252', ouro: '#8A6D12', linha: 'rgba(0,0,0,0.15)' },
};

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

/** Ordem em que os títulos aparecem (os que a torcida mais valoriza primeiro). */
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
    return [...competicoes].sort((a, b) => pesoTitulo(a.nome) - pesoTitulo(b.nome));
}

/** Posição do título na ordem de importância (menor = mais importante). @param {string} nome */
export function pesoTitulo(nome) {
    const i = PRIORIDADE.indexOf(nome);
    return i === -1 ? PRIORIDADE.length : i;
}

/**
 * "4 Brasileiros", "1 Mundial"...
 * @param {{ nome: string, total: number }} c
 */
export function rotuloTitulo(c) {
    const [singular, pluralNome] = NOMES_CURTOS[c.nome] ?? [c.nome, c.nome];
    return `${c.total} ${c.total === 1 ? singular : pluralNome}`;
}

/**
 * Linhas do bloco de destaque escolhido (com volta para "títulos" quando falta dado).
 * @param {any} dados - resposta de /api/minha-historia
 * @param {keyof typeof DESTAQUES} tipo
 * @returns {{ rotulo: string, linhas: string[], marcadores: boolean }}
 */
export function linhasDestaque(dados, tipo) {
    if (tipo === 'classicos' && dados.classicos?.length) {
        return {
            rotulo: 'CLÁSSICOS NO MEU TEMPO',
            linhas: dados.classicos.map(
                (c) =>
                    `${c.nome.replace(' Paulista', '').replace('Clássico ', '')}: ${c.vitorias}V ${c.empates}E ${c.derrotas}D`,
            ),
            marcadores: true,
        };
    }
    if (tipo === 'goleada' && dados.maiorVitoria) {
        const j = dados.maiorVitoria;
        return {
            rotulo: 'MAIOR GOLEADA QUE EU VI',
            linhas: [
                `Corinthians ${j.golsPro} x ${j.golsContra} ${j.adversario.nome}`,
                [formatarData(j.data), j.campeonato?.nome].filter(Boolean).join(' · '),
            ],
            marcadores: false,
        };
    }
    if (tipo === 'temporada' && dados.melhorTemporada) {
        const t = dados.melhorTemporada;
        return {
            rotulo: 'MELHOR TEMPORADA QUE EU VI',
            linhas: [String(t.ano), `${formatarPorcentagem(t.aproveitamento)} de aproveitamento`],
            marcadores: false,
        };
    }
    const conquistas = ordenarPorPrestigio(dados.titulos?.competicoes ?? []);
    if (conquistas.length) {
        return { rotulo: 'TÍTULOS QUE EU VIVI', linhas: conquistas.map(rotuloTitulo), marcadores: true };
    }
    return {
        rotulo: 'MEU APROVEITAMENTO',
        linhas: [`${formatarPorcentagem(dados.resumo.aproveitamento)} de aproveitamento`],
        marcadores: false,
    };
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

const imagens = new Map();
/** @param {string} src */
function carregarImagem(src) {
    if (!imagens.has(src)) {
        imagens.set(
            src,
            new Promise((resolve) => {
                const img = new Image();
                img.onload = () => resolve(img);
                img.onerror = () => resolve(null); // a imagem é decorativa: segue sem ela
                img.src = src;
            }),
        );
    }
    return imagens.get(src);
}

/**
 * Escreve texto reduzindo a fonte até caber na largura.
 * @param {CanvasRenderingContext2D} ctx
 * @param {string} texto
 * @param {number} x
 * @param {number} y
 * @param {{ peso: number, tamanho: number, familia: string, cor: string, larguraMax: number, alinhamento?: CanvasTextAlign }} o
 * @returns {number} largura final do texto
 */
function texto(ctx, texto, x, y, o) {
    let tamanho = o.tamanho;
    const fonte = () => `${o.peso} ${tamanho}px ${o.familia}, system-ui, sans-serif`;
    ctx.font = fonte();
    while (ctx.measureText(texto).width > o.larguraMax && tamanho > 14) {
        tamanho -= 2;
        ctx.font = fonte();
    }
    ctx.fillStyle = o.cor;
    ctx.textAlign = o.alinhamento ?? 'left';
    ctx.fillText(texto, x, y);
    return ctx.measureText(texto).width;
}

/** Desenha a imagem cobrindo a área toda (como background-size: cover), com ponto de foco vertical. */
function cobrir(ctx, img, w, h, foco = 0.5, subir = 0) {
    const escala = Math.max(w / img.width, h / img.height);
    const iw = img.width * escala;
    const ih = img.height * escala;
    ctx.drawImage(img, (w - iw) / 2, (h - ih) * foco - h * subir, iw, ih);
}

/** Estampa repetida na largura do cartão. */
function estampa(ctx, img, w, h) {
    const escala = w / img.width;
    const ih = img.height * escala;
    for (let y = 0; y < h; y += ih) ctx.drawImage(img, 0, y, w, ih);
}

function listras(ctx, w, h) {
    const largura = w / 12;
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#fff';
    for (let x = largura / 2; x < w; x += largura * 2) ctx.fillRect(x, 0, largura, h);
}

/**
 * Fundo: foto (do modelo ou do usuário) + camada para o texto aparecer.
 * @param {CanvasRenderingContext2D} ctx
 */
async function desenharFundo(ctx, w, h, modelo, fotoPropria) {
    const cores = modelo.claro && !fotoPropria ? CORES.claro : CORES.escuro;
    ctx.fillStyle = cores.fundo;
    ctx.fillRect(0, 0, w, h);

    if (fotoPropria) {
        cobrir(ctx, fotoPropria, w, h, 0.4);
    } else if (modelo.desenho === 'listras') {
        listras(ctx, w, h);
    } else {
        const img = await carregarImagem(`${PASTA}/${modelo.id}.jpg`);
        if (img && modelo.padrao) estampa(ctx, img, w, h);
        else if (img) cobrir(ctx, img, w, h, modelo.foco ?? 0.5, modelo.subir ?? 0);
    }

    // Camada: mais forte embaixo (onde ficam os números e a lista)
    const forca = fotoPropria ? 0.6 : modelo.escurecer;
    const cor = cores === CORES.claro ? '255,255,255' : '0,0,0';
    const grad = ctx.createLinearGradient(0, 0, 0, h);
    grad.addColorStop(0, `rgba(${cor},${Math.min(1, forca * 0.75)})`);
    grad.addColorStop(0.45, `rgba(${cor},${forca})`);
    grad.addColorStop(1, `rgba(${cor},${Math.min(0.96, forca + 0.25)})`);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);
    return cores;
}

/**
 * Desenha o cartão e devolve o PNG.
 * @param {any} dados - resposta de /api/minha-historia
 * @param {{
 *   site: string,
 *   nome?: string,
 *   modelo?: string,
 *   formato?: keyof typeof FORMATOS,
 *   destaque?: keyof typeof DESTAQUES,
 *   frase?: boolean,
 *   fotoPropria?: HTMLImageElement | null,
 * }} opcoes
 * @returns {Promise<Blob>}
 */
export async function gerarCartao(dados, opcoes) {
    const modelo = MODELOS.find((m) => m.id === opcoes.modelo) ?? MODELOS[0];
    const formato = FORMATOS[opcoes.formato] ? opcoes.formato : 'story';
    const L = LAYOUT[formato];
    const altura = FORMATOS[formato].altura;

    await carregarFontes();
    const canvas = document.createElement('canvas');
    canvas.width = LARGURA;
    canvas.height = altura;
    const ctx = /** @type {CanvasRenderingContext2D} */ (canvas.getContext('2d'));
    const larguraUtil = LARGURA - MARGEM * 2;

    const cores = await desenharFundo(ctx, LARGURA, altura, modelo, opcoes.fotoPropria ?? null);
    const claro = cores === CORES.claro;
    if (!claro) {
        // Sombra leve: o texto continua legível mesmo sobre fotos claras
        ctx.shadowColor = 'rgba(0,0,0,0.55)';
        ctx.shadowBlur = 14;
    }
    const logo = await carregarImagem(claro ? '/assets/img/logo-256-claro.png' : '/assets/img/logo-256.png');

    // Marca
    const { marca } = L;
    if (logo) ctx.drawImage(logo, MARGEM, marca.y, marca.logo, marca.logo);
    const xMarca = MARGEM + marca.logo + marca.logo * 0.2;
    const fonteMarca = { peso: 800, tamanho: marca.fonte, familia: 'Poppins', larguraMax: 600 };
    texto(ctx, 'ACERVO', xMarca, marca.y + marca.logo * 0.44, { ...fonteMarca, cor: cores.texto });
    texto(ctx, 'CORINTHIANS', xMarca, marca.y + marca.logo * 0.86, { ...fonteMarca, cor: cores.ouro });

    // Título
    const fonteTitulo = { peso: 800, tamanho: L.titulo.fonte, familia: 'Poppins', larguraMax: larguraUtil };
    texto(ctx, 'O TIMÃO NA', MARGEM, L.titulo.y1, { ...fonteTitulo, cor: cores.texto });
    texto(ctx, 'MINHA VIDA', MARGEM, L.titulo.y2, { ...fonteTitulo, cor: cores.ouro });
    const nome = opcoes.nome?.trim();
    const quem = nome ? `${nome} · desde ${formatarData(dados.desde)}` : `Desde ${formatarData(dados.desde)}`;
    texto(ctx, quem, MARGEM, L.quem.y, {
        peso: 500,
        tamanho: L.quem.fonte,
        familia: 'Inter',
        cor: cores.suave,
        larguraMax: larguraUtil,
    });

    // Três números grandes
    const numeros = [
        [formatarNumero(dados.resumo.jogos), 'JOGOS'],
        [formatarNumero(dados.resumo.vitorias), 'VITÓRIAS'],
        [formatarNumero(dados.titulos.total), dados.titulos.total === 1 ? 'TÍTULO' : 'TÍTULOS'],
    ];
    const coluna = larguraUtil / 3;
    numeros.forEach(([valor, rotulo], i) => {
        const centro = MARGEM + coluna * i + coluna / 2;
        const base = { larguraMax: coluna - 30, alinhamento: /** @type {CanvasTextAlign} */ ('center') };
        texto(ctx, valor, centro, L.numeros.y, {
            ...base,
            peso: 800,
            tamanho: L.numeros.fonte,
            familia: 'Poppins',
            cor: i === 2 ? cores.ouro : cores.texto,
        });
        texto(ctx, rotulo, centro, L.numeros.yRotulo, {
            ...base,
            peso: 700,
            tamanho: L.numeros.rotulo,
            familia: 'Inter',
            cor: cores.suave,
        });
    });

    ctx.shadowBlur = 0;
    ctx.fillStyle = cores.linha;
    ctx.fillRect(MARGEM, L.divisoria, larguraUtil, 2);
    if (!claro) ctx.shadowBlur = 14;

    // Destaque escolhido
    const d = linhasDestaque(dados, opcoes.destaque ?? 'titulos');
    let y = L.destaque.y;
    texto(ctx, d.rotulo, MARGEM, y, {
        peso: 700,
        tamanho: L.destaque.rotulo,
        familia: 'Inter',
        cor: cores.ouro,
        larguraMax: larguraUtil,
    });
    y += L.destaque.passo;
    for (const [i, linha] of d.linhas.slice(0, L.destaque.max).entries()) {
        const secundaria = !d.marcadores && i > 0;
        const x = d.marcadores ? MARGEM + L.destaque.fonte * 0.85 : MARGEM;
        if (d.marcadores) {
            ctx.fillStyle = cores.ouro;
            ctx.beginPath();
            ctx.arc(
                MARGEM + L.destaque.fonte * 0.2,
                y - L.destaque.fonte * 0.33,
                L.destaque.fonte * 0.18,
                0,
                Math.PI * 2,
            );
            ctx.fill();
        }
        texto(ctx, linha, x, y, {
            peso: secundaria ? 500 : 700,
            tamanho: secundaria ? Math.round(L.destaque.fonte * 0.75) : L.destaque.fonte,
            familia: secundaria ? 'Inter' : 'Poppins',
            cor: secundaria ? cores.suave : cores.texto,
            larguraMax: larguraUtil - (x - MARGEM),
        });
        y += L.destaque.passo;
    }

    // Frase do corinthiano (opcional; não cabe no formato quadrado)
    if (opcoes.frase && L.frase) {
        texto(ctx, `“${FRASE_CORINTHIANO}”`, MARGEM, Math.max(L.frase.y, y + 10), {
            peso: 500,
            tamanho: L.frase.fonte,
            familia: 'Inter',
            cor: cores.suave,
            larguraMax: larguraUtil,
        });
    }

    // Rodapé: convite + site + perfil
    texto(ctx, 'Descubra o seu em', MARGEM, L.rodape.y1, {
        peso: 500,
        tamanho: L.rodape.fonte,
        familia: 'Inter',
        cor: cores.suave,
        larguraMax: larguraUtil,
    });
    const largSite = texto(ctx, opcoes.site, MARGEM, L.rodape.y2, {
        peso: 700,
        tamanho: Math.round(L.rodape.fonte * 1.2),
        familia: 'Inter',
        cor: cores.texto,
        larguraMax: larguraUtil * 0.62,
    });
    texto(ctx, '  ·  @sccpacervo', MARGEM + largSite, L.rodape.y2, {
        peso: 700,
        tamanho: Math.round(L.rodape.fonte * 1.2),
        familia: 'Inter',
        cor: cores.ouro,
        larguraMax: larguraUtil - largSite,
    });

    return new Promise((resolve, reject) => {
        canvas.toBlob(
            (blob) => (blob ? resolve(blob) : reject(new Error('Não foi possível gerar a imagem.'))),
            'image/png',
        );
    });
}

/**
 * Compatibilidade: o story no modelo padrão.
 * @param {any} dados
 * @param {{ nome?: string, site: string }} opcoes
 */
export function gerarCartaoStory(dados, { nome, site }) {
    return gerarCartao(dados, { nome, site, modelo: 'acervo', formato: 'story', destaque: 'titulos' });
}
