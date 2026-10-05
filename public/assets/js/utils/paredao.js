/**
 * Física e regras do Paredão (sem DOM, para dar para testar).
 *
 * Mundo em metros, com origem no meio da linha do gol:
 *   x = lateral (negativo à esquerda de quem está no gol olhando o campo)
 *   y = altura
 *   z = distância da linha do gol, campo adentro
 * O gol vai de x = -3,66 a 3,66 e de y = 0 a 2,44, no plano z = 0.
 *
 * A bola segue p(t) = p0 + v0·t + ½·a·t², com gravidade e um "efeito"
 * (aceleração lateral/vertical constante, que faz a bola curvar ou cair).
 * A velocidade inicial é calculada para a bola cruzar o plano do gol
 * exatamente no alvo escolhido pelo atacante, no tempo T.
 */

export const GOL = { meiaLargura: 3.66, altura: 2.44 };
export const RAIO = 0.11;
const G = 9.81;
/** Área das duas luvas juntas (meios-eixos, em metros). */
export const LUVAS = { rx: 0.6, ry: 0.42 };
/** Bola que chega mais devagar que isso, no meio das luvas, é agarrada. */
const VEL_AGARRA = 27;

/** Projeção da câmera (dentro do gol, olhando o campo), em pixels lógicos 800×500. */
export const CAMERA = { W: 800, H: 500, cx: 400, chao: 430, horizonte: 150, kx: 101, ky: 147.5, D: 8 };

/**
 * Ponto do mundo → tela.
 * @returns {{ x: number, y: number, s: number }} s = escala de profundidade (1 na linha do gol)
 */
export function projetar(x, y, z) {
    const c = CAMERA;
    const s = c.D / (c.D + Math.max(z, -c.D * 0.8));
    return { x: c.cx + x * c.kx * s, y: c.horizonte + (c.chao - c.horizonte) * s - y * c.ky * s, s };
}

/** Tela → ponto no plano do gol (z = 0). */
export const telaParaGol = (sx, sy) => ({ x: (sx - CAMERA.cx) / CAMERA.kx, y: (CAMERA.chao - sy) / CAMERA.ky });

/* ------------------------------------------------------------------ */
/* Trajetória                                                          */
/* ------------------------------------------------------------------ */

/**
 * @typedef {{ x: number, y: number, z: number }} Vetor
 * @typedef {{ p0: Vetor, v0: Vetor, a: Vetor, T: number }} Voo
 */

/**
 * Calcula o voo que sai de p0 e cruza o plano z = 0 no alvo, em T segundos.
 * @param {Vetor} p0
 * @param {{ x: number, y: number }} alvo
 * @param {number} T
 * @param {{ x?: number, y?: number }} [efeito] - aceleração extra (curva lateral, bola caindo)
 * @returns {Voo}
 */
export function planejarVoo(p0, alvo, T, efeito = {}) {
    const a = { x: efeito.x ?? 0, y: -G + (efeito.y ?? 0), z: 0 };
    const v0 = {
        x: (alvo.x - p0.x - 0.5 * a.x * T * T) / T,
        y: (alvo.y - p0.y - 0.5 * a.y * T * T) / T,
        z: -p0.z / T,
    };
    return { p0, v0, a, T };
}

/** Posição da bola no voo, no instante t. */
export function posicaoNoVoo(voo, t) {
    const { p0, v0, a } = voo;
    return {
        x: p0.x + v0.x * t + 0.5 * a.x * t * t,
        y: Math.max(RAIO, p0.y + v0.y * t + 0.5 * a.y * t * t),
        z: p0.z + v0.z * t,
    };
}

/** Velocidade (m/s) no instante t. */
export function velocidadeNoVoo(voo, t) {
    const { v0, a } = voo;
    return { x: v0.x + a.x * t, y: v0.y + a.y * t, z: v0.z };
}

const modulo = (v) => Math.hypot(v.x, v.y, v.z);

/* ------------------------------------------------------------------ */
/* Lances                                                              */
/* ------------------------------------------------------------------ */

/**
 * @typedef {'longe' | 'penalti' | 'falta' | 'cabeca' | 'cara' | 'rebote'} TipoLance
 * @typedef {{
 *   tipo: TipoLance,
 *   rotulo: string,
 *   preparo: number,
 *   chute: Voo,
 *   batedor: Vetor,
 *   cruzamento?: Voo & { de: Vetor },
 *   corrida?: { de: Vetor, ate: Vetor, duracao: number, finta: number },
 *   barreira?: Vetor[],
 * }} Lance
 */

const ROTULOS = {
    longe: 'Chute de longe',
    penalti: 'Pênalti!',
    falta: 'Falta perigosa',
    cabeca: 'Cruzamento na área',
    cara: 'Cara a cara!',
    rebote: 'Rebote!',
};

