import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
    arquivoDoCommons,
    escolherClube,
    lerRespostaSparql,
    nomeCurto,
    normalizar,
    textoSemHtml,
} from '../scripts/escudos/correspondencia.js';

const clube = (qid, nomes, cidade) => ({ qid, nomes, cidade, arquivo: `${qid}.svg` });

describe('normalização de nomes', () => {
    it('tira acentos e pontuação', () => assert.equal(normalizar('S.E. Palmeiras'), 's e palmeiras'));
    it('tira palavras genéricas de clube', () => {
        assert.equal(nomeCurto('Sociedade Esportiva Palmeiras'), 'palmeiras');
        assert.equal(nomeCurto('Clube Atlético Mineiro'), 'atletico mineiro');
        assert.equal(nomeCurto('Santos Futebol Clube'), 'santos');
    });
});

describe('escolherClube', () => {
    const clubes = [
        clube('Q1', ['Sociedade Esportiva Palmeiras', 'Palmeiras'], 'São Paulo'),
        clube('Q2', ['Associação Portuguesa de Desportos', 'Portuguesa'], 'São Paulo'),
        clube('Q3', ['Associação Atlética Portuguesa', 'Portuguesa Santista', 'Portuguesa'], 'Santos'),
        clube('Q4', ['Guarani Futebol Clube', 'Guarani'], null),
        clube('Q5', ['Guarani Esporte Clube', 'Guarani'], null),
        clube('Q6', ['Santos Futebol Clube'], 'Santos'),
    ];

    it('confirma por nome e cidade', () => {
        const r = escolherClube({ id: 1, nome: 'Palmeiras', cidade: 'São Paulo' }, clubes);
        assert.equal(r.status, 'ok');
        assert.equal(r.clube.qid, 'Q1');
    });

    it('usa a cidade para separar clubes com o mesmo nome', () => {
        const r = escolherClube({ id: 2, nome: 'Portuguesa', cidade: 'São Paulo' }, clubes);
        assert.equal(r.status, 'ok');
        assert.equal(r.clube.qid, 'Q2');
    });

    it('acha pelo nome curto ("Santos Futebol Clube" → "Santos")', () => {
        const r = escolherClube({ id: 3, nome: 'Santos', cidade: 'Santos' }, clubes);
        assert.equal(r.clube.qid, 'Q6');
        assert.equal(r.status, 'ok');
    });

    it('manda para revisão quando há empate', () => {
        const r = escolherClube({ id: 4, nome: 'Guarani', cidade: 'Campinas' }, clubes);
        assert.equal(r.status, 'revisar');
    });

    it('descarta clube de outra cidade', () => {
        const r = escolherClube({ id: 5, nome: 'Palmeiras', cidade: 'São João da Boa Vista' }, clubes);
        assert.equal(r.status, 'faltando');
    });

    it('marca como faltando quando não há candidato', () => {
        assert.equal(escolherClube({ id: 6, nome: 'Flamengo', cidade: 'Rio de Janeiro' }, clubes).status, 'faltando');
    });
});

describe('leitura das respostas da Wikimedia', () => {
    it('extrai o arquivo do Commons da URL do Wikidata', () => {
        assert.equal(
            arquivoDoCommons('http://commons.wikimedia.org/wiki/Special:FilePath/Palmeiras%20logo.svg'),
            'Palmeiras logo.svg',
        );
    });

    it('converte o JSON do SPARQL', () => {
        const [c] = lerRespostaSparql({
            results: {
                bindings: [
                    {
                        clube: { value: 'http://www.wikidata.org/entity/Q80964' },
                        rotulo: { value: 'Sociedade Esportiva Palmeiras' },
                        apelidos: { value: 'Palmeiras|Verdão' },
                        cidade: { value: 'São Paulo' },
                        logo: { value: 'http://commons.wikimedia.org/wiki/Special:FilePath/Logo_SEP.svg' },
                    },
                ],
            },
        });
        assert.deepEqual(c, {
            qid: 'Q80964',
            nomes: ['Sociedade Esportiva Palmeiras', 'Palmeiras', 'Verdão'],
            cidade: 'São Paulo',
            arquivo: 'Logo SEP.svg',
        });
    });

    it('limpa HTML do autor', () => assert.equal(textoSemHtml('<a href="x">Fulano</a> <b>Silva</b>'), 'Fulano Silva'));
});
