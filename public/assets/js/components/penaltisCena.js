/**
 * Cena da Disputa de Pênaltis, desenhada em <canvas>.
 *
 * Câmera atrás do batedor, como na TV: estádio com a Fiel, placas de
 * publicidade, gramado em perspectiva, gol com rede em profundidade,
 * goleiro que pula e batedor que corre para a bola.
 *
 * Coordenadas lógicas fixas (800×560); o canvas é escalado para o tamanho
 * real da tela. Posições no gol usam (u, v), como em utils/penaltis.js.
 */

/** @typedef {import('../utils/penaltis.js').Ponto} Ponto */
/**
 * @typedef {{ camisa: string, numero?: string, calcao: string, meiao: string, faixa?: string[], nome?: string, num?: string }} KitBatedor
 * @typedef {{ camisa: string, detalhe: string, calcao: string, meiao: string }} KitGoleiro
 */

const W = 800;
const H = 560;
const GOL = { x: 180, y: 198, w: 440, h: 147 }; // trave da frente
const FUNDO = { x0: 209, x1: 591, topo: 236, base: 340.6 }; // fundo da rede
const LINHA_GOL = GOL.y + GOL.h; // 345
const MARCA = { x: 400, y: 503 };
const BOLA_R = 12;
const PELE = '#b07a52';
const CABELO = '#1b1410';

const gx = (u) => GOL.x + u * GOL.w;
const gy = (v) => GOL.y + v * GOL.h;
const lerp = (a, b, t) => a + (b - a) * t;
const limitar = (x, a, b) => Math.min(b, Math.max(a, x));
const suave = (t) => 1 - Math.pow(1 - limitar(t, 0, 1), 3); // ease-out
const vaiVolta = (t) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2); // ease-in-out

/** Gerador pseudoaleatório com semente (a torcida sai sempre igual). */
function semente(s) {
    return () => {
        s = (s * 1664525 + 1013904223) % 4294967296;
        return s / 4294967296;
    };
}

/* =================================================================
   CENÁRIO FIXO (desenhado uma vez numa tela fora da página)
   ================================================================= */

function desenharEstadio(ctx) {
    const rnd = semente(1910);

    // Céu noturno e cobertura
    const ceu = ctx.createLinearGradient(0, 0, 0, 240);
    ceu.addColorStop(0, '#050507');
    ceu.addColorStop(1, '#141416');
    ctx.fillStyle = ceu;
    ctx.fillRect(0, 0, W, 260);

    // Arquibancadas (3 lances)
    const lances = [
        { y0: 34, y1: 112, passo: 5 },
        { y0: 118, y1: 188, passo: 6 },
        { y0: 194, y1: 238, passo: 7 },
    ];
    for (const l of lances) {
        const g = ctx.createLinearGradient(0, l.y0, 0, l.y1);
        g.addColorStop(0, '#1a1a1c');
        g.addColorStop(1, '#2a2a2d');
        ctx.fillStyle = g;
        ctx.fillRect(0, l.y0, W, l.y1 - l.y0);
        // Torcedores: camisa branca, preta ou cinza; cabeça por cima
        for (let y = l.y0 + l.passo; y < l.y1; y += l.passo) {
            for (let x = (rnd() * l.passo) | 0; x < W; x += l.passo * 1.15) {
                if (rnd() < 0.08) continue; // lugar vazio
                const r = rnd();
                ctx.fillStyle = r < 0.45 ? '#e9e9e9' : r < 0.88 ? '#0e0e0e' : r < 0.95 ? '#6b6b6b' : '#c9a227';
                const t = l.passo * 0.42;
                ctx.fillRect(x - t / 2, y - t * 0.2, t, t * 1.1);
                ctx.fillStyle = rnd() < 0.5 ? PELE : '#5a3a26';
                ctx.beginPath();
                ctx.arc(x, y - t * 0.55, t * 0.32, 0, Math.PI * 2);
                ctx.fill();
            }
        }
        ctx.fillStyle = 'rgba(0,0,0,.45)';
        ctx.fillRect(0, l.y1 - 2, W, 4);
    }

    // Bandeiras alvinegras
    for (let i = 0; i < 5; i++) {
        const x = 20 + rnd() * 740;
        const y = 40 + rnd() * 120;
        const w = 34 + rnd() * 22;
        const h = 20 + rnd() * 8;
        ctx.save();
        ctx.translate(x, y);
        ctx.transform(1, (rnd() - 0.5) * 0.25, 0, 1, 0, 0);
        for (let k = 0; k < 5; k++) {
            ctx.fillStyle = k % 2 ? '#111' : '#f2f2f2';
            ctx.fillRect(0, (k * h) / 5, w, h / 5 + 0.5);
        }
        ctx.restore();
    }

    // Faixa da torcida
    ctx.fillStyle = '#0b0b0b';
    ctx.fillRect(24, 200, 150, 24);
    ctx.strokeStyle = '#f2f2f2';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(24, 200, 150, 24);
    ctx.fillStyle = '#f2f2f2';
    ctx.font = '900 13px Poppins, Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('VAI CORINTHIANS', 99, 213);

    // Refletores
    for (const x of [70, 730]) {
        const luz = ctx.createRadialGradient(x, 6, 2, x, 6, 260);
        luz.addColorStop(0, 'rgba(255,255,240,.55)');
        luz.addColorStop(0.15, 'rgba(255,255,240,.12)');
        luz.addColorStop(1, 'rgba(255,255,240,0)');
        ctx.fillStyle = luz;
        ctx.fillRect(0, 0, W, 260);
    }
}

