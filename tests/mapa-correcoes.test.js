import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { after, before, describe, it } from 'node:test';

// Os serviços leem a configuração: usa uma pasta temporária para os avisos
const PASTA = await fs.mkdtemp(path.join(os.tmpdir(), 'acervo-correcoes-'));
process.env.DB_NAME ??= 'teste';
process.env.DATA_DIR = PASTA;

const { montarMapa, normalizar } = await import('../server/services/mapaService.js');
const correcoes = await import('../server/services/correcoesService.js');
const { HttpError } = await import('../server/utils/httpError.js');

const linha = (cidade, estado, pais, jogos, v = jogos, e = 0, d = 0) => ({
    cidade,
    estado,
    pais,
    jogos,
    vitorias: v,
    empates: e,
    derrotas: d,
    gols_pro: v * 2,
    gols_contra: d,
    estadios: 1,
});

describe('montarMapa', () => {
    const geo = {
        municipios: { 'sao paulo|SP': [10, 20], 'santos|SP': [12, 25], 'brasilia|DF': [5, 5] },
        paises: { brasil: 'BR', argentina: 'AR', eua: 'US' },
    };
    const mapa = montarMapa(
        [
            linha('São Paulo', 'SP', 'Brasil', 10, 6, 2, 2),
            linha('Santos', 'SP', 'Brasil', 4),
            linha('Taguatinga', 'DF', 'Brasil', 2), // nome histórico → Brasília
            linha('Cidade Inventada', 'SP', 'Brasil', 1),
            linha('Buenos Aires', null, 'Argentina', 3, 1, 1, 1),
            linha('Atlântida', null, 'Atlântida', 1),
        ],
        geo,
    );

    it('agrupa cidades com posição e ordena por jogos', () => {
        assert.deepEqual(
            mapa.cidades.map((c) => [c.nome, c.uf, c.x, c.y, c.jogos]),
            [
                ['São Paulo', 'SP', 10, 20, 10],
                ['Santos', 'SP', 12, 25, 4],
                ['Taguatinga', 'DF', 5, 5, 2],
            ],
        );
    });
    it('soma os estados (inclui cidades sem posição)', () => {
        assert.deepEqual(
            mapa.estados.map((e) => [e.uf, e.jogos]),
            [
                ['SP', 15],
                ['DF', 2],
            ],
        );
    });
    it('calcula o aproveitamento', () => assert.equal(Math.round(mapa.cidades[0].aproveitamento), 67));
    it('separa jogos no Brasil e no exterior', () => {
        assert.equal(mapa.totais.jogosNoBrasil, 17);
        assert.equal(mapa.totais.jogosNoExterior, 4); // país sem código ISO também é exterior
        assert.equal(mapa.paises.find((p) => p.nome === 'Argentina').iso, 'AR');
    });
    it('lista o que não foi localizado', () => {
        const nomes = mapa.naoLocalizadas.map((n) => n.nome).sort();
        assert.deepEqual(nomes, ['Atlântida', 'Cidade Inventada - SP']);
    });
    it('normaliza nomes como a base', () => assert.equal(normalizar("Santa Bárbara d'Oeste"), 'santa barbara d oeste'));
});

