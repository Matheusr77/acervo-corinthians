/**
 * Cena do Paredão, desenhada em <canvas>: a câmera fica dentro do gol,
 * olhando para o campo. Você controla as luvas com o mouse ou o dedo.
 *
 * Usa a física de utils/paredao.js e reaproveita o estádio, a bola e as
 * peças de desenho da Disputa de Pênaltis.
 */

import {
    CABELO,
    PELE,
    chuteira,
    desenharBola,
    desenharEstadio,
    desenharPlacas,
    membro,
    pintarPadrao,
    semente,
    volume,
} from './penaltisCena.js';
import {
    CAMERA,
    GOL,
    RAIO,
    posicaoNoVoo,
    projetar,
    telaParaGol,
    velocidadeNoVoo,
    vooRebatido,
} from '../utils/paredao.js';

/** @typedef {import('../utils/paredao.js').Lance} Lance */
/** @typedef {import('../utils/paredao.js').Desfecho} Desfecho */
/** @typedef {import('../utils/paredao.js').Vetor} Vetor */

const { W, H } = CAMERA;
const lerp = (a, b, t) => a + (b - a) * t;
const limitar = (x, a, b) => Math.min(b, Math.max(a, x));
const suave = (t) => 1 - Math.pow(1 - limitar(t, 0, 1), 3);

/** Tamanho visual da bola (um pouco maior que o real, para dar para acompanhar). */
const raioTela = (s) => Math.max(2.6, RAIO * CAMERA.kx * s * 1.55);
/** Espessura da trave e do travessão na tela. */
const TRAVE = { lado: 13, topo: 18 };
const BORDA = {
    esq: projetar(-GOL.meiaLargura, 0, 0).x,
    dir: projetar(GOL.meiaLargura, 0, 0).x,
    topo: projetar(0, GOL.altura, 0).y,
};

/* =================================================================
   CENÁRIO FIXO
   ================================================================= */

function desenharCampo(ctx, zoeira) {
    // Arquibancada: reaproveita o estádio dos pênaltis, subindo a imagem
    const estadio = document.createElement('canvas');
    estadio.width = W;
    estadio.height = 260;
    desenharEstadio(/** @type {CanvasRenderingContext2D} */ (estadio.getContext('2d')), { zoeira });
    ctx.fillStyle = '#060608';
    ctx.fillRect(0, 0, W, H);
    ctx.drawImage(estadio, 0, 0, W, 238, 0, -98, W, 238);

    // Gramado em faixas na profundidade
    const topo = CAMERA.horizonte;
    const base = ctx.createLinearGradient(0, topo, 0, H);
    base.addColorStop(0, '#1d5a2b');
    base.addColorStop(1, '#2f8443');
    ctx.fillStyle = base;
    ctx.fillRect(0, topo, W, H - topo);
    for (let z = 0; z < 110; z += 5.5) {
        if ((z / 5.5) % 2) continue;
        const y1 = projetar(0, 0, z).y;
        const y0 = projetar(0, 0, z + 5.5).y;
        ctx.fillStyle = 'rgba(0,0,0,.09)';
        ctx.fillRect(0, y0, W, y1 - y0);
    }
    // Textura
    const rnd = semente(2012);
    for (let i = 0; i < 2400; i++) {
        const y = topo + Math.pow(rnd(), 0.6) * (H - topo);
        ctx.fillStyle = rnd() < 0.5 ? 'rgba(0,0,0,.08)' : 'rgba(255,255,255,.04)';
        ctx.fillRect(rnd() * W, y, 1 + (y - topo) / 150, 1);
    }

    // Linhas do campo (no chão, em perspectiva)
    const linha = (x1, z1, x2, z2) => {
        const a = projetar(x1, 0, z1);
        const b = projetar(x2, 0, z2);
        ctx.lineWidth = Math.max(0.8, 3.2 * Math.min(a.s, b.s) + 0.6);
        ctx.beginPath();
        ctx.moveTo(a.x, a.y);
        ctx.lineTo(b.x, b.y);
        ctx.stroke();
    };
    ctx.strokeStyle = 'rgba(255,255,255,.8)';
    ctx.lineCap = 'round';
    linha(-40, 0, 40, 0); // linha de fundo
    linha(-9.16, 5.5, 9.16, 5.5); // pequena área
    linha(-9.16, 0, -9.16, 5.5);
    linha(9.16, 0, 9.16, 5.5);
    linha(-20.16, 16.5, 20.16, 16.5); // grande área
    linha(-20.16, 0, -20.16, 16.5);
    linha(20.16, 0, 20.16, 16.5);
    // Meia-lua
    ctx.beginPath();
    for (let a = -0.93; a <= 0.93; a += 0.05) {
        const p = projetar(Math.sin(a) * 9.15, 0, 11 + Math.cos(a) * 9.15);
        if (a === -0.93) ctx.moveTo(p.x, p.y);
        else ctx.lineTo(p.x, p.y);
    }
    ctx.lineWidth = 1.2;
    ctx.stroke();
    const marca = projetar(0, 0, 11);
    ctx.fillStyle = 'rgba(255,255,255,.85)';
    ctx.beginPath();
    ctx.ellipse(marca.x, marca.y, 5, 1.6, 0, 0, Math.PI * 2);
    ctx.fill();

    // Chão dentro do gol, mais escuro (sombra da rede)
    ctx.fillStyle = 'rgba(0,0,0,.25)';
    ctx.fillRect(0, CAMERA.chao + 2, W, H - CAMERA.chao);
}