function desenharGramado(ctx) {
    const rnd = semente(1977);
    const base = ctx.createLinearGradient(0, 258, 0, H);
    base.addColorStop(0, '#1f5f2e');
    base.addColorStop(1, '#2d8040');
    ctx.fillStyle = base;
    ctx.fillRect(0, 258, W, H - 258);

    // Faixas do corte da grama, maiores perto da câmera
    let y = 258;
    let h = 7;
    let escura = true;
    while (y < H) {
        if (escura) {
            ctx.fillStyle = 'rgba(0,0,0,.09)';
            ctx.fillRect(0, y, W, h);
        }
        y += h;
        h *= 1.16;
        escura = !escura;
    }
    // Textura
    for (let i = 0; i < 2600; i++) {
        const py = 258 + Math.pow(rnd(), 0.7) * (H - 258);
        ctx.fillStyle = rnd() < 0.5 ? 'rgba(0,0,0,.08)' : 'rgba(255,255,255,.04)';
        ctx.fillRect(rnd() * W, py, 1 + (py - 258) / 160, 1);
    }

    // Linhas
    ctx.strokeStyle = 'rgba(255,255,255,.85)';
    ctx.lineCap = 'round';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(0, LINHA_GOL);
    ctx.lineTo(W, LINHA_GOL);
    ctx.stroke();
    ctx.lineWidth = 3;
    ctx.beginPath(); // pequena área
    ctx.moveTo(92, LINHA_GOL);
    ctx.lineTo(30, 378);
    ctx.lineTo(770, 378);
    ctx.lineTo(708, LINHA_GOL);
    ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,.85)';
    ctx.beginPath(); // marca do pênalti
    ctx.ellipse(MARCA.x, MARCA.y, 10, 3.6, 0, 0, Math.PI * 2);
    ctx.fill();

    // Vinheta
    const v = ctx.createRadialGradient(W / 2, 380, 120, W / 2, 380, 560);
    v.addColorStop(0, 'rgba(0,0,0,0)');
    v.addColorStop(1, 'rgba(0,0,0,.45)');
    ctx.fillStyle = v;
    ctx.fillRect(0, 258, W, H - 258);
}

/* =================================================================
   PEÇAS QUE SE MEXEM
   ================================================================= */

function desenharPlacas(ctx, t) {
    ctx.fillStyle = '#060606';
    ctx.fillRect(0, 238, W, 21);
    ctx.fillStyle = '#1d1d1d';
    ctx.fillRect(0, 258, W, 2);
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, 238, W, 21);
    ctx.clip();
    ctx.font = '800 12px Poppins, Arial, sans-serif';
    ctx.textBaseline = 'middle';
    ctx.textAlign = 'left';
    const texto = 'ACERVO CORINTHIANS  ★  DESDE 1910  ★  ACERVOCORINTHIANS.COM.BR  ★  ';
    const largura = ctx.measureText(texto).width;
    let x = -((t / 40) % largura);
    while (x < W) {
        ctx.fillStyle = '#d4af37';
        ctx.fillText(texto, x, 249);
        x += largura;
    }
    ctx.restore();
}

/** Rede com profundidade; `estufa` deforma a malha onde a bola bateu. */
function desenharRede(ctx, estufa) {
    const desloca = (x, y) => {
        if (!estufa || estufa.forca <= 0) return [x, y];
        const dx = x - estufa.x;
        const dy = y - estufa.y;
        const d2 = dx * dx + dy * dy;
        const f = estufa.forca * Math.exp(-d2 / 900);
        const d = Math.sqrt(d2) || 1;
        return [x + (dx / d) * f, y + (dy / d) * f - f * 0.3];
    };

    // Sombra do fundo do gol
    ctx.fillStyle = 'rgba(0,0,0,.28)';
    ctx.beginPath();
    ctx.moveTo(GOL.x, GOL.y);
    ctx.lineTo(GOL.x + GOL.w, GOL.y);
    ctx.lineTo(FUNDO.x1, FUNDO.topo);
    ctx.lineTo(FUNDO.x1, FUNDO.base);
    ctx.lineTo(GOL.x + GOL.w, LINHA_GOL);
    ctx.lineTo(GOL.x, LINHA_GOL);
    ctx.lineTo(FUNDO.x0, FUNDO.base);
    ctx.lineTo(FUNDO.x0, FUNDO.topo);
    ctx.closePath();
    ctx.fill();

    ctx.strokeStyle = 'rgba(255,255,255,.3)';
    ctx.lineWidth = 0.7;
    const malha = 11;

    // Fundo
    ctx.beginPath();
    for (let x = FUNDO.x0; x <= FUNDO.x1; x += malha) {
        for (let y = FUNDO.topo; y < FUNDO.base; y += 4) {
            const [a, b] = desloca(x, y);
            const [c, d] = desloca(x, Math.min(FUNDO.base, y + 4));
            ctx.moveTo(a, b);
            ctx.lineTo(c, d);
        }
    }
    for (let y = FUNDO.topo; y <= FUNDO.base; y += malha) {
        for (let x = FUNDO.x0; x < FUNDO.x1; x += 6) {
            const [a, b] = desloca(x, y);
            const [c, d] = desloca(Math.min(FUNDO.x1, x + 6), y);
            ctx.moveTo(a, b);
            ctx.lineTo(c, d);
        }
    }
    ctx.stroke();

    // Laterais e teto: linhas ligando a trave ao fundo
    ctx.beginPath();
    for (let i = 0; i <= 12; i++) {
        const t = i / 12;
        // laterais (verticais em profundidade)
        for (const [xf, xb] of [
            [GOL.x, FUNDO.x0],
            [GOL.x + GOL.w, FUNDO.x1],
        ]) {
            ctx.moveTo(xf, lerp(GOL.y, LINHA_GOL, t));
            ctx.lineTo(xb, lerp(FUNDO.topo, FUNDO.base, t));
        }
    }
    for (let i = 0; i <= 4; i++) {
        const t = i / 4;
        for (const [xf, xb] of [
            [GOL.x, FUNDO.x0],
            [GOL.x + GOL.w, FUNDO.x1],
        ]) {
            const x = lerp(xf, xb, t);
            ctx.moveTo(x, lerp(GOL.y, FUNDO.topo, t));
            ctx.lineTo(x, lerp(LINHA_GOL, FUNDO.base, t));
        }
    }
    for (let i = 0; i <= 36; i++) {
        const t = i / 36; // teto
        ctx.moveTo(lerp(GOL.x, GOL.x + GOL.w, t), GOL.y);
        ctx.lineTo(lerp(FUNDO.x0, FUNDO.x1, t), FUNDO.topo);
    }
    ctx.stroke();

    // Ferros do fundo
    ctx.strokeStyle = 'rgba(230,230,230,.7)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(GOL.x, GOL.y);
    ctx.lineTo(FUNDO.x0, FUNDO.topo);
    ctx.lineTo(FUNDO.x1, FUNDO.topo);
    ctx.lineTo(GOL.x + GOL.w, GOL.y);
    ctx.moveTo(FUNDO.x0, FUNDO.topo);
    ctx.lineTo(FUNDO.x0, FUNDO.base);
    ctx.moveTo(FUNDO.x1, FUNDO.topo);
    ctx.lineTo(FUNDO.x1, FUNDO.base);
    ctx.stroke();
}