/** Sorteio de alvo no gol: quanto maior a dificuldade, mais perto dos cantos. */
function sortearAlvo(rnd, dificuldade, { baixo = false, alto = false } = {}) {
    const canto = 0.35 + dificuldade * 0.55; // 0 meio … 1 rente à trave
    const lado = rnd() < 0.5 ? -1 : 1;
    const x = lado * Math.min(GOL.meiaLargura - 0.22, (0.4 + rnd() * canto) * GOL.meiaLargura);
    let y = 0.2 + rnd() * 2.0;
    if (baixo) y = 0.18 + rnd() * 0.7;
    if (alto) y = 1.5 + rnd() * 0.75;
    return { x, y: Math.min(GOL.altura - 0.2, y) };
}

const entre = (rnd, a, b) => a + rnd() * (b - a);

/**
 * Monta um lance.
 * @param {TipoLance} tipo
 * @param {number} dificuldade - 0 (fácil) a 1 (difícil)
 * @param {() => number} [rnd]
 * @returns {Lance}
 */
export function criarLance(tipo, dificuldade, rnd = Math.random) {
    const d = Math.min(1, Math.max(0, dificuldade));
    const rapidez = 1 - d * 0.22; // tempos ficam até 22% menores

    if (tipo === 'penalti') {
        const p0 = { x: 0, y: RAIO, z: 11 };
        const alvo = sortearAlvo(rnd, d);
        return {
            tipo,
            rotulo: ROTULOS[tipo],
            preparo: 1.4,
            batedor: p0,
            chute: planejarVoo(p0, alvo, entre(rnd, 0.5, 0.58) * rapidez),
        };
    }

    if (tipo === 'falta') {
        for (let tentativa = 0; tentativa < 60; tentativa++) {
            const lado = rnd() < 0.5 ? -1 : 1;
            const p0 = { x: lado * entre(rnd, 4, 9), y: RAIO, z: entre(rnd, 19, 24) };
            // A bola vai para o canto oposto ao lado da cobrança, por cima da barreira
            const alvo = { x: -lado * entre(rnd, 1.6, 3.3), y: entre(rnd, 1.3, 2.2) };
            const curva = lado * entre(rnd, 3, 6 + d * 4); // curva puxando para o gol
            const chute = planejarVoo(p0, alvo, entre(rnd, 1.0, 1.15) * rapidez, { x: curva, y: -2 - d * 2 });
            // Barreira a 9,15 m da bola, na direção do meio do gol
            const dist = Math.hypot(p0.x, p0.z);
            const centro = { x: p0.x - (p0.x / dist) * 9.15, y: 0, z: p0.z - (p0.z / dist) * 9.15 };
            const barreira = [-1.5, -0.5, 0.5, 1.5].map((k) => ({ x: centro.x + k * 0.55, y: 0, z: centro.z }));
            // A bola precisa passar por cima da barreira (ou longe dela)
            const t = (p0.z - centro.z) / -chute.v0.z;
            const naBarreira = posicaoNoVoo(chute, t);
            const passa = naBarreira.y > 2.25 || Math.abs(naBarreira.x - centro.x) > 1.5;
            if (passa) return { tipo, rotulo: ROTULOS[tipo], preparo: 1.6, batedor: p0, chute, barreira };
        }
    }

    if (tipo === 'cabeca') {
        const lado = rnd() < 0.5 ? -1 : 1;
        const de = { x: lado * entre(rnd, 20, 26), y: RAIO, z: entre(rnd, 8, 16) };
        const cabeca = { x: lado * entre(rnd, 0.3, 2.6), y: 2.25, z: entre(rnd, 6, 9) };
        const tCruz = 1.05;
        // Cruzamento: voo de "de" até a cabeça (reaproveita o planejador mudando a origem do eixo z)
        const cruz = planejarVoo({ x: de.x, y: de.y, z: de.z - cabeca.z }, { x: cabeca.x, y: cabeca.y }, tCruz);
        const cruzamento = { ...cruz, p0: de, v0: { ...cruz.v0, z: (cabeca.z - de.z) / tCruz }, de };
        const alvo = sortearAlvo(rnd, d, { baixo: rnd() < 0.7 });
        return {
            tipo,
            rotulo: ROTULOS[tipo],
            preparo: 1.0,
            batedor: cabeca,
            cruzamento,
            chute: planejarVoo(cabeca, alvo, entre(rnd, 0.55, 0.68) * rapidez, { y: 2 }),
        };
    }

    if (tipo === 'cara' || tipo === 'rebote') {
        const rebote = tipo === 'rebote';
        const ate = { x: entre(rnd, -2.5, 2.5), y: RAIO, z: rebote ? entre(rnd, 6, 8) : entre(rnd, 8, 10.5) };
        const de = rebote ? ate : { x: ate.x + entre(rnd, -6, 6), y: RAIO, z: entre(rnd, 22, 26) };
        const alvo = sortearAlvo(rnd, d, { baixo: rnd() < 0.6 });
        // Finta: o atacante balança para um lado e bate no outro
        const finta = !rebote && d > 0.45 && rnd() < 0.7 ? -Math.sign(alvo.x) : 0;
        return {
            tipo,
            rotulo: ROTULOS[tipo],
            preparo: rebote ? 0.25 : 0.4,
            batedor: ate,
            corrida: { de, ate, duracao: rebote ? 0 : 1.5, finta },
            chute: planejarVoo(ate, alvo, (rebote ? 0.42 : entre(rnd, 0.42, 0.5)) * rapidez),
        };
    }

    // Chute de longe (também a saída padrão)
    const p0 = { x: entre(rnd, -10, 10), y: RAIO, z: entre(rnd, 20, 28) };
    const alvo = sortearAlvo(rnd, d);
    const curva = (rnd() < 0.5 ? -1 : 1) * d * entre(rnd, 2, 7);
    return {
        tipo: 'longe',
        rotulo: ROTULOS.longe,
        preparo: 1.1,
        batedor: p0,
        chute: planejarVoo(p0, alvo, entre(rnd, 0.85, 1) * rapidez, { x: curva }),
    };
}

