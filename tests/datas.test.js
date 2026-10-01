import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { anosDesde, formatarDiaDoAno, haAnos, hojeDiaMes, somarDias } from '../public/assets/js/utils/format.js';
import { hojeEmSaoPaulo } from '../server/utils/datas.js';
import { HttpError } from '../server/utils/httpError.js';
import { parseData, parseDiaMes } from '../server/utils/validators.js';

describe('parseData', () => {
    it('aceita data válida', () => assert.equal(parseData('2003-05-10'), '2003-05-10'));
    it('aceita 29/02 em ano bissexto', () => assert.equal(parseData('2004-02-29'), '2004-02-29'));
    for (const invalida of ['2003-02-29', '2003-13-01', '10/05/2003', '', '1800-01-01', '2003-5-10']) {
        it(`rejeita "${invalida}"`, () => assert.throws(() => parseData(invalida), HttpError));
    }
});

describe('parseDiaMes', () => {
    it('aceita 09-30 e 02-29', () => {
        assert.deepEqual(parseDiaMes('09-30'), { mes: 9, dia: 30 });
        assert.deepEqual(parseDiaMes('02-29'), { mes: 2, dia: 29 });
    });
    for (const invalido of ['02-30', '04-31', '13-01', '9-30', 'hoje']) {
        it(`rejeita "${invalido}"`, () => assert.throws(() => parseDiaMes(invalido), HttpError));
    }
});

describe('datas do "Hoje na história"', () => {
    const agora = new Date(2026, 8, 30); // 30/09/2026 (mês começa em 0)

    it('hojeDiaMes', () => assert.equal(hojeDiaMes(agora), '09-30'));
    it('formatarDiaDoAno', () => assert.equal(formatarDiaDoAno(9, 30), '30 de setembro'));

    it('anosDesde conta aniversário ainda não completado', () => {
        assert.equal(anosDesde('1962-09-30', agora), 64);
        assert.equal(anosDesde('2012-12-16', agora), 13);
        assert.equal(anosDesde('2026-09-30', agora), 0);
    });

    it('haAnos', () => {
        assert.equal(haAnos(0), 'neste ano');
        assert.equal(haAnos(1), 'há 1 ano');
        assert.equal(haAnos(64), 'há 64 anos');
    });

    it('somarDias passa por 29/02 e vira o ano', () => {
        assert.equal(somarDias('02-28', 1), '02-29');
        assert.equal(somarDias('02-29', 1), '03-01');
        assert.equal(somarDias('12-31', 1), '01-01');
        assert.equal(somarDias('01-01', -1), '12-31');
    });

    it('hojeEmSaoPaulo usa o fuso do clube', () => {
        // 02:00 UTC de 01/10 ainda é 30/09 em São Paulo (UTC-3)
        assert.deepEqual(hojeEmSaoPaulo(new Date('2026-10-01T02:00:00Z')), { ano: 2026, mes: 9, dia: 30 });
    });
});
