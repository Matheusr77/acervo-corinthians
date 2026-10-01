import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { criarAleatorio, hashTexto } from '../server/utils/aleatorio.js';
import { CONDICOES, sequenciaAtual } from '../server/utils/estatisticas.js';
import { MINIMO_JOGOS_RANKING, calcularTabus, rankear } from '../server/services/rivalidadesService.js';
import { ajustarFonte, svgDoJogo } from '../server/services/ogImageService.js';

const jogo = (data, resultado, id_adversario = 1) => ({ data, resultado, id_adversario, em_casa: 1 });

describe('sequenciaAtual', () => {
    const jogos = [jogo('2020-01-01', 'D'), jogo('2020-01-02', 'V'), jogo('2020-01-03', 'E'), jogo('2020-01-04', 'V')];

    it('conta do jogo mais recente para trás', () => {
        assert.deepEqual(sequenciaAtual(jogos, CONDICOES.invicto), {
            tamanho: 3,
            inicio: '2020-01-02',
            fim: '2020-01-04',
        });
        assert.equal(sequenciaAtual(jogos, CONDICOES.vitorias).tamanho, 1);
        assert.equal(sequenciaAtual(jogos, CONDICOES.semVencer).tamanho, 0);
    });

    it('ignora jogos sem placar', () => {
        assert.equal(sequenciaAtual([...jogos, jogo('2020-01-05', null)], CONDICOES.invicto).tamanho, 3);
    });
});

describe('rankear', () => {
    const adv = (nome, jogos, aproveitamento) => ({ nome, jogos, aproveitamento });
    const lista = [
        adv('Freguês', 50, 80),
        adv('Carrasco', 60, 30),
        adv('Poucos jogos', MINIMO_JOGOS_RANKING - 1, 100),
        adv('Meio', 40, 55),
    ];

    it('ignora adversários com poucos jogos', () => {
        assert.ok(!rankear(lista, 'fregueses').some((a) => a.nome === 'Poucos jogos'));
    });
    it('ordena fregueses e carrascos', () => {
        assert.equal(rankear(lista, 'fregueses')[0].nome, 'Freguês');
        assert.equal(rankear(lista, 'carrascos')[0].nome, 'Carrasco');
    });
});

describe('calcularTabus', () => {
    const rival = { id: 7, nome: 'Rival' };
    const extinto = { id: 8, nome: 'Extinto' };
    const resultados = [
        ...Array.from({ length: 16 }, (_, i) => jogo(`19${10 + i}-01-01`, 'D', 7)),
        ...Array.from({ length: 22 }, (_, i) => jogo(`1930-01-${String(i + 1).padStart(2, '0')}`, 'V', 8)),
        ...Array.from({ length: 6 }, (_, i) => jogo(`202${i}-06-01`, 'V', 7)),
    ].sort((a, b) => a.data.localeCompare(b.data));

    const tabus = calcularTabus(
        resultados,
        new Map([
            [7, rival],
            [8, extinto],
        ]),
    );

    it('encontra o tabu em andamento', () => {
        assert.equal(tabus.length, 1);
        assert.equal(tabus[0].adversario.nome, 'Rival');
        assert.equal(tabus[0].tamanho, 6);
        assert.equal(tabus[0].tipo, 'favor');
    });

    it('ignora rivais que não são mais enfrentados', () => {
        assert.ok(!tabus.some((t) => t.adversario.nome === 'Extinto'));
    });
});

describe('sorteio do quiz', () => {
    const sequencia = (semente) => {
        const rnd = criarAleatorio(semente);
        return [rnd.proximo(), rnd.proximo(), rnd.proximo()];
    };

    it('a mesma data gera sempre a mesma sequência', () => {
        assert.deepEqual(sequencia(hashTexto('2026-09-30')), sequencia(hashTexto('2026-09-30')));
    });
    it('datas diferentes geram sequências diferentes', () => {
        assert.notDeepEqual(sequencia(hashTexto('2026-09-30')), sequencia(hashTexto('2026-10-01')));
    });
    it('embaralhar mantém os itens', () => {
        const rnd = criarAleatorio(42);
        assert.deepEqual(rnd.embaralhar([1, 2, 3, 4]).sort(), [1, 2, 3, 4]);
    });
});

describe('imagem de prévia (SVG)', () => {
    it('reduz a fonte de nomes longos', () => {
        assert.equal(ajustarFonte('Santos', 38, 340), 38);
        assert.ok(ajustarFonte('Associação Atlética Portuguesa Santista', 38, 340) < 38);
    });

    it('escapa textos vindos do banco', () => {
        const time = (id, nome) => ({ id, nome, sigla: null, escudo: null });
        const svg = svgDoJogo({
            id: 1,
            data: '2012-12-16',
            fase: 'Final',
            campeonato: { nome: 'Mundial <b>&</b>' },
            estadio: { nome: 'Yokohama' },
            mandante: time(1, 'Corinthians'),
            visitante: time(2, '</text><script>x</script>'),
            adversario: time(2, '</text><script>x</script>'),
            placar: { mandante: 1, visitante: 0 },
            resultado: 'V',
            jogoDoTitulo: true,
        });
        assert.ok(!svg.includes('<script>'));
        assert.ok(svg.includes('&lt;/text&gt;&lt;script&gt;'));
        assert.ok(svg.includes('MUNDIAL &lt;B&gt;&amp;&lt;/B&gt;'));
    });
});