/** Sequência da partida (10 lances, do mais fácil ao mais difícil). */
export function montarPartida(rnd = Math.random) {
    const tipos = ['longe', 'penalti', 'cabeca', 'falta', 'cara', 'longe', 'cabeca', 'falta', 'cara', 'penalti'];
    return tipos.map((tipo, i) => criarLance(/** @type {TipoLance} */ (tipo), i / (tipos.length - 1), rnd));
}

/* ------------------------------------------------------------------ */
/* Resultado                                                           */
/* ------------------------------------------------------------------ */

/**
 * @typedef {'agarrou' | 'espalmou' | 'gol' | 'trave' | 'fora'} Desfecho
 */

/**
 * O que acontece quando a bola chega na linha do gol.
 * @param {{ x: number, y: number }} bola - onde a bola cruza o plano do gol
 * @param {{ x: number, y: number }} luvas - centro das luvas no plano do gol
 * @param {number} velocidade - m/s na chegada
 * @returns {Desfecho}
 */
export function desfecho(bola, luvas, velocidade) {
    const ax = Math.abs(bola.x);
    const foraLado = ax > GOL.meiaLargura + RAIO;
    const foraAlto = bola.y > GOL.altura + RAIO;
    const naTraveLateral = ax >= GOL.meiaLargura - RAIO && ax <= GOL.meiaLargura + RAIO + 0.06 && bola.y < GOL.altura;
    const noTravessao = bola.y >= GOL.altura - RAIO && bola.y <= GOL.altura + RAIO + 0.06 && ax < GOL.meiaLargura;

    // Luvas: elipse em volta do centro, aumentada pelo raio da bola
    const du = (bola.x - luvas.x) / (LUVAS.rx + RAIO);
    const dv = (bola.y - luvas.y) / (LUVAS.ry + RAIO);
    const dist = Math.sqrt(du * du + dv * dv);
    const dentroDoGol = ax < GOL.meiaLargura + RAIO && bola.y < GOL.altura + RAIO;

    if (dist <= 1 && dentroDoGol) return dist < 0.5 && velocidade < VEL_AGARRA ? 'agarrou' : 'espalmou';
    if (naTraveLateral || noTravessao) return 'trave';
    if (foraLado || foraAlto) return 'fora';
    return 'gol';
}

/** Velocidade da bola ao chegar no gol. */
export const velocidadeChegada = (voo) => modulo(velocidadeNoVoo(voo, voo.T));

/**
 * Voo da bola depois de espalmada ou de bater na trave (só visual).
 * @param {{ x: number, y: number }} bola
 * @param {{ x: number, y: number }} luvas
 * @param {Vetor} velocidade - velocidade na chegada
 * @param {() => number} [rnd]
 * @returns {Voo}
 */
export function vooRebatido(bola, luvas, velocidade, rnd = Math.random) {
    const p0 = { x: bola.x, y: bola.y, z: 0.05 };
    const dx = bola.x - luvas.x || (rnd() - 0.5) * 0.2;
    const v0 = {
        x: dx * 9 + velocidade.x * 0.25,
        y: 2.5 + (bola.y - luvas.y) * 6 + rnd() * 2,
        z: Math.abs(velocidade.z) * (0.18 + rnd() * 0.15),
    };
    return { p0, v0, a: { x: 0, y: -G, z: 0 }, T: 1.2 };
}

/**
 * A bola rebatida volta para o campo (dá rebote) ou sai?
 * @param {Voo} rebatido
 */
export function sobraNaArea(rebatido) {
    const fim = posicaoNoVoo(rebatido, 0.7);
    return Math.abs(fim.x) < 7 && fim.z > 2 && fim.z < 12 && fim.y < 2.5;
}
