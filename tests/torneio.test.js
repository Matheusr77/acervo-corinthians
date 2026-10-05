import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
    TIMAO,
    campeao,
    criarTorneio,
    faseDaEliminacao,
    jogoDoTimao,
    nivel,
    nomeFase,
    registrarResultado,
    simularParedao,
    simularPenaltis,
    totalRodadas,
} from '../public/assets/js/utils/torneio.js';

const TIMES =
    'palmeiras sao-paulo santos flamengo vasco fluminense botafogo gremio internacional atletico-mg cruzeiro bahia athletico-pr fortaleza sport ponte-preta guarani portuguesa goias coritiba'.split(
        ' ',
    );

describe('torneio', () => {
    it('monta a chave com o Timão e o Palmeiras em lados opostos', () => {
        for (const n of /** @type {(4|8|16)[]} */ ([4, 8, 16])) {
            const t = criarTorneio(n, TIMES);
            const todos = t.rodadas[0].flatMap((j) => [j.a, j.b]);
            assert.equal(todos.length, n);
            assert.equal(new Set(todos).size, n);
            assert.equal(todos[0], TIMAO);
            assert.equal(todos[n - 1], 'palmeiras');
            assert.equal(totalRodadas(t), Math.log2(n));
        }
    });
    it('nomes das fases', () => {
        const t = criarTorneio(16, TIMES);
        assert.equal(nomeFase(t, 0), 'Oitavas de final');
        assert.equal(nomeFase(t, 3), 'Final');
        assert.equal(nomeFase(criarTorneio(4, TIMES), 0), 'Semifinal');
    });
    it('campeão vencendo todas', () => {
        let t = criarTorneio(8, TIMES);
        assert.equal(nivel(t), 0);
        while (t.status === 'jogando') {
            assert.ok(jogoDoTimao(t));
            t = registrarResultado(t, { nos: 5, eles: 4 }, simularPenaltis);
        }
        assert.equal(t.status, 'campeao');
        assert.equal(campeao(t), TIMAO);
        assert.equal(t.rodadas.length, 3);
    });
    it('eliminado: o resto é simulado até sair um campeão', () => {
        let t = criarTorneio(16, TIMES);
        t = registrarResultado(t, { nos: 6, eles: 3 }, simularParedao);
        assert.equal(nivel(t), 1 / 3);
        t = registrarResultado(t, { nos: 2, eles: 7 }, simularParedao);
        assert.equal(t.status, 'eliminado');
        assert.equal(t.rodadas.length, 4);
        assert.ok(campeao(t) && campeao(t) !== TIMAO);
        assert.equal(faseDaEliminacao(t)?.rodada, 1);
        for (const r of t.rodadas) for (const j of r) assert.ok(j.vencedor && j.placar && j.placar.a !== j.placar.b);
    });
    it('não aceita empate no mata-mata', () => {
        assert.throws(() => registrarResultado(criarTorneio(4, TIMES), { nos: 3, eles: 3 }, simularPenaltis));
    });
    it('placares simulados são válidos', () => {
        for (let i = 0; i < 500; i++) {
            const p = simularPenaltis();
            assert.notEqual(p.a, p.b);
            const q = simularParedao();
            assert.ok(q.a !== q.b && q.a + q.b <= 10);
        }
    });
});
