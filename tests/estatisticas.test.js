import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { calcularAproveitamento, calcularSequencias, montarResumo } from '../server/utils/estatisticas.js';

describe('calcularAproveitamento', () => {
    it('calcula (V*3 + E) / (J*3)', () => {
        assert.equal(calcularAproveitamento({ vitorias: 2, empates: 1, derrotas: 1 }), 58.3);
    });

    it('retorna null sem jogos', () => {
        assert.equal(calcularAproveitamento({ vitorias: 0, empates: 0, derrotas: 0 }), null);
    });
});

describe('montarResumo', () => {
    it('converte a linha do banco e calcula saldo', () => {
        const r = montarResumo({ jogos: 3, vitorias: 1, empates: 1, derrotas: 1, gols_pro: 4, gols_contra: 6 });
        assert.deepEqual(r, {
            jogos: 3,
            vitorias: 1,
            empates: 1,
            derrotas: 1,
            golsPro: 4,
            golsContra: 6,
            saldo: -2,
            aproveitamento: 44.4,
        });
    });

    it('tolera linha nula', () => {
        assert.equal(montarResumo(null).jogos, 0);
    });
});

describe('calcularSequencias', () => {
    const jogo = (data, resultado) => ({ id: 0, data, resultado });

    it('encontra as maiores sequências', () => {
        const s = calcularSequencias([
            jogo('2000-01-01', 'V'),
            jogo('2000-01-02', 'V'),
            jogo('2000-01-03', 'E'),
            jogo('2000-01-04', 'V'),
            jogo('2000-01-05', 'D'),
            jogo('2000-01-06', 'D'),
        ]);
        assert.deepEqual(s.vitorias, { tamanho: 2, inicio: '2000-01-01', fim: '2000-01-02' });
        assert.deepEqual(s.invencibilidade, { tamanho: 4, inicio: '2000-01-01', fim: '2000-01-04' });
        assert.deepEqual(s.semVencer, { tamanho: 2, inicio: '2000-01-05', fim: '2000-01-06' });
    });

    it('ignora jogos sem placar', () => {
        const s = calcularSequencias([jogo('2000-01-01', 'V'), jogo('2000-01-02', null), jogo('2000-01-03', 'V')]);
        assert.equal(s.vitorias.tamanho, 2);
    });

    it('retorna null sem dados', () => {
        assert.equal(calcularSequencias([]).vitorias, null);
    });
});