/** Rede e traves em volta da tela (estamos dentro do gol). */
function desenharMoldura(ctx) {
    const malha = (x0, y0, x1, y1, passo) => {
        ctx.save();
        ctx.beginPath();
        ctx.rect(x0, y0, x1 - x0, y1 - y0);
        ctx.clip();
        ctx.fillStyle = 'rgba(8,8,10,.55)';
        ctx.fillRect(x0, y0, x1 - x0, y1 - y0);
        ctx.strokeStyle = 'rgba(255,255,255,.35)';
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        for (let k = -H; k < W + H; k += passo) {
            ctx.moveTo(k, 0);
            ctx.lineTo(k + H, H);
            ctx.moveTo(k, H);
            ctx.lineTo(k + H, 0);
        }
        ctx.stroke();
        ctx.restore();
    };
    // Teto e laterais da rede
    malha(0, 0, W, BORDA.topo - TRAVE.topo, 16);
    malha(0, 0, BORDA.esq - TRAVE.lado, H, 16);
    malha(BORDA.dir + TRAVE.lado, 0, W, H, 16);

    // Traves e travessão (vistos de dentro, com volume)
    const ferro = (x, y, w, h, vertical) => {
        const g = vertical ? ctx.createLinearGradient(x, 0, x + w, 0) : ctx.createLinearGradient(0, y, 0, y + h);
        g.addColorStop(0, '#9c9c9c');
        g.addColorStop(0.35, '#ffffff');
        g.addColorStop(1, '#bdbdbd');
        ctx.fillStyle = g;
        ctx.fillRect(x, y, w, h);
    };
    ferro(BORDA.esq - TRAVE.lado, BORDA.topo - TRAVE.topo, TRAVE.lado, CAMERA.chao - BORDA.topo + TRAVE.topo + 2, true);
    ferro(BORDA.dir, BORDA.topo - TRAVE.topo, TRAVE.lado, CAMERA.chao - BORDA.topo + TRAVE.topo + 2, true);
    ferro(BORDA.esq - TRAVE.lado, BORDA.topo - TRAVE.topo, BORDA.dir - BORDA.esq + 2 * TRAVE.lado, TRAVE.topo, false);
    // Sombra das traves no gramado de dentro
    ctx.fillStyle = 'rgba(0,0,0,.3)';
    ctx.fillRect(BORDA.esq - TRAVE.lado, CAMERA.chao, BORDA.dir - BORDA.esq + 2 * TRAVE.lado, 4);
}

/* =================================================================
   JOGADORES (de frente)
   ================================================================= */

/**
 * Jogador de linha visto de frente.
 * @param {CanvasRenderingContext2D} ctx
 * @param {{ camisa: string, calcao: string, meiao: string, faixa?: string[] }} kit
 * @param {{ x: number, y: number, h: number, pose: 'parado' | 'corrida' | 'chute' | 'cabeceio' | 'barreira', fase?: number, salto?: number, inclina?: number }} o
 */
