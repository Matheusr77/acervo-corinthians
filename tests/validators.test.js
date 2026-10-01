import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { HttpError } from '../server/utils/httpError.js';
import { parseAno, parseBusca, parseFiltrosJogos, parseId, parsePaginacao } from '../server/utils/validators.js';

describe('parseId', () => {
    it('aceita inteiros positivos', () => assert.equal(parseId('42'), 42));
    for (const invalido of ['0', '-1', 'abc', '1.5', '']) {
        it(`rejeita "${invalido}"`, () => assert.throws(() => parseId(invalido), HttpError));
    }
});

describe('parseAno', () => {
    it('aceita ano válido', () => assert.equal(parseAno('2012'), 2012));
    it('rejeita ano absurdo', () => assert.throws(() => parseAno('20120'), HttpError));
});

describe('parseBusca', () => {
    it('faz trim e limita o tamanho', () => {
        assert.equal(parseBusca('  pal  '), 'pal');
        assert.equal(parseBusca('x'.repeat(200)).length, 60);
    });
    it('retorna null para vazio', () => assert.equal(parseBusca('   '), null));
});

describe('parsePaginacao', () => {
    it('usa padrões', () => assert.deepEqual(parsePaginacao({}), { pagina: 1, limite: 20, offset: 0 }));
    it('limita o máximo', () => assert.equal(parsePaginacao({ limite: '9999' }).limite, 100));
    it('calcula offset', () => assert.equal(parsePaginacao({ pagina: '3', limite: '10' }).offset, 20));
});

describe('parseFiltrosJogos', () => {
    it('normaliza valores', () => {
        const f = parseFiltrosJogos({ ano: '2012', resultado: 'v', mando: 'CASA', ordem: 'ASC' });
        assert.equal(f.ano, 2012);
        assert.equal(f.resultado, 'V');
        assert.equal(f.mando, 'casa');
        assert.equal(f.ordem, 'asc');
    });
    it('ignora filtros vazios', () => {
        const f = parseFiltrosJogos({ ano: '', campeonato: '' });
        assert.equal(f.ano, null);
        assert.equal(f.campeonato, null);
        assert.equal(f.ordem, 'desc');
    });
    it('rejeita resultado inválido', () => assert.throws(() => parseFiltrosJogos({ resultado: 'X' }), HttpError));
    it('rejeita mando inválido', () => assert.throws(() => parseFiltrosJogos({ mando: 'neutro' }), HttpError));
});
