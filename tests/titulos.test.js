import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { anoDaEdicao, ehJogoDeTitulo, montarTitulos } from '../server/utils/titulos.js';

describe('ehJogoDeTitulo', () => {
    for (const obs of [
        'Campeão Paulista pela 14ª vez',
        'Campeão',
        'Bicampeão Mundial de Clubes',
        'Jogo válido pelo Campeonato Paulista de 1951. Campeão Paulista pela 13ª vez',
        'Nos pênaltis, 4 x 3 para o Corinthians. Campeão',
        'O Campeão dos Campeões. Taça dos Campeões Estaduais RioSão Paulo',
    ]) {
        it(`reconhece "${obs}"`, () => assert.equal(ehJogoDeTitulo(obs), true));
    }

    for (const obs of [
        null,
        '',
        'Entrega do troféu de Campeão Brasileiro',
        'Taça dos Campeões Estaduais Rio-São Paulo',
        'Jogo válido pelo Campeonato Paulista de 1936',
    ]) {
        it(`ignora ${JSON.stringify(obs)}`, () => assert.equal(ehJogoDeTitulo(obs), false));
    }
});

describe('anoDaEdicao', () => {
    it('usa o ano citado em "Jogo válido pelo ... de AAAA"', () => {
        assert.equal(anoDaEdicao('Jogo válido pelo Campeonato Paulista de 1954. Campeão Paulista', '1955-02-06'), 1954);
    });
    it('usa o ano do jogo na falta da citação', () => {
        assert.equal(anoDaEdicao('Campeão', '1977-10-13'), 1977);
    });
});

describe('montarTitulos', () => {
    const jogo = (id, data, obs, nome, tipo) => ({ id, data, observacoes: obs, campeonato: { nome, tipo } });

    const resultado = montarTitulos([
        jogo(1, '2000-01-14', 'Campeão Mundial de Clubes', 'Mundial de Clubes', 'Mundial'),
        jogo(2, '2012-12-16', 'Bicampeão Mundial de Clubes', 'Mundial de Clubes', 'Mundial'),
        jogo(3, '2015-11-19', 'Campeão Brasileiro pela 6ª vez', 'Campeonato Brasileiro', 'Nacional'),
        jogo(4, '2015-11-22', 'Entrega do troféu de Campeão Brasileiro', 'Campeonato Brasileiro', 'Nacional'),
        jogo(5, '2015-12-01', 'Campeão', 'Campeonato Brasileiro', 'Nacional'), // duplicado na mesma edição
        jogo(6, '1953-03-12', 'Campeão', 'Torneio das Missões', 'Amistoso'),
        jogo(7, '1990-01-01', 'Jogo comum', 'Campeonato Paulista', 'Estadual'),
    ]);

    it('conta cada competição/edição uma vez', () => {
        assert.equal(resultado.total, 4);
        assert.equal(resultado.totalPrincipais, 3);
    });

    it('ordena as categorias por importância', () => {
        assert.deepEqual(
            resultado.categorias.map((c) => c.rotulo),
            ['Mundiais', 'Nacionais', 'Torneios Amistosos'],
        );
    });

    it('indexa por ano com o tipo do campeonato', () => {
        assert.deepEqual(resultado.porAno[2012], [
            { competicao: 'Mundial de Clubes', tipo: 'Mundial', principal: true },
        ]);
        assert.equal(resultado.porAno[1953][0].principal, false);
    });
});