describe('validarCorrecao', () => {
    const valido = { tipo: 'placar', descricao: 'O placar foi 3 x 1, não 2 x 1.', pagina: '/jogos/10', jogoId: '10' };

    it('aceita e normaliza um aviso válido', () => {
        const r = correcoes.validarCorrecao({ ...valido, nome: '  Matheus ', email: 'FIEL@Exemplo.com' });
        assert.equal(r.nome, 'Matheus');
        assert.equal(r.email, 'fiel@exemplo.com');
        assert.equal(r.jogoId, 10);
        assert.equal(r.sugestao, null);
    });
    it('rejeita tipo desconhecido e descrição curta', () => {
        try {
            correcoes.validarCorrecao({ tipo: 'hack', descricao: 'curta' });
            assert.fail('deveria rejeitar');
        } catch (err) {
            assert.ok(err instanceof HttpError);
            assert.deepEqual(Object.keys(err.details).sort(), ['descricao', 'tipo']);
        }
    });
    it('rejeita e-mail inválido e textos longos', () => {
        assert.throws(() => correcoes.validarCorrecao({ ...valido, email: 'nao-e-email' }), HttpError);
        assert.throws(() => correcoes.validarCorrecao({ ...valido, descricao: 'x'.repeat(1001) }), HttpError);
        assert.throws(() => correcoes.validarCorrecao({ ...valido, nome: 'x'.repeat(61) }), HttpError);
    });
    it('não aceita página externa nem tipo herdado do protótipo', () => {
        assert.equal(correcoes.validarCorrecao({ ...valido, pagina: '//site-malicioso.com' }).pagina, '/');
        assert.equal(correcoes.validarCorrecao({ ...valido, pagina: 'https://x.com' }).pagina, '/');
        assert.throws(() => correcoes.validarCorrecao({ ...valido, tipo: 'toString' }), HttpError);
    });
    it('ignora jogoId inválido', () =>
        assert.equal(correcoes.validarCorrecao({ ...valido, jogoId: 'abc' }).jogoId, null));
});

describe('limite de envios', () => {
    before(() => correcoes._zerarLimites());
    it('bloqueia o sexto envio em 15 minutos e libera depois', () => {
        const t = 1_000_000;
        for (let i = 0; i < 5; i += 1) assert.equal(correcoes.dentroDoLimite('1.2.3.4', t + i), true);
        assert.equal(correcoes.dentroDoLimite('1.2.3.4', t + 10), false);
        assert.equal(correcoes.dentroDoLimite('5.6.7.8', t + 10), true);
        assert.equal(correcoes.dentroDoLimite('1.2.3.4', t + 15 * 60 * 1000 + 5), true);
    });
});

describe('armazenamento das correções', () => {
    after(() => fs.rm(PASTA, { recursive: true, force: true }));

    it('grava, lista e muda o status', async () => {
        const { id } = await correcoes.registrar({ tipo: 'data', descricao: 'A data correta é 12/10/1977.' });
        await correcoes.registrar({ tipo: 'outro', descricao: 'Outro aviso qualquer aqui.' });

        let lista = await correcoes.listar();
        assert.equal(lista.correcoes.length, 2);
        assert.deepEqual(lista.contagem, { aberta: 2, aceita: 0, recusada: 0 });

        await correcoes.atualizarStatus(id, 'aceita');
        lista = await correcoes.listar('aceita');
        assert.deepEqual(
            lista.correcoes.map((c) => c.id),
            [id],
        );
        assert.equal((await correcoes.listar('aberta')).correcoes.length, 1);
    });
    it('recusa status inválido e id inexistente', async () => {
        await assert.rejects(correcoes.atualizarStatus('x', 'apagada'), HttpError);
        await assert.rejects(correcoes.atualizarStatus('nao-existe', 'aceita'), { status: 404 });
        await assert.rejects(correcoes.listar('qualquer'), HttpError);
    });
    it('ignora linhas corrompidas', () => {
        const r = correcoes.lerLinhas(
            '{"id":"a","criadoEm":"2026-01-01","descricao":"ok ok ok ok"}\n{quebrado\n{"id":"a","status":"recusada"}\n',
        );
        assert.equal(r.length, 1);
        assert.equal(r[0].status, 'recusada');
    });
});

describe('tokenValido', () => {
    it('compara a senha do painel', () => {
        assert.equal(correcoes.tokenValido('segredo', 'segredo'), true);
        assert.equal(correcoes.tokenValido('errado', 'segredo'), false);
        assert.equal(correcoes.tokenValido('qualquer', null), false);
        assert.equal(correcoes.tokenValido(undefined, 'segredo'), false);
    });
});