function desenharTraves(ctx) {
    const e = 8; // espessura
    ctx.fillStyle = 'rgba(0,0,0,.25)'; // sombra no chão
    ctx.fillRect(GOL.x - e, LINHA_GOL - 1, GOL.w + 2 * e, 4);
    const ferro = (x, y, w, h, vertical) => {
        const g = vertical ? ctx.createLinearGradient(x, 0, x + w, 0) : ctx.createLinearGradient(0, y, 0, y + h);
        g.addColorStop(0, '#ffffff');
        g.addColorStop(0.6, '#e6e6e6');
        g.addColorStop(1, '#a9a9a9');
        ctx.fillStyle = g;
        ctx.fillRect(x, y, w, h);
    };
    ferro(GOL.x - e, GOL.y - e, e, GOL.h + e, true);
    ferro(GOL.x + GOL.w, GOL.y - e, e, GOL.h + e, true);
    ferro(GOL.x - e, GOL.y - e, GOL.w + 2 * e, e, false);
}

/** Sombreado de volume: claro em cima/à esquerda, escuro embaixo/à direita. */
function volume(ctx, x0, y0, x1, y1, forca = 0.22) {
    const g = ctx.createLinearGradient(x0, y0, x1, y1);
    g.addColorStop(0, `rgba(255,255,255,${forca * 0.6})`);
    g.addColorStop(0.45, 'rgba(255,255,255,0)');
    g.addColorStop(1, `rgba(0,0,0,${forca})`);
    return g;
}

/** Membro arredondado (segmento grosso com pontas redondas). */
function membro(ctx, x0, y0, x1, y1, largura, cor) {
    ctx.strokeStyle = cor;
    ctx.lineWidth = largura;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(x0, y0);
    ctx.lineTo(x1, y1);
    ctx.stroke();
}

