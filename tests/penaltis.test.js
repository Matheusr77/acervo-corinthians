import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { chuteCpu, cobranca, emojis, puloCpu, sortearZona, vencedor } from '../public/assets/js/utils/penaltis.js';

/** Gerador previsível (sempre devolve os valores em sequência). */
const seq = (...valores) => {
    let i = 0;
    return () => valores[i++ % valores.length];
};

describe('pênaltis: cobrança', () => {
    it('goleiro no canto errado = gol', () => {
        assert.equal(cobranca(3, 5, seq(0.9)), 'gol');
    });
    it('goleiro no mesmo canto de baixo = defesa', () => {
        assert.equal(cobranca(3, 3, seq(0.9)), 'defesa');
    });
    it('no meio, o goleiro alcança alto e baixo', () => {
        assert.equal(cobranca(1, 4, seq(0.9)), 'defesa');
        assert.equal(cobranca(4, 1, seq(0.9)), 'defesa');
    });
    it('nos lados precisa acertar a altura', () => {
        assert.equal(cobranca(0, 3, seq(0.9)), 'gol');
    });
    it('no ângulo o goleiro às vezes não alcança', () => {
        assert.equal(cobranca(0, 0, seq(0.9, 0.5)), 'defesa');
        assert.equal(cobranca(0, 0, seq(0.9, 0.8)), 'gol');
    });
    it('chute pode ir para fora ou na trave', () => {
        assert.equal(cobranca(0, 5, seq(0.01, 0.2)), 'trave');
        assert.equal(cobranca(0, 5, seq(0.01, 0.7)), 'fora');
    });
    it('aproveitamento fica perto do real (~70-80%)', () => {
        let gols = 0;
        const n = 20000;
        for (let i = 0; i < n; i++) if (cobranca(chuteCpu(), puloCpu()) === 'gol') gols++;
        const taxa = gols / n;
        assert.ok(taxa > 0.65 && taxa < 0.85, `taxa ${taxa}`);
    });
    it('sortearZona respeita os pesos', () => {
        assert.equal(
            sortearZona([0, 0, 1], () => 0.5),
            2,
        );
        assert.equal(
            sortearZona([1, 0, 0], () => 0.99),
            0,
        );
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
