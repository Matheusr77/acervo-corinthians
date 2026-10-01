import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { escaparLike, montarFiltros } from '../server/repositories/sql.js';

describe('montarFiltros', () => {
    it('sem filtros não gera WHERE', () => {
        assert.deepEqual(montarFiltros({}), { where: '', params: {} });
    });

    it('usa intervalo de datas para o ano (aproveita índice)', () => {
        const { where, params } = montarFiltros({ ano: 2012 });
        assert.match(where, /jc\.data >= :dataInicio AND jc\.data < :dataFim/);
        assert.deepEqual(params, { dataInicio: '2012-01-01', dataFim: '2013-01-01' });
    });

    it('nunca concatena valores do usuário no SQL', () => {
        const { where, params } = montarFiltros({ adversario: "x' OR 1=1 --", campeonato: 'Paulista' });
        assert.ok(!where.includes('OR 1=1'));
        assert.equal(params.adversario, "%x' OR 1=1 --%");
        assert.equal(params.campeonato, 'Paulista');
    });

    it('inclui condições extras fixas', () => {
        const { where } = montarFiltros({ resultado: 'V' }, ['jc.publico > 0']);
        assert.equal(where, 'WHERE jc.publico > 0 AND jc.resultado = :resultado');
    });
});

describe('escaparLike', () => {
    it('escapa curingas', () => assert.equal(escaparLike('50%_a\\b'), '50\\%\\_a\\\\b'));
});

describe('montarFiltros (lista de adversários)', () => {
    it('usa IN com array para clássicos com mais de um registro', () => {
        const { where, params } = montarFiltros({ adversarioIds: [102, 7] });
        assert.equal(where, 'WHERE jc.id_adversario IN (:adversarioIds)');
        assert.deepEqual(params.adversarioIds, [102, 7]);
    });
});