/** Chuteira vista de trás/de frente: corpo escuro com sola e travas. */
function chuteira(ctx, x, y, escala = 1, cor = '#111') {
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(escala, escala);
    ctx.fillStyle = cor;
    ctx.beginPath();
    ctx.ellipse(0, -2, 8, 6, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#d4af37';
    ctx.fillRect(-6, -3, 12, 1.6); // detalhe
    ctx.fillStyle = '#e8e8e8';
    ctx.fillRect(-7, 2.5, 14, 2); // sola
    ctx.restore();
}

/**
 * Goleiro de frente. O corpo é desenhado ao longo de um eixo (quadril → cabeça):
 * em pé o eixo aponta para cima; no pulo, para onde vão as mãos.
 */
function desenharGoleiro(ctx, kit, pose) {
    const { x, y, angulo, abertura, agachado } = pose;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angulo + Math.PI / 2);
    ctx.lineCap = 'round';

    // Pernas: joelhos flexionados na posição de espera
    const perna = 54 - agachado * 12;
    const flexao = (1 - abertura) * 5 + agachado * 6;
    for (const lado of [-1, 1]) {
        const pe = lado * (10 + abertura * 7);
        const joelhoX = lado * (9 + flexao);
        const joelhoY = perna * 0.5;
        membro(ctx, lado * 7, 4, joelhoX, joelhoY, 10, PELE); // coxa
        membro(ctx, joelhoX, joelhoY + 3, pe, perna - 6, 9, kit.meiao); // meião
        ctx.fillStyle = 'rgba(255,255,255,.85)';
        ctx.fillRect(Math.min(joelhoX, pe) - 1, joelhoY + 4, Math.abs(pe - joelhoX) + 2, 2); // faixa do meião
        chuteira(ctx, pe, perna, 0.85);
    }

    // Calção
    ctx.fillStyle = kit.calcao;
    ctx.beginPath();
    ctx.moveTo(-15, -4);
    ctx.lineTo(15, -4);
    ctx.lineTo(17, 13);
    ctx.lineTo(2, 13);
    ctx.lineTo(0, 7);
    ctx.lineTo(-2, 13);
    ctx.lineTo(-17, 13);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = volume(ctx, -15, -4, 15, 13, 0.3);
    ctx.fill();

    // Braços (manga comprida): de "prontos" a esticados para o alto
    const ombroY = -40;
    for (const lado of [-1, 1]) {
        const ang = lerp(lado * 2.15, lado * 0.22, abertura);
        const cotovelo = { x: lado * 15 + Math.sin(ang) * 17, y: ombroY - Math.cos(ang) * 17 + 2 };
        const mao = { x: lado * 15 + Math.sin(ang) * 36, y: ombroY - Math.cos(ang) * 36 };
        membro(ctx, lado * 13, ombroY + 3, cotovelo.x, cotovelo.y, 9, kit.camisa);
        membro(ctx, cotovelo.x, cotovelo.y, mao.x, mao.y, 8, kit.camisa);
        // Luva grande, com punho na cor do detalhe
        ctx.save();
        ctx.translate(mao.x + Math.sin(ang) * 4, mao.y - Math.cos(ang) * 4);
        ctx.rotate(ang);
        ctx.fillStyle = '#f4f4f4';
        ctx.beginPath();
        ctx.roundRect(-7, -9, 14, 14, 5);
        ctx.fill();
        ctx.fillStyle = 'rgba(0,0,0,.18)';
        ctx.fillRect(-7, -2, 14, 2);
        ctx.fillStyle = kit.detalhe;
        ctx.fillRect(-6, 3, 12, 3);
        ctx.restore();
    }

    // Tronco com ombros arredondados
    ctx.fillStyle = kit.camisa;
    ctx.beginPath();
    ctx.moveTo(-17, -44);
    ctx.quadraticCurveTo(-19, -47, -14, -48);
    ctx.lineTo(14, -48);
    ctx.quadraticCurveTo(19, -47, 17, -44);
    ctx.lineTo(14, -2);
    ctx.lineTo(-14, -2);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = volume(ctx, -17, -48, 17, -2);
    ctx.fill();
    ctx.fillStyle = kit.detalhe;
    ctx.fillRect(-16, -32, 32, 4); // faixa no peito
    ctx.fillRect(-15, -6, 30, 2);
    // Gola
    ctx.fillStyle = 'rgba(0,0,0,.35)';
    ctx.beginPath();
    ctx.ellipse(0, -47.5, 5.5, 2.5, 0, 0, Math.PI);
    ctx.fill();

    // Pescoço e cabeça (de frente: rosto)
    ctx.fillStyle = PELE;
    ctx.fillRect(-3.5, -51, 7, 5);
    ctx.beginPath();
    ctx.ellipse(0, -58, 8.5, 9.5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = CABELO;
    ctx.beginPath();
    ctx.ellipse(0, -62.5, 9, 6, 0, Math.PI, Math.PI * 2);
    ctx.fill();
    ctx.fillRect(-9, -63, 18, 2.5);
    ctx.fillStyle = '#1a1a1a'; // olhos e sobrancelhas
    ctx.beginPath();
    ctx.arc(-3.2, -57.5, 1.1, 0, Math.PI * 2);
    ctx.arc(3.2, -57.5, 1.1, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillRect(-5, -60.5, 3.6, 0.9);
    ctx.fillRect(1.4, -60.5, 3.6, 0.9);
    ctx.fillStyle = 'rgba(0,0,0,.25)'; // boca
    ctx.fillRect(-2.2, -53.5, 4.4, 1);
    ctx.restore();
}

/** Batedor de costas. `passo` anima a corrida; `chute` (0–1) o movimento da perna. */
function desenharBatedor(ctx, kit, { x, y, passo, chute }) {
    ctx.save();
    ctx.translate(x, y);
    ctx.lineCap = 'round';

    // Sombra
    ctx.fillStyle = 'rgba(0,0,0,.32)';
    ctx.beginPath();
    ctx.ellipse(0, 2, 36, 8, 0, 0, Math.PI * 2);
    ctx.fill();

    const quadril = -86;

    // Pernas: coxa (pele), joelho, meião e chuteira
    const pernas = [
        { lado: -1, avanco: Math.sin(passo) },
        { lado: 1, avanco: -Math.sin(passo) },
    ];
    for (const p of pernas) {
        let peX = p.lado * 13;
        let peY = -Math.max(0, p.avanco) * 16;
        let escalaPe = 1 - Math.max(0, p.avanco) * 0.15;
        if (p.lado === 1 && chute > 0) {
            // perna direita vai à bola e sobe no "follow-through"
            peX = lerp(13, 28, chute);
            peY = -Math.sin(chute * Math.PI) * 64;
            escalaPe = 1 - Math.sin(chute * Math.PI) * 0.25;
        }
        const joelhoX = lerp(p.lado * 11, peX, 0.5) + p.lado * 3;
        const joelhoY = lerp(quadril + 10, peY, 0.5) + 2;
        membro(ctx, p.lado * 11, quadril + 10, joelhoX, joelhoY, 17, PELE);
        membro(ctx, joelhoX, joelhoY + 7, peX, peY - 9, 14, kit.meiao);
        // faixa no alto do meião
        ctx.fillStyle = 'rgba(255,255,255,.55)';
        ctx.fillRect(joelhoX - 7, joelhoY + 6, 14, 2.5);
        ctx.fillStyle = 'rgba(0,0,0,.2)'; // sombra na panturrilha
        ctx.fillRect(joelhoX + p.lado * 2 - 2, joelhoY + 9, 4, Math.max(0, peY - joelhoY - 18));
        chuteira(ctx, peX, peY, 1.25 * escalaPe);
    }

    // Calção com recorte lateral
    ctx.fillStyle = kit.calcao;
    ctx.beginPath();
    ctx.moveTo(-25, quadril - 14);
    ctx.lineTo(25, quadril - 14);
    ctx.lineTo(28, quadril + 14);
    ctx.lineTo(3, quadril + 16);
    ctx.lineTo(0, quadril + 8);
    ctx.lineTo(-3, quadril + 16);
    ctx.lineTo(-28, quadril + 14);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = volume(ctx, -25, quadril - 14, 25, quadril + 16, 0.28);
    ctx.fill();

    // Braços: manga curta (camisa) + antebraço (pele) + mão
    const ombroY = quadril - 60;
    for (const lado of [-1, 1]) {
        const giro = Math.sin(passo) * lado * 0.5 + lado * (0.35 + chute * 0.6);
        const ox = lado * 29;
        const cotovelo = { x: ox + Math.sin(giro) * 22, y: ombroY + Math.cos(giro) * 22 };
        const mao = { x: ox + Math.sin(giro) * 46, y: ombroY + Math.cos(giro) * 42 };
        membro(ctx, cotovelo.x, cotovelo.y, mao.x, mao.y, 10, PELE);
        ctx.fillStyle = PELE;
        ctx.beginPath();
        ctx.arc(mao.x, mao.y, 6, 0, Math.PI * 2);
        ctx.fill();
        membro(ctx, ox, ombroY, lerp(ox, cotovelo.x, 0.55), lerp(ombroY, cotovelo.y, 0.55), 16, kit.camisa);
    }

    // Camisa (de costas), ombros arredondados e cintura mais fina
    ctx.fillStyle = kit.camisa;
    ctx.beginPath();
    ctx.moveTo(-14, quadril - 68);
    ctx.quadraticCurveTo(-30, quadril - 68, -33, quadril - 58);
    ctx.lineTo(-27, quadril - 40);
    ctx.lineTo(-24, quadril - 10);
    ctx.lineTo(24, quadril - 10);
    ctx.lineTo(27, quadril - 40);
    ctx.lineTo(33, quadril - 58);
    ctx.quadraticCurveTo(30, quadril - 68, 14, quadril - 68);
    ctx.quadraticCurveTo(0, quadril - 64, -14, quadril - 68);
    ctx.closePath();
    ctx.fill();
    if (kit.faixa) {
        ctx.save();
        ctx.clip();
        kit.faixa.forEach((cor, i) => {
            ctx.fillStyle = cor;
            ctx.fillRect(-34, quadril - 54 + i * 6, 68, 6);
        });
        ctx.restore();
    }
    ctx.fillStyle = volume(ctx, -33, quadril - 68, 33, quadril - 10, 0.25);
    ctx.fill();
    // Dobras do tecido
    ctx.strokeStyle = 'rgba(0,0,0,.12)';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(-16, quadril - 22);
    ctx.quadraticCurveTo(-10, quadril - 16, -4, quadril - 12);
    ctx.moveTo(16, quadril - 26);
    ctx.quadraticCurveTo(10, quadril - 18, 6, quadril - 12);
    ctx.stroke();
    // Gola
    ctx.fillStyle = 'rgba(0,0,0,.28)';
    ctx.beginPath();
    ctx.ellipse(0, quadril - 66, 9, 3, 0, 0, Math.PI * 2);
    ctx.fill();

    // Nome e número nas costas
    const temFaixa = kit.faixa ? 1 : 0;
    const numeroLongo = (kit.num ?? '9').length > 3;
    ctx.fillStyle = kit.numero ?? '#111';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    if (numeroLongo) {
        // Frase em duas linhas (ex.: "SEM / MUNDIAL"): mesma letra, mesma
        // compressão, centralizada nas costas e sem passar da largura da camisa
        const linhas = [kit.nome, kit.num].filter(Boolean);
        ctx.font = '900 15px Poppins, Arial, sans-serif';
        const maior = Math.max(...linhas.map((l) => ctx.measureText(l).width));
        const aperto = Math.min(1, 40 / maior);
        const centro = quadril - 38 + temFaixa * 8;
        linhas.forEach((linha, i) => {
            ctx.save();
            ctx.translate(0, centro + (i - (linhas.length - 1) / 2) * 15);
            ctx.scale(aperto, 1);
            ctx.fillText(linha, 0, 0);
            ctx.restore();
        });
    } else {
        if (kit.nome) {
            ctx.font = '800 10px Poppins, Arial, sans-serif';
            ctx.fillText(kit.nome, 0, quadril - 50 + temFaixa * 12);
        }
        ctx.font = '900 30px Poppins, Arial, sans-serif';
        ctx.fillText(kit.num ?? '9', 0, quadril - 28 + temFaixa * 6);
    }

    // Pescoço e cabeça (de costas: quase só cabelo)
    ctx.fillStyle = PELE;
    ctx.fillRect(-6.5, quadril - 76, 13, 11);
    ctx.fillStyle = 'rgba(0,0,0,.15)';
    ctx.fillRect(-6.5, quadril - 68, 13, 3);
    ctx.fillStyle = PELE; // orelhas
    for (const lado of [-1, 1]) {
        ctx.beginPath();
        ctx.ellipse(lado * 13.5, quadril - 84, 3, 5, 0, 0, Math.PI * 2);
        ctx.fill();
    }
    ctx.fillStyle = CABELO;
    ctx.beginPath();
    ctx.ellipse(0, quadril - 88, 14, 14.5, 0, 0, Math.PI * 2);
    ctx.fill();
    // Brilho e corte do cabelo
    ctx.fillStyle = 'rgba(255,255,255,.08)';
    ctx.beginPath();
    ctx.ellipse(-4, quadril - 95, 7, 4, -0.4, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = PELE; // nuca raspada
    ctx.beginPath();
    ctx.ellipse(0, quadril - 76, 8, 3.5, 0, Math.PI, Math.PI * 2);
    ctx.fill();
    ctx.restore();
}

function desenharBola(ctx, { x, y, r, giro, alfa = 1 }) {
    ctx.save();
    ctx.globalAlpha = alfa;
    ctx.translate(x, y);
    const g = ctx.createRadialGradient(-r * 0.35, -r * 0.4, r * 0.1, 0, 0, r);
    g.addColorStop(0, '#ffffff');
    g.addColorStop(0.7, '#e2e2e2');
    g.addColorStop(1, '#9a9a9a');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.clip();
    // Gomos pretos girando
    ctx.fillStyle = '#1c1c1c';
    for (let i = 0; i < 6; i++) {
        const a = giro + (i * Math.PI * 2) / 5;
        const d = i === 5 ? 0 : r * 0.78;
        const cx = Math.cos(a) * d;
        const cy = Math.sin(a) * d * 0.9;
        ctx.beginPath();
        for (let k = 0; k < 5; k++) {
            const b = giro * 1.3 + (k * Math.PI * 2) / 5;
            const px = cx + Math.cos(b) * r * 0.3;
            const py = cy + Math.sin(b) * r * 0.3;
            if (k) ctx.lineTo(px, py);
            else ctx.moveTo(px, py);
        }
        ctx.fill();
    }
    ctx.restore();
}

/* =================================================================
   CENA
   ================================================================= */

/**
 * @param {HTMLCanvasElement} canvas
 * @param {{ aoMirar: (p: Ponto) => void, aoChutar: (forca: number) => void, forcaNoTempo: (ms: number) => number, faixaIdeal: { min: number, max: number } }} opcoes
 */
export function criarCena(canvas, opcoes) {
    const ctx = /** @type {CanvasRenderingContext2D} */ (canvas.getContext('2d'));

    // Cenário fixo pré-desenhado
    const fixo = document.createElement('canvas');
    fixo.width = W;
    fixo.height = H;
    const fctx = /** @type {CanvasRenderingContext2D} */ (fixo.getContext('2d'));
    desenharEstadio(fctx);
    desenharGramado(fctx);

    /** @type {{ batedor: KitBatedor, goleiro: KitGoleiro }} */
    let kits = {
        batedor: { camisa: '#f4f4f4', calcao: '#111', meiao: '#111' },
        goleiro: { camisa: '#2a3f94', detalhe: '#fff', calcao: '#1b2a66', meiao: '#2a3f94' },
    };
    /** 'mirar' | 'forca' | 'pular' | 'animando' | 'parado' */
    let modo = 'parado';
    /** @type {Ponto | null} */ let mira = null;
    /** @type {{ x: number, y: number } | null} */ let cursor = null;
    let inicioForca = 0;
    /** @type {any} */ let lance = null; // animação da cobrança em andamento
    let flashes = [];
    let quadro = 0;
    let vivo = true;

    /* ---------- tamanho ---------- */
    function ajustarTamanho() {
        const dpr = Math.min(2, window.devicePixelRatio || 1);
        const largura = canvas.clientWidth || W;
        canvas.width = Math.round(largura * dpr);
        canvas.height = Math.round((largura * H * dpr) / W);
    }
    const observador = new ResizeObserver(ajustarTamanho);
    observador.observe(canvas);
    ajustarTamanho();

    /* ---------- toque / mouse ---------- */
    function pontoLogico(e) {
        const r = canvas.getBoundingClientRect();
        return { x: ((e.clientX - r.left) / r.width) * W, y: ((e.clientY - r.top) / r.height) * H };
    }
    function pontoNoGol({ x, y }) {
        const u = (x - GOL.x) / GOL.w;
        const v = (y - GOL.y) / GOL.h;
        if (u < -0.12 || u > 1.12 || v < -0.25 || v > 1.1) return null;
        return { u: limitar(u, 0, 1), v: limitar(v, 0.03, 0.97) };
    }
    function aoTocar(e) {
        if (modo === 'forca') {
            e.preventDefault();
            modo = 'animando';
            opcoes.aoChutar(opcoes.forcaNoTempo(performance.now() - inicioForca));
            return;
        }
        if (modo !== 'mirar' && modo !== 'pular') return;
        const p = pontoNoGol(pontoLogico(e));
        if (!p) return;
        e.preventDefault();
        mira = p;
        opcoes.aoMirar(p);
    }
    function aoMover(e) {
        cursor = e.pointerType === 'mouse' ? pontoLogico(e) : null;
    }
    canvas.addEventListener('pointerdown', aoTocar);
    canvas.addEventListener('pointermove', aoMover);
    canvas.addEventListener('pointerleave', () => (cursor = null));

    /* ---------- poses ---------- */
    const GOLEIRO_EM_PE = { x: 400, y: LINHA_GOL - 56, angulo: -Math.PI / 2, abertura: 0, agachado: 0 };

    function poseMergulho(alvo) {
        // alvo = onde as mãos chegam (coordenadas de tela)
        const dx = alvo.x - GOLEIRO_EM_PE.x;
        if (Math.abs(dx) < 36) {
            // bola no meio: sobe para o alto ou agacha
            const y = limitar(alvo.y + 78, LINHA_GOL - 80, LINHA_GOL - 36);
            return { x: alvo.x, y, angulo: -Math.PI / 2, abertura: 1, agachado: alvo.y > 290 ? 1 : 0 };
        }
        const ang = Math.atan2(alvo.y - (LINHA_GOL - 56), dx);
        const angulo = dx < 0 ? Math.min(ang, -Math.PI * 0.55) : Math.max(ang, -Math.PI * 0.45);
        const alcance = 80;
        return {
            x: alvo.x - Math.cos(angulo) * alcance,
            y: Math.min(LINHA_GOL - 14, alvo.y - Math.sin(angulo) * alcance),
            angulo,
            abertura: 1,
            agachado: 0,
        };
    }
    const misturarPose = (a, b, t) => ({
        x: lerp(a.x, b.x, t),
        y: lerp(a.y, b.y, t),
        angulo: lerp(a.angulo, b.angulo, t),
        abertura: lerp(a.abertura, b.abertura, t),
        agachado: lerp(a.agachado, b.agachado, t),
    });

    /* ---------- trajetória da bola ---------- */
    const BOLA_INICIO = { x: MARCA.x, y: MARCA.y - BOLA_R + 2, r: BOLA_R };

    function planejarBola(chute, resultado) {
        const P = { x: gx(chute.u), y: gy(chute.v) };
        // Ponto na linha do gol (ou onde bate na trave)
        if (resultado === 'trave') {
            if (chute.v <= 0.035) P.y = GOL.y - 4;
            else P.x = chute.u <= 0.5 ? GOL.x - 4 : GOL.x + GOL.w + 4;
        }
        const lado = P.x < 400 ? -1 : 1;
        let depois;
        if (resultado === 'gol') {
            const fx = 400 + (P.x - 400) * 0.87;
            const fy = lerp(FUNDO.topo, FUNDO.base, limitar((P.y - GOL.y) / GOL.h, 0, 1));
            depois = { x: fx, y: fy, r: 5.6, cai: true };
        } else if (resultado === 'defesa') {
            depois = { x: P.x + lado * (90 + Math.random() * 70), y: LINHA_GOL + 40, r: 9 };
        } else if (resultado === 'trave') {
            depois =
                P.y < GOL.y
                    ? { x: P.x + (Math.random() - 0.5) * 120, y: LINHA_GOL + 60, r: 10 }
                    : { x: P.x + lado * 150, y: LINHA_GOL + 70, r: 10 };
        } else {
            depois = { x: P.x + (P.x - 400) * 0.35, y: P.y < GOL.y ? 120 : P.y - 30, r: 4, some: true };
        }
        return { P, depois, alturaArco: chute.v > 0.6 ? 38 : 22 };
    }

    /* ---------- desenho do quadro ---------- */
    function posBola(agora) {
        if (!lance || agora < lance.tChute) return { ...BOLA_INICIO, giro: 0 };
        const t1 = (agora - lance.tChute) / 520;
        const { P, depois, alturaArco } = lance.bola;
        if (t1 <= 1) {
            const t = suave(t1 * 0.9 + 0.1 * t1 * t1);
            const cx = (BOLA_INICIO.x + P.x) / 2;
            const cy = Math.min(BOLA_INICIO.y, P.y) - alturaArco;
            const x = (1 - t) * (1 - t) * BOLA_INICIO.x + 2 * (1 - t) * t * cx + t * t * P.x;
            const y = (1 - t) * (1 - t) * BOLA_INICIO.y + 2 * (1 - t) * t * cy + t * t * P.y;
            return { x, y, r: BOLA_R / (1 + t * 0.85), giro: t * 9, atras: false };
        }
        const t2 = limitar((agora - lance.tChute - 520) / (depois.cai ? 180 : 480), 0, 1);
        const t = suave(t2);
        let x = lerp(P.x, depois.x, t);
        let y = lerp(P.y, depois.y, t) - (depois.cai ? 0 : Math.sin(t * Math.PI) * 30);
        let r = lerp(BOLA_R / 1.85, depois.r, t);
        if (depois.cai && t2 >= 1) {
            // escorre pela rede até o chão
            const t3 = limitar((agora - lance.tChute - 700) / 450, 0, 1);
            y = lerp(depois.y, FUNDO.base - 6, vaiVolta(t3));
            x = depois.x;
            r = depois.r;
        }
        return { x, y, r, giro: 9 + t * 4, atras: !!depois.cai, alfa: depois.some ? 1 - t : 1 };
    }

    function desenhar(agora) {
        const k = canvas.width / W;
        ctx.setTransform(k, 0, 0, canvas.height / H, 0, 0);
        ctx.drawImage(fixo, 0, 0, W, H);
        desenharPlacas(ctx, agora);

        // Flashes da torcida comemorando
        flashes = flashes.filter((f) => agora - f.t < 900);
        for (const f of flashes) {
            if (agora < f.t) continue;
            ctx.fillStyle = `rgba(255,255,255,${1 - (agora - f.t) / 900})`;
            ctx.beginPath();
            ctx.arc(f.x, f.y, 2.2, 0, Math.PI * 2);
            ctx.fill();
        }

        // Rede (estufa quando a bola entra)
        let estufa = null;
        if (lance?.resultado === 'gol') {
            const t = (agora - lance.tChute - 520) / 650;
            if (t > 0 && t < 1) {
                const d = lance.bola.depois;
                estufa = { x: d.x, y: d.y, forca: Math.sin(t * Math.PI) * 14 };
            }
        }
        desenharRede(ctx, estufa);

        const bola = posBola(agora);
        if (bola.atras) desenharBola(ctx, bola);

        // Goleiro: balança parado; no lance, mergulha
        let pose = { ...GOLEIRO_EM_PE, x: 400 + Math.sin(agora / 380) * 7 };
        if (lance) {
            const t = (agora - lance.tChute - 40) / 430;
            if (t > 0) pose = misturarPose(GOLEIRO_EM_PE, lance.poseFinal, suave(t));
        }
        // Sombra do goleiro
        ctx.fillStyle = 'rgba(0,0,0,.3)';
        ctx.beginPath();
        ctx.ellipse(pose.x, LINHA_GOL + 1, 26, 5, 0, 0, Math.PI * 2);
        ctx.fill();
        desenharGoleiro(ctx, kits.goleiro, pose);
        desenharTraves(ctx);

        // Sombra da bola no gramado
        if (!bola.atras && (bola.alfa ?? 1) > 0.05) {
            const chao =
                lance && agora > lance.tChute
                    ? lerp(MARCA.y, LINHA_GOL, limitar((MARCA.y - bola.y) / 160, 0, 1))
                    : MARCA.y;
            ctx.fillStyle = 'rgba(0,0,0,.3)';
            ctx.beginPath();
            ctx.ellipse(bola.x, Math.max(chao, bola.y + bola.r * 0.8), bola.r * 1.1, bola.r * 0.35, 0, 0, Math.PI * 2);
            ctx.fill();
        }

        // Batedor (na frente da câmera) e bola
        let batedor = { x: 322, y: 600, passo: 0, chute: 0 };
        if (lance) {
            const t = limitar((agora - lance.tInicio) / 520, 0, 1);
            batedor = {
                x: lerp(322, 362, t),
                y: lerp(600, 536, t),
                passo: t * Math.PI * 4,
                chute: agora > lance.tChute - 90 ? limitar((agora - lance.tChute + 90) / 380, 0, 1) : 0,
            };
        }
        if (!bola.atras) desenharBola(ctx, bola);
        desenharBatedor(ctx, kits.batedor, batedor);

        desenharInterface(agora);
    }

    function desenharInterface(agora) {
        // Mira (cursor) e ponto escolhido
        const alvo = (p, cor, tracejado) => {
            ctx.save();
            ctx.strokeStyle = cor;
            ctx.lineWidth = 2.5;
            if (tracejado) ctx.setLineDash([4, 4]);
            ctx.beginPath();
            ctx.arc(p.x, p.y, 13, 0, Math.PI * 2);
            ctx.moveTo(p.x - 20, p.y);
            ctx.lineTo(p.x - 7, p.y);
            ctx.moveTo(p.x + 7, p.y);
            ctx.lineTo(p.x + 20, p.y);
            ctx.moveTo(p.x, p.y - 20);
            ctx.lineTo(p.x, p.y - 7);
            ctx.moveTo(p.x, p.y + 7);
            ctx.lineTo(p.x, p.y + 20);
            ctx.stroke();
            ctx.restore();
        };
        if ((modo === 'mirar' || modo === 'pular') && cursor) {
            const p = pontoNoGol(cursor);
            if (p) alvo({ x: gx(p.u), y: gy(p.v) }, 'rgba(255,255,255,.75)', true);
        }
        if ((modo === 'forca' || (modo === 'animando' && lance && agora < lance.tChute)) && mira) {
            alvo({ x: gx(mira.u), y: gy(mira.v) }, '#d4af37', false);
        }

        // Barra de força
        if (modo === 'forca') {
            const f = opcoes.forcaNoTempo(agora - inicioForca);
            const x = 652;
            const y0 = 300;
            const h = 210;
            const w = 22;
            ctx.fillStyle = 'rgba(0,0,0,.6)';
            ctx.beginPath();
            ctx.roundRect(x - 8, y0 - 26, w + 16, h + 40, 8);
            ctx.fill();
            const g = ctx.createLinearGradient(0, y0 + h, 0, y0);
            const { min, max } = opcoes.faixaIdeal;
            g.addColorStop(0, '#6b7280');
            g.addColorStop(min - 0.001, '#a3a3a3');
            g.addColorStop(min, '#22c55e');
            g.addColorStop(max, '#22c55e');
            g.addColorStop(max + 0.001, '#f59e0b');
            g.addColorStop(1, '#ef4444');
            ctx.fillStyle = g;
            ctx.fillRect(x, y0, w, h);
            ctx.strokeStyle = 'rgba(255,255,255,.6)';
            ctx.lineWidth = 1;
            ctx.strokeRect(x, y0, w, h);
            const py = y0 + h - f * h;
            ctx.fillStyle = '#fff';
            ctx.fillRect(x - 5, py - 2, w + 10, 4);
            ctx.fillStyle = '#fff';
            ctx.font = '800 10px Poppins, Arial, sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText('FORÇA', x + w / 2, y0 - 12);
        }
    }

    function loop(agora) {
        if (!vivo) return;
        desenhar(agora);
        quadro = requestAnimationFrame(loop);
    }
    quadro = requestAnimationFrame(loop);

    /* ---------- API ---------- */
    return {
        /** @param {{ batedor: KitBatedor, goleiro: KitGoleiro }} k */
        trocarKits(k) {
            kits = k;
        },
        /** @param {'mirar' | 'pular' | 'parado'} m */
        esperar(m) {
            modo = m;
            mira = null;
            lance = null;
        },
        /** Mostra a barra de força (depois de escolher a mira). */
        pedirForca() {
            modo = 'forca';
            inicioForca = performance.now();
        },
        /**
         * Anima a cobrança inteira; resolve quando a bola para.
         * @param {{ chute: Ponto, pulo: Ponto, resultado: import('../utils/penaltis.js').Resultado, comemora: boolean, aoChutar?: () => void, aoChegar?: () => void }} c
         */
        cobrar(c) {
            modo = 'animando';
            const agora = performance.now();
            const bola = planejarBola(c.chute, c.resultado);
            // As mãos vão na bola quando defende; senão, no ponto do pulo (sem encostar na bola)
            let maos = { x: gx(limitar(c.pulo.u, 0.12, 0.88)), y: gy(limitar(c.pulo.v, 0.15, 0.95)) };
            if (c.resultado === 'defesa') maos = { ...bola.P };
            else if (Math.hypot(maos.x - bola.P.x, maos.y - bola.P.y) < 48) {
                maos.x += maos.x < bola.P.x ? -50 : 50;
            }
            lance = {
                tInicio: agora,
                tChute: agora + 520,
                resultado: c.resultado,
                bola,
                poseFinal: poseMergulho(maos),
            };
            return new Promise((ok) => {
                setTimeout(() => c.aoChutar?.(), 520);
                setTimeout(() => {
                    c.aoChegar?.();
                    if (c.comemora) {
                        const t = performance.now();
                        for (let i = 0; i < 70; i++) {
                            flashes.push({
                                x: Math.random() * W,
                                y: 36 + Math.random() * 200,
                                t: t + Math.random() * 500,
                            });
                        }
                    }
                }, 1040);
                setTimeout(ok, 1900);
            });
        },
        destruir() {
            vivo = false;
            cancelAnimationFrame(quadro);
            observador.disconnect();
            canvas.removeEventListener('pointerdown', aoTocar);
            canvas.removeEventListener('pointermove', aoMover);
        },
    };
}