function desenharJogador(ctx, kit, o) {
    const k = o.h / 100;
    ctx.save();
    ctx.translate(o.x, o.y);
    // Sombra no chão
    ctx.fillStyle = 'rgba(0,0,0,.3)';
    ctx.beginPath();
    ctx.ellipse(0, 0, 14 * k, 3.5 * k, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.scale(k, k);
    ctx.translate(0, -(o.salto ?? 0));
    ctx.rotate(o.inclina ?? 0);

    const fase = o.fase ?? 0;
    const quadril = -46;
    // Pernas
    for (const lado of [-1, 1]) {
        let peX = lado * 7;
        let peY = 0;
        if (o.pose === 'corrida') peY = -Math.max(0, Math.sin(fase + (lado > 0 ? Math.PI : 0))) * 10;
        if (o.pose === 'chute' && lado === 1) {
            peX = 5;
            peY = -Math.sin(limitar(fase, 0, 1) * Math.PI) * 26;
        }
        if (o.pose === 'cabeceio') peY = -6 + lado * 2;
        const joelho = { x: lado * 7.5, y: lerp(quadril, peY, 0.5) };
        membro(ctx, lado * 6, quadril + 4, joelho.x, joelho.y, 8, PELE);
        membro(ctx, joelho.x, joelho.y + 3, peX, peY - 4, 7, kit.meiao);
        chuteira(ctx, peX, peY, 0.7);
    }
    // Calção
    ctx.fillStyle = kit.calcao;
    ctx.beginPath();
    ctx.roundRect(-12.5, quadril - 6, 25, 14, 3);
    ctx.fill();
    ctx.fillStyle = volume(ctx, -12, quadril - 6, 12, quadril + 8, 0.3);
    ctx.fill();

    // Braços
    for (const lado of [-1, 1]) {
        const ombro = { x: lado * 13, y: quadril - 30 };
        let mao;
        if (o.pose === 'barreira')
            mao = { x: lado * 3, y: quadril + 4 }; // mãos protegendo
        else if (o.pose === 'cabeceio') mao = { x: lado * 22, y: quadril - 44 };
        else {
            const giro = o.pose === 'corrida' ? Math.sin(fase) * lado * 0.6 : 0.35;
            mao = { x: ombro.x + lado * 6 + Math.sin(giro) * 4, y: ombro.y + 24 };
        }
        membro(ctx, ombro.x, ombro.y + 3, mao.x, mao.y, 6.5, PELE);
        membro(ctx, ombro.x, ombro.y + 2, lerp(ombro.x, mao.x, 0.35), lerp(ombro.y, mao.y, 0.35), 8.5, kit.camisa);
    }
    // Tronco
    ctx.fillStyle = kit.camisa;
    ctx.beginPath();
    ctx.moveTo(-15, quadril - 31);
    ctx.quadraticCurveTo(-16, quadril - 35, -10, quadril - 35);
    ctx.lineTo(10, quadril - 35);
    ctx.quadraticCurveTo(16, quadril - 35, 15, quadril - 31);
    ctx.lineTo(12, quadril - 4);
    ctx.lineTo(-12, quadril - 4);
    ctx.closePath();
    ctx.fill();
    if (kit.padrao) {
        ctx.save();
        ctx.clip();
        pintarPadrao(ctx, kit, -16, quadril - 35, 32, 31);
        ctx.restore();
    }
    if (kit.faixa) {
        ctx.save();
        ctx.clip();
        kit.faixa.forEach((cor, i) => {
            ctx.fillStyle = cor;
            ctx.fillRect(-16, quadril - 26 + i * 3, 32, 3);
        });
        ctx.restore();
    }
    ctx.fillStyle = volume(ctx, -15, quadril - 35, 15, quadril - 4);
    ctx.fill();
    // Cabeça (de frente)
    const cy = quadril - 43;
    ctx.fillStyle = PELE;
    ctx.fillRect(-2.5, quadril - 38, 5, 4);
    ctx.beginPath();
    ctx.ellipse(0, cy, 6.2, 7, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = CABELO;
    ctx.beginPath();
    ctx.ellipse(0, cy - 3.2, 6.6, 4.4, 0, Math.PI, Math.PI * 2);
    ctx.fill();
    if (o.h > 34) {
        ctx.fillStyle = '#151515';
        ctx.fillRect(-3.2, cy, 1.6, 1.4);
        ctx.fillRect(1.6, cy, 1.6, 1.4);
    }
    ctx.restore();
}

/* =================================================================
   LUVAS
   ================================================================= */

/** Uma luva vista por trás (dedos para cima). `lado` -1 esquerda, 1 direita. */
function desenharLuva(ctx, x, y, lado, giro, detalhe) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(giro);
    ctx.scale(1.25, 1.25);
    const contorno = 'rgba(0,0,0,.18)';
    ctx.lineWidth = 1;

    // Sombra projetada
    ctx.fillStyle = 'rgba(0,0,0,.28)';
    ctx.beginPath();
    ctx.ellipse(3, 10, 22, 30, 0, 0, Math.PI * 2);
    ctx.fill();

    // Polegar (do lado de dentro, apontando para cima e para o meio)
    ctx.save();
    ctx.translate(-lado * 16, -2);
    ctx.rotate(-lado * 0.42);
    ctx.fillStyle = '#ededed';
    ctx.strokeStyle = contorno;
    ctx.beginPath();
    ctx.roundRect(-5.5, -19, 11, 22, 5.5);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#cfcfcf';
    ctx.beginPath();
    ctx.roundRect(-5.5, -19, 11, 7, [5.5, 5.5, 1, 1]);
    ctx.fill();
    ctx.restore();

    // Dedos, com ponta de látex
    const dedos = [
        { x: -12.6, h: 22 },
        { x: -4.2, h: 27 },
        { x: 4.2, h: 26 },
        { x: 12.6, h: 20 },
    ];
    for (const d of dedos) {
        const dx = d.x * -lado; // espelha: dedo mínimo fica do lado de fora
        ctx.fillStyle = '#f6f6f6';
        ctx.strokeStyle = contorno;
        ctx.beginPath();
        ctx.roundRect(dx - 4.3, -16 - d.h, 8.6, d.h + 6, 4.3);
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = '#d6d6d6';
        ctx.beginPath();
        ctx.roundRect(dx - 4.3, -16 - d.h, 8.6, 7, [4.3, 4.3, 1, 1]);
        ctx.fill();
    }

    // Dorso da mão
    ctx.fillStyle = '#f4f4f4';
    ctx.strokeStyle = contorno;
    ctx.beginPath();
    ctx.roundRect(-18, -20, 36, 32, 8);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = volume(ctx, -18, -20, 18, 12, 0.16);
    ctx.fill();
    // Faixa preta e dourada sobre os nós dos dedos
    ctx.fillStyle = '#141414';
    ctx.beginPath();
    ctx.roundRect(-16, -15, 32, 8, 4);
    ctx.fill();
    ctx.fillStyle = detalhe;
    ctx.fillRect(-14, -11.8, 28, 1.6);
    // Costura central
    ctx.strokeStyle = 'rgba(0,0,0,.12)';
    ctx.setLineDash([2, 2]);
    ctx.beginPath();
    ctx.moveTo(0, -4);
    ctx.lineTo(0, 10);
    ctx.stroke();
    ctx.setLineDash([]);

    // Punho com velcro
    ctx.fillStyle = '#151515';
    ctx.beginPath();
    ctx.roundRect(-17, 10, 34, 15, [3, 3, 6, 6]);
    ctx.fill();
    ctx.fillStyle = detalhe;
    ctx.fillRect(-17, 14, 34, 3);
    ctx.fillStyle = '#f4f4f4';
    ctx.fillRect(-17 + (lado > 0 ? 22 : 0), 18.5, 12, 4);
    ctx.restore();
}

/* =================================================================
   CENA
   ================================================================= */

/**
 * @param {HTMLCanvasElement} canvas
 * @param {{ aoChutar?: () => void, aoApitar?: () => void, zoeira?: boolean }} [eventos]
 */
export function criarCenaParedao(canvas, eventos = {}) {
    const ctx = /** @type {CanvasRenderingContext2D} */ (canvas.getContext('2d'));
    const fundo = document.createElement('canvas');
    fundo.width = W;
    fundo.height = H;
    desenharCampo(/** @type {CanvasRenderingContext2D} */ (fundo.getContext('2d')), !!eventos.zoeira);
    const moldura = document.createElement('canvas');
    moldura.width = W;
    moldura.height = H;
    desenharMoldura(/** @type {CanvasRenderingContext2D} */ (moldura.getContext('2d')));

    let kitAtacante = { camisa: '#0f7a3c', calcao: '#f4f4f4', meiao: '#0f7a3c' };
    let detalheLuva = '#d4af37';

    // Luvas: seguem o alvo com um pouco de peso
    const luvas = { x: W / 2, y: 260, alvoX: W / 2, alvoY: 260, vx: 0, vy: 0 };
    let ultimo = performance.now();
    let vivo = true;
    let quadro = 0;
    let tremor = 0;
    let flashes = [];

    /** @type {any} */ let jogada = null;

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

    /* ---------- controle ---------- */
    function aoMover(e) {
        const r = canvas.getBoundingClientRect();
        const x = ((e.clientX - r.left) / r.width) * W;
        // No toque, as luvas ficam acima do dedo (para o dedo não esconder)
        const y = ((e.clientY - r.top) / r.height) * H - (e.pointerType === 'touch' ? 70 : 0);
        luvas.alvoX = limitar(x, 8, W - 8);
        luvas.alvoY = limitar(y, 30, H - 30);
        if (e.pointerType === 'touch') e.preventDefault();
    }
    canvas.addEventListener('pointermove', aoMover);
    canvas.addEventListener('pointerdown', aoMover);

    /* ---------- desenho ---------- */
    function entidades(t) {
        /** @type {{ z: number, desenhar: () => void }[]} */
        const lista = [];
        const j = jogada;
        if (!j) return lista;
        const L = /** @type {Lance} */ (j.lance);
        const tc = j.tChute;

        // Barreira
        for (const b of L.barreira ?? []) {
            const p = projetar(b.x, 0, b.z);
            const salta = t > tc && t < tc + 0.5 ? Math.sin(((t - tc) / 0.5) * Math.PI) * 12 : 0;
            lista.push({
                z: b.z,
                desenhar: () =>
                    desenharJogador(ctx, kitAtacante, {
                        x: p.x,
                        y: p.y,
                        h: 1.8 * CAMERA.ky * p.s,
                        pose: 'barreira',
                        salto: salta,
                    }),
            });
        }

        // Cruzador
        if (L.cruzamento) {
            const de = L.cruzamento.de;
            const p = projetar(de.x + Math.sign(de.x) * 0.6, 0, de.z + 0.5);
            const fase = limitar((t - (L.preparo - 0.35)) / 0.45, 0, 1);
            lista.push({
                z: de.z + 0.5,
                desenhar: () =>
                    desenharJogador(ctx, kitAtacante, {
                        x: p.x,
                        y: p.y,
                        h: 1.8 * CAMERA.ky * p.s,
                        pose: fase > 0 ? 'chute' : 'parado',
                        fase,
                    }),
            });
        }

        // Atacante (quem finaliza)
        const pos = posicaoAtacante(t);
        if (pos) {
            const p = projetar(pos.x, 0, pos.z);
            lista.push({
                z: pos.z,
                desenhar: () =>
                    desenharJogador(ctx, kitAtacante, {
                        x: p.x,
                        y: p.y,
                        h: 1.8 * CAMERA.ky * p.s,
                        pose: pos.pose,
                        fase: pos.fase,
                        salto: pos.salto,
                        inclina: pos.inclina,
                    }),
            });
        }

        // Bola e sombra
        const b = posicaoBola(t);
        const desf = j.resultado?.desfecho;
        // Bola agarrada vai nas luvas; bola que entrou é desenhada por cima da moldura
        const escondida = desf === 'agarrou' || ((desf === 'gol' || desf === 'fora') && b.z < 0);
        if (b && b.visivel && !escondida) {
            const p = projetar(b.x, b.y, b.z);
            const chao = projetar(b.x, 0, b.z);
            const r = raioTela(p.s);
            lista.push({
                z: b.z - 0.01,
                desenhar: () => {
                    if (b.z > -0.3) {
                        ctx.fillStyle = `rgba(0,0,0,${0.35 * limitar(1 - b.y / 6, 0.15, 1)})`;
                        ctx.beginPath();
                        ctx.ellipse(chao.x, chao.y, r * 1.1, r * 0.35, 0, 0, Math.PI * 2);
                        ctx.fill();
                    }
                    desenharBola(ctx, { x: p.x, y: p.y, r, giro: t * 14, alfa: b.alfa ?? 1 });
                },
            });
        }
        return lista.sort((a, b2) => b2.z - a.z);
    }

    /** Onde está o atacante e em que pose, no instante t do lance. */
    function posicaoAtacante(t) {
        const j = jogada;
        const L = /** @type {Lance} */ (j.lance);
        const tc = j.tChute;
        const alvo = L.batedor;
        if (L.tipo === 'cabeca') {
            // Corre para a área durante o cruzamento e sobe para cabecear
            const ini = L.preparo;
            const fim = tc;
            const k = limitar((t - ini) / (fim - ini), 0, 1);
            const x = lerp(alvo.x - Math.sign(alvo.x || 1) * 2.5, alvo.x, suave(k));
            const z = lerp(alvo.z + 3.5, alvo.z, suave(k));
            const salto = t > fim - 0.35 && t < fim + 0.3 ? Math.sin(((t - (fim - 0.35)) / 0.65) * Math.PI) * 22 : 0;
            return { x, z, pose: k >= 0.75 ? 'cabeceio' : 'corrida', fase: t * 14, salto, inclina: 0 };
        }
        if (L.corrida) {
            const c = L.corrida;
            const ini = L.preparo;
            const k = c.duracao ? limitar((t - ini) / c.duracao, 0, 1) : 1;
            let x = lerp(c.de.x, c.ate.x, k);
            const z = lerp(c.de.z, c.ate.z, k) + 0.7;
            // Finta: balança para o lado errado antes de bater
            const tf = tc - 0.35;
            let inclina = 0;
            if (c.finta && t > tf && t < tc) {
                const f = Math.sin(((t - tf) / 0.35) * Math.PI);
                x += c.finta * 0.9 * f;
                inclina = c.finta * 0.25 * f;
            }
            const chutando = t >= tc - 0.12;
            return {
                x: x - 0.3,
                z,
                pose: chutando ? 'chute' : k < 1 ? 'corrida' : 'parado',
                fase: chutando ? (t - tc + 0.12) / 0.35 : t * 13,
                salto: 0,
                inclina,
            };
        }
        // Chute parado (longe, pênalti, falta): corrida curta até a bola
        const corrida = Math.min(1.1, L.preparo);
        const k = limitar((t - (tc - corrida)) / corrida, 0, 1);
        const ang = Math.atan2(alvo.x, alvo.z);
        const atras = lerp(4, 0.75, suave(k));
        const lado = -0.55;
        const x = alvo.x + Math.sin(ang) * atras + Math.cos(ang) * lado;
        const z = alvo.z + Math.cos(ang) * atras;
        const chutando = t >= tc - 0.12;
        return {
            x,
            z,
            pose: chutando ? 'chute' : k > 0 && k < 1 ? 'corrida' : 'parado',
            fase: chutando ? (t - tc + 0.12) / 0.35 : t * 12,
            salto: 0,
            inclina: 0,
        };
    }

    /** Posição da bola no instante t do lance (antes, durante e depois do chute). */
    function posicaoBola(t) {
        const j = jogada;
        const L = /** @type {Lance} */ (j.lance);
        const tc = j.tChute;
        if (t < tc) {
            if (L.cruzamento && t >= L.preparo) return { ...posicaoNoVoo(L.cruzamento, t - L.preparo), visivel: true };
            if (L.cruzamento) return { ...L.cruzamento.de, visivel: true };
            if (L.corrida && L.corrida.duracao) {
                const c = L.corrida;
                const k = limitar((t - L.preparo) / c.duracao, 0, 1);
                const toque = Math.abs(Math.sin(t * 6)) * 0.5; // bola indo e voltando nos pés
                return { x: lerp(c.de.x, c.ate.x, k), y: RAIO, z: lerp(c.de.z, c.ate.z, k) - toque, visivel: true };
            }
            return { ...L.batedor, y: RAIO, visivel: !L.cruzamento };
        }
        const dt = t - tc;
        const T = L.chute.T;
        if (dt <= T || !j.resultado) return { ...posicaoNoVoo(L.chute, Math.min(dt, T)), visivel: true };

        // Depois de chegar no gol
        const d = dt - T;
        const r = j.resultado;
        if (r.desfecho === 'agarrou') {
            const g = telaParaGol(luvas.x, luvas.y);
            return { x: g.x, y: g.y, z: 0, visivel: true };
        }
        if (r.desfecho === 'espalmou' || r.desfecho === 'trave') {
            return { ...posicaoNoVoo(r.rebatido, Math.min(d, 1.2)), visivel: true };
        }
        // Gol ou fora: segue reto para dentro (vem na direção da câmera)
        const p = posicaoNoVoo({ ...L.chute, a: { x: 0, y: -9.81, z: 0 } }, T + Math.min(d, 0.35) * 0.55);
        return { ...p, z: Math.max(p.z, -1.5), visivel: d < 0.45, alfa: r.desfecho === 'fora' ? 1 - d / 0.45 : 1 };
    }

    function desenhar(agora) {
        const dt = Math.min(0.05, (agora - ultimo) / 1000);
        ultimo = agora;

        // Luvas com inércia
        const segue = 1 - Math.exp(-dt * 24);
        const nx = luvas.x + (luvas.alvoX - luvas.x) * segue;
        const ny = luvas.y + (luvas.alvoY - luvas.y) * segue;
        luvas.vx = (nx - luvas.x) / (dt || 1 / 60);
        luvas.vy = (ny - luvas.y) / (dt || 1 / 60);
        if (!(jogada?.resultado?.desfecho === 'agarrou')) {
            luvas.x = nx;
            luvas.y = ny;
        }

        const k = canvas.width / W;
        ctx.setTransform(k, 0, 0, canvas.height / H, 0, 0);
        // Tremor da câmera no gol
        if (tremor > 0) {
            tremor = Math.max(0, tremor - dt);
            ctx.translate((Math.random() - 0.5) * 14 * tremor * 3, (Math.random() - 0.5) * 10 * tremor * 3);
        }
        ctx.drawImage(fundo, 0, 0, W, H);
        ctx.save();
        ctx.translate(0, 140 - 238);
        desenharPlacas(ctx, agora);
        ctx.restore();

        flashes = flashes.filter((f) => agora - f.t < 900);
        for (const f of flashes) {
            if (agora < f.t) continue;
            ctx.fillStyle = `rgba(255,255,255,${1 - (agora - f.t) / 900})`;
            ctx.beginPath();
            ctx.arc(f.x, f.y, 2, 0, Math.PI * 2);
            ctx.fill();
        }

        // Lance em andamento
        if (jogada) {
            const t = (agora - jogada.inicio) / 1000;
            atualizarLance(t);
            for (const e of entidades(t)) e.desenhar();
        }

        ctx.drawImage(moldura, 0, 0, W, H);

        // Bola dentro do gol (passou da linha): por cima da moldura, grande
        if (jogada?.resultado && ['gol', 'fora'].includes(jogada.resultado.desfecho)) {
            const t = (agora - jogada.inicio) / 1000;
            const b = posicaoBola(t);
            if (b.visivel && b.z < 0) {
                const p = projetar(b.x, b.y, b.z);
                desenharBola(ctx, { x: p.x, y: p.y, r: raioTela(p.s), giro: t * 14, alfa: b.alfa ?? 1 });
            }
        }

        // Luvas
        const agarrou = jogada?.resultado?.desfecho === 'agarrou';
        const abre = agarrou ? 27 : 33;
        const giro = limitar(luvas.vx / 4000, -0.25, 0.25);
        desenharLuva(ctx, luvas.x - abre, luvas.y, -1, -0.12 + giro + (agarrou ? 0.2 : 0), detalheLuva);
        desenharLuva(ctx, luvas.x + abre, luvas.y, 1, 0.12 + giro - (agarrou ? 0.2 : 0), detalheLuva);
        if (agarrou) {
            const t = (agora - jogada.inicio) / 1000;
            desenharBola(ctx, { x: luvas.x, y: luvas.y - 20, r: 19, giro: t * 2 });
        }
    }

    /** Dispara sons e decide o desfecho no momento certo. */
    function atualizarLance(t) {
        const j = jogada;
        const L = /** @type {Lance} */ (j.lance);
        if (!j.apitou && (L.tipo === 'penalti' || L.tipo === 'falta') && t > 0.25) {
            j.apitou = true;
            eventos.aoApitar?.();
        }
        if (!j.cruzou && L.cruzamento && t >= L.preparo) {
            j.cruzou = true;
            eventos.aoChutar?.();
        }
        if (!j.chutou && t >= j.tChute) {
            j.chutou = true;
            eventos.aoChutar?.();
        }
        if (!j.resultado && t >= j.tChute + L.chute.T) {
            const bola = posicaoNoVoo(L.chute, L.chute.T);
            const vel = velocidadeNoVoo(L.chute, L.chute.T);
            const g = telaParaGol(luvas.x, luvas.y);
            const desfecho = j.avaliar({ x: bola.x, y: bola.y }, g, Math.hypot(vel.x, vel.y, vel.z));
            const rebatido =
                desfecho === 'espalmou'
                    ? vooRebatido(bola, g, vel)
                    : desfecho === 'trave'
                      ? vooRebatido(bola, { x: Math.sign(bola.x) * GOL.meiaLargura * 1.05, y: bola.y }, vel)
                      : null;
            j.resultado = { desfecho, rebatido, bola };
            if (desfecho === 'gol') tremor = 0.35;
            if (desfecho === 'agarrou' || desfecho === 'espalmou') {
                for (let i = 0; i < 60; i++) {
                    flashes.push({
                        x: Math.random() * W,
                        y: 10 + Math.random() * 120,
                        t: performance.now() + Math.random() * 400,
                    });
                }
            }
            j.aoResultado(j.resultado);
        }
    }

    function loop(agora) {
        if (!vivo) return;
        desenhar(agora);
        quadro = requestAnimationFrame(loop);
    }
    quadro = requestAnimationFrame(loop);

    return {
        /** @param {{ atacante: { camisa: string, calcao: string, meiao: string, faixa?: string[] }, luva: string }} k */
        trocarKits(k) {
            kitAtacante = k.atacante;
            detalheLuva = k.luva;
        },
        /**
         * Joga um lance. `avaliar` decide o desfecho quando a bola chega no gol.
         * Resolve quando a animação termina, com o desfecho e o voo rebatido (se houver).
         * @param {Lance} lance
         * @param {(bola: {x:number,y:number}, luvas: {x:number,y:number}, velocidade: number) => Desfecho} avaliar
         * @param {(r: { desfecho: Desfecho, rebatido: any, bola: Vetor }) => void} aoResultado
         */
        jogar(lance, avaliar, aoResultado) {
            const tChute = lance.preparo + (lance.cruzamento ? lance.cruzamento.T : 0) + (lance.corrida?.duracao ?? 0);
            return new Promise((ok) => {
                jogada = {
                    lance,
                    tChute,
                    inicio: performance.now(),
                    avaliar,
                    aoResultado: (r) => {
                        aoResultado(r);
                        setTimeout(() => ok(r), r.desfecho === 'agarrou' ? 1200 : 1350);
                    },
                };
            });
        },
        /** Limpa o campo entre um lance e outro. */
        limpar() {
            jogada = null;
        },
        destruir() {
            vivo = false;
            cancelAnimationFrame(quadro);
            observador.disconnect();
            canvas.removeEventListener('pointermove', aoMover);
            canvas.removeEventListener('pointerdown', aoMover);
        },
    };
}
