import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { html, raw } from '../public/assets/js/core/html.js';
import {
    formatarData,
    formatarDataExtensa,
    formatarPorcentagem,
    formatarSaldo,
    normalizar,
    plural,
} from '../public/assets/js/utils/format.js';

describe('html (template com escape)', () => {
    it('escapa valores interpolados', () => {
        const nome = '<script>alert("x")</script>';
        assert.equal(String(html`<p>${nome}</p>`), '<p>&lt;script&gt;alert(&quot;x&quot;)&lt;/script&gt;</p>');
    });

    it('não escapa componentes aninhados nem raw()', () => {
        const filho = html`<b>${'a&b'}</b>`;
        assert.equal(String(html`<p>${filho}${raw('<i>ok</i>')}</p>`), '<p><b>a&amp;b</b><i>ok</i></p>');
    });

    it('renderiza arrays e ignora null/false', () => {
        assert.equal(String(html`${[1, 2]}${null}${false}${undefined}`), '12');
    });
});

describe('format', () => {
    it('datas sem deslocamento de fuso', () => {
        assert.equal(formatarData('2012-12-16'), '16/12/2012');
        assert.equal(formatarDataExtensa('2012-12-16'), '16 de dezembro de 2012');
        assert.equal(formatarData(null), '—');
    });

    it('números', () => {
        assert.equal(formatarPorcentagem(72.44), '72,4%');
        assert.equal(formatarSaldo(5), '+5');
        assert.equal(formatarSaldo(-3), '−3');
        assert.equal(plural(1, 'jogo'), '1 jogo');
        assert.equal(plural(1200, 'jogo'), '1.200 jogos');
    });

    it('normaliza acentos', () => assert.equal(normalizar('São Paulo'), 'sao paulo'));
});
