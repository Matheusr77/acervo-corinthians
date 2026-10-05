import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
    CAMERA,
    GOL,
    criarLance,
    desfecho,
    montarPartida,
    planejarVoo,
    posicaoNoVoo,
    projetar,
    sobraNaArea,
    telaParaGol,
    velocidadeChegada,
    vooRebatido,
} from '../public/assets/js/utils/paredao.js';

const perto = (a, b, tol = 1e-6) => Math.abs(a - b) <= tol;

describe('paredão: câmera', () => {
    it('trave e travessão nas bordas da tela', () => {
        const traveEsq = projetar(-GOL.meiaLargura, 0, 0);
        const travessao = projetar(0, GOL.altura, 0);
        assert.ok(perto(traveEsq.x, 30, 0.5));
        assert.ok(perto(travessao.y, 70, 0.5));
        assert.equal(traveEsq.y, CAMERA.chao);
    });
    it('quanto mais longe, menor e mais perto do horizonte', () => {
        const perto11 = projetar(0, 0, 11);
        const longe = projetar(0, 0, 40);
        assert.ok(longe.s < perto11.s && longe.y < perto11.y && longe.y > CAMERA.horizonte);
    });
    it('tela ↔ gol', () => {
        const p = projetar(1.2, 0.8, 0);
        const g = telaParaGol(p.x, p.y);
        assert.ok(perto(g.x, 1.2) && perto(g.y, 0.8));
    });
});

describe('paredão: trajetória', () => {
    it('a bola cruza a linha do gol exatamente no alvo, no tempo T', () => {
        const voo = planejarVoo({ x: -6, y: 0.11, z: 22 }, { x: 2.8, y: 1.9 }, 0.9, { x: 5, y: -2 });
        const fim = posicaoNoVoo(voo, voo.T);
        assert.ok(perto(fim.x, 2.8) && perto(fim.y, 1.9) && perto(fim.z, 0));
    });
    it('todos os lances da partida chegam no gol (ou perto) e na hora', () => {
        for (let k = 0; k < 200; k++) {
            for (const lance of montarPartida()) {
                const fim = posicaoNoVoo(lance.chute, lance.chute.T);
                assert.ok(perto(fim.z, 0), lance.tipo);
                assert.ok(Math.abs(fim.x) < GOL.meiaLargura && fim.y > 0 && fim.y < GOL.altura, lance.tipo);
                const v = velocidadeChegada(lance.chute);
                assert.ok(v > 9 && v < 45, `${lance.tipo} ${v}`);
            }
        }
    });
    it('falta passa por cima ou longe da barreira', () => {
        for (let k = 0; k < 300; k++) {
            const l = criarLance('falta', Math.random());
            if (l.tipo !== 'falta') continue;
            const b = l.barreira?.[0];
            assert.ok(b);
            const centroX = ((l.barreira?.[1].x ?? 0) + (l.barreira?.[2].x ?? 0)) / 2;
            const t = (l.chute.p0.z - b.z) / -l.chute.v0.z;
            const p = posicaoNoVoo(l.chute, t);
            assert.ok(p.y > 2.25 || Math.abs(p.x - centroX) > 1.5);
        }
    });
    it('cruzamento chega na cabeça do atacante', () => {
        const l = criarLance('cabeca', 0.5);
        const c = l.cruzamento;
        assert.ok(c);
        const fim = posicaoNoVoo(c, c.T);
        assert.ok(perto(fim.x, l.batedor.x) && perto(fim.y, l.batedor.y) && perto(fim.z, l.batedor.z));
    });
    it('lances ficam mais rápidos com a dificuldade', () => {
        let facil = 0;
        let dificil = 0;
        for (let k = 0; k < 300; k++) {
            facil += velocidadeChegada(criarLance('longe', 0).chute);
            dificil += velocidadeChegada(criarLance('longe', 1).chute);
        }
        assert.ok(dificil > facil);
    });
});

describe('paredão: desfecho', () => {
    const v = 22;
    it('luvas no lugar: agarra; de raspão: espalma', () => {
        assert.equal(desfecho({ x: 1, y: 1 }, { x: 1.05, y: 1 }, v), 'agarrou');
        assert.equal(desfecho({ x: 1, y: 1 }, { x: 1.5, y: 1.2 }, v), 'espalmou');
        assert.equal(desfecho({ x: 1, y: 1 }, { x: 1.05, y: 1 }, 35), 'espalmou');
    });
    it('luvas longe: gol', () => {
        assert.equal(desfecho({ x: -2.5, y: 0.4 }, { x: 1, y: 1.2 }, v), 'gol');
    });
    it('trave e fora', () => {
        assert.equal(desfecho({ x: 3.66, y: 1 }, { x: -2, y: 1 }, v), 'trave');
        assert.equal(desfecho({ x: 0, y: 2.48 }, { x: -2, y: 1 }, v), 'trave');
        assert.equal(desfecho({ x: 4.5, y: 1 }, { x: -2, y: 1 }, v), 'fora');
        assert.equal(desfecho({ x: 0, y: 3 }, { x: -2, y: 1 }, v), 'fora');
    });
    it('bola espalmada volta para o campo', () => {
        const r = vooRebatido({ x: 1, y: 1 }, { x: 0.7, y: 1 }, { x: 0, y: 0, z: -25 }, () => 0.5);
        assert.ok(r.v0.z > 0 && r.v0.x > 0);
        assert.equal(typeof sobraNaArea(r), 'boolean');
    });
});
