import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
    FORCA_IDEAL,
    chuteCpu,
    emojis,
    forcaNoTempo,
    puloCpu,
    resultadoCobranca,
    trajetoria,
    vencedor,
} from '../public/assets/js/utils/penaltis.js';

/** "Aleatório" fixo em 0,5: sem erro na trajetória. */
const meio = () => 0.5;
const FORCA_BOA = (FORCA_IDEAL.min + FORCA_IDEAL.max) / 2;

describe('pênaltis: trajetória', () => {
    it('força na faixa verde: a bola vai onde mirou', () => {
        const b = trajetoria({ u: 0.2, v: 0.6 }, FORCA_BOA, meio);
        assert.ok(Math.abs(b.u - 0.2) < 1e-9 && Math.abs(b.v - 0.6) < 1e-9);
    });
    it('forte demais: a bola sobe', () => {
        const b = trajetoria({ u: 0.2, v: 0.3 }, 1, meio);
        assert.ok(b.v < 0, `v ${b.v}`);
    });
    it('barra de força vai e volta', () => {
        assert.equal(forcaNoTempo(0), 0);
        assert.ok(Math.abs(forcaNoTempo(550) - 1) < 1e-9);
        assert.ok(forcaNoTempo(1100) < 1e-9);
    });
});

describe('pênaltis: resultado', () => {
    it('goleiro do outro lado = gol', () => {
        assert.equal(resultadoCobranca({ u: 0.15, v: 0.7 }, { u: 0.8, v: 0.5 }, FORCA_BOA), 'gol');
    });
    it('goleiro no mesmo canto = defesa', () => {
        assert.equal(resultadoCobranca({ u: 0.2, v: 0.6 }, { u: 0.22, v: 0.6 }, FORCA_BOA), 'defesa');
    });
    it('no ângulo, pulando no lado certo mas baixo, o goleiro não alcança', () => {
        assert.equal(resultadoCobranca({ u: 0.04, v: 0.06 }, { u: 0.2, v: 0.8 }, FORCA_BOA), 'gol');
    });
    it('trave, travessão e fora', () => {
        assert.equal(resultadoCobranca({ u: 0.01, v: 0.5 }, { u: 0.8, v: 0.5 }, FORCA_BOA), 'trave');
        assert.equal(resultadoCobranca({ u: 0.5, v: 0.01 }, { u: 0.2, v: 0.5 }, FORCA_BOA), 'trave');
        assert.equal(resultadoCobranca({ u: 1.1, v: 0.5 }, { u: 0.2, v: 0.5 }, FORCA_BOA), 'fora');
        assert.equal(resultadoCobranca({ u: 0.5, v: -0.2 }, { u: 0.2, v: 0.5 }, FORCA_BOA), 'fora');
    });
    it('bola fraca dá mais alcance ao goleiro', () => {
        const bola = { u: 0.37, v: 0.6 };
        const pulo = { u: 0.2, v: 0.6 };
        assert.equal(resultadoCobranca(bola, pulo, FORCA_BOA), 'gol');
        assert.equal(resultadoCobranca(bola, pulo, 0.1), 'defesa');
    });
    it('aproveitamento do computador fica perto do real (65-80%)', () => {
        let gols = 0;
        const n = 20000;
        for (let i = 0; i < n; i++) {
            const { mira, forca } = chuteCpu();
            if (resultadoCobranca(trajetoria(mira, forca), puloCpu(), forca) === 'gol') gols++;
        }
        const taxa = gols / n;
        assert.ok(taxa > 0.65 && taxa < 0.8, `taxa ${taxa}`);
    });
});

describe('pênaltis: quem vence', () => {
    const V = true;
    const X = false;
    it('ninguém antes de decidir', () => {
        assert.equal(vencedor([V], []), null);
        assert.equal(vencedor([V, V, V, V, V], [V, V, V, V, V]), null);
    });
    it('encerra antes quando o rival não alcança mais', () => {
        assert.equal(vencedor([V, V, V], [X, X, X]), 'corinthians');
        assert.equal(vencedor([X, X, X], [V, V, V]), 'rival');
    });
    it('não encerra cedo se ainda dá para empatar', () => {
        assert.equal(vencedor([V, V, V], [X, X]), null);
    });
    it('5 cobranças para cada lado', () => {
        assert.equal(vencedor([V, V, V, V, V], [V, V, V, V, X]), 'corinthians');
        assert.equal(vencedor([V, V, V, X, X], [V, V, V, V]), 'rival');
    });
    it('morte súbita decide depois de os dois baterem', () => {
        const cinco = [V, V, V, V, V];
        assert.equal(vencedor([...cinco, X], cinco), null);
        assert.equal(vencedor([...cinco, X], [...cinco, V]), 'rival');
        assert.equal(vencedor([...cinco, V], [...cinco, X]), 'corinthians');
        assert.equal(vencedor([...cinco, V], [...cinco, V]), null);
    });
    it('emojis', () => {
        assert.equal(emojis([V, X, V]), '✅❌✅');
    });
});
