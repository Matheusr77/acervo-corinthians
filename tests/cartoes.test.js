import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { anosDesde, dataExtensa, legendaPost } from '../public/assets/js/utils/cartaoPost.js';
import { linhasDestaque, ordenarPorPrestigio, pesoTitulo } from '../public/assets/js/utils/cartaoStory.js';

const jogo = {
    data: '2012-12-16',
    fase: 'Final - Jogo Único',
    campeonato: { nome: 'Mundial de Clubes' },
    estadio: { nome: 'Stadium Yokohama' },
    mandante: { id: 1, nome: 'Corinthians' },
    visitante: { id: 9, nome: 'Chelsea' },
    adversario: { id: 9, nome: 'Chelsea' },
    placar: { mandante: 1, visitante: 0 },
    golsPro: 1,
    golsContra: 0,
    resultado: 'V',
    observacoes: 'Bicampeão Mundial de Clubes',
};

describe('datas dos posts', () => {
    it('conta anos completos', () => {
        assert.equal(anosDesde('2012-12-16', '2026-12-16'), 14);
        assert.equal(anosDesde('2012-12-16', '2026-12-15'), 13);
    });
    it('escreve a data por extenso', () => assert.equal(dataExtensa('1977-10-13'), '13 de outubro de 1977'));
});

describe('legendaPost', () => {
    it('monta a legenda do Hoje na História', () => {
        const t = legendaPost({ tipo: 'hoje', jogo }, '2026-12-16', 'acervocorinthians.com.br');
        assert.match(t, /há 14 anos \(16\/12\/2012\): Corinthians 1 x 0 Chelsea/);
        assert.match(t, /📍 Stadium Yokohama/);
        assert.match(t, /🏆 Bicampeão Mundial de Clubes/);
        assert.match(t, /#HojeNaHistória/);
    });
    it('monta a legenda de aniversário com hashtag da competição', () => {
        const t = legendaPost(
            { tipo: 'aniversario', jogo, competicao: 'Mundial de Clubes', edicao: 2012 },
            '2026-12-16',
            'site',
        );
        assert.match(t, /Há 14 anos, o Corinthians era campeão: Mundial de Clubes 2012!/);
        assert.match(t, /#MundialDeClubes/);
    });
    it('usa "ano" no singular', () => {
        const t = legendaPost({ tipo: 'hoje', jogo: { ...jogo, data: '2025-12-16' } }, '2026-12-16', 'site');
        assert.match(t, /há 1 ano /);
    });
});

describe('cartão "O Timão na minha vida"', () => {
    const dados = {
        resumo: { aproveitamento: 61.2 },
        titulos: {
            competicoes: [
                { nome: 'Campeonato Paulista', total: 3 },
                { nome: 'Mundial de Clubes', total: 1 },
            ],
        },
        classicos: [{ nome: 'Derby Paulista', vitorias: 5, empates: 2, derrotas: 3 }],
        maiorVitoria: null,
        melhorTemporada: { ano: 2012, aproveitamento: 70.5 },
    };
    it('ordena títulos por importância', () => {
        assert.deepEqual(
            ordenarPorPrestigio(dados.titulos.competicoes).map((c) => c.nome),
            ['Mundial de Clubes', 'Campeonato Paulista'],
        );
        assert.ok(pesoTitulo('Libertadores da América') < pesoTitulo('Copa do Brasil'));
        assert.equal(pesoTitulo('Torneio Inventado'), pesoTitulo('Outro Inventado'));
    });
    it('monta os destaques e volta para títulos quando falta dado', () => {
        assert.deepEqual(linhasDestaque(dados, 'titulos').linhas, ['1 Mundial', '3 Paulistas']);
        assert.deepEqual(linhasDestaque(dados, 'classicos').linhas, ['Derby: 5V 2E 3D']);
        assert.equal(linhasDestaque(dados, 'goleada').rotulo, 'TÍTULOS QUE EU VIVI');
        assert.equal(linhasDestaque(dados, 'temporada').linhas[0], '2012');
    });
    it('sem títulos, mostra o aproveitamento', () => {
        const d = linhasDestaque({ ...dados, titulos: { competicoes: [] } }, 'titulos');
        assert.equal(d.rotulo, 'MEU APROVEITAMENTO');
    });
});
