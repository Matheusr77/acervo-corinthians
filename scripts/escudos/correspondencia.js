/**
 * Correspondência entre os times do banco e os clubes do Wikidata.
 * Funções puras (sem rede), testadas em tests/escudos.test.js.
 */

/** Palavras que indicam "tipo de clube" e não diferenciam um time do outro. */
const PALAVRAS_GENERICAS = new Set([
    'esporte',
    'sport',
    'sociedade',
    'esportiva',
    'esportivo',
    'associacao',
    'club',
    'clube',
    'futebol',
    'football',
    'fc',
    'ec',
    'sc',
    'se',
    'aa',
    'ca',
    'ac',
    'cf',
    'cr',
    'de',
    'do',
    'da',
    'dos',
    'das',
    'recreativo',
    'recreativa',
    'regatas',
    'e',
]);

/**
 * Minúsculas, sem acentos e sem pontuação: "S.E. Palmeiras" → "s e palmeiras".
 * @param {string | null | undefined} texto
 */
export function normalizar(texto) {
    return String(texto ?? '')
        .normalize('NFD')
        .replace(/[̀-ͯ]/g, '')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, ' ')
        .trim();
}

/**
 * Nome "curto", sem palavras genéricas: "Sociedade Esportiva Palmeiras" → "palmeiras".
 * @param {string} texto
 */
export function nomeCurto(texto) {
    const palavras = normalizar(texto).split(' ').filter(Boolean);
    const uteis = palavras.filter((p) => !PALAVRAS_GENERICAS.has(p));
    return (uteis.length ? uteis : palavras).join(' ');
}

/**
 * @typedef {{ id: number, nome: string, cidade: string | null }} TimeDoBanco
 * @typedef {{ qid: string, nomes: string[], cidade: string | null, arquivo: string }} ClubeWikidata
 * @typedef {{ status: 'ok' | 'revisar' | 'faltando', clube: ClubeWikidata | null, motivo: string }} Resultado
 */

/**
 * Pontua um clube do Wikidata como candidato para um time do banco.
 *  3 = nome igual a um rótulo/apelido; 2 = igual depois de tirar palavras genéricas.
 *  Cidade igual soma 2; cidade diferente descarta o candidato.
 * @param {TimeDoBanco} time
 * @param {ClubeWikidata} clube
 * @returns {{ pontos: number, nomeExato: boolean, cidade: 'igual' | 'diferente' | 'desconhecida' }}
 */
export function pontuar(time, clube) {
    const alvo = normalizar(time.nome);
    const alvoCurto = nomeCurto(time.nome);
    const nomeExato = clube.nomes.some((n) => normalizar(n) === alvo);
    const nomeParecido = nomeExato || clube.nomes.some((n) => nomeCurto(n) === alvoCurto);
    if (!nomeParecido) return { pontos: 0, nomeExato: false, cidade: 'desconhecida' };

    let cidade = 'desconhecida';
    if (time.cidade && clube.cidade)
        cidade = normalizar(time.cidade) === normalizar(clube.cidade) ? 'igual' : 'diferente';
    if (cidade === 'diferente') return { pontos: 0, nomeExato, cidade };

    return { pontos: (nomeExato ? 3 : 2) + (cidade === 'igual' ? 2 : 0), nomeExato, cidade };
}

/**
 * Escolhe o melhor clube para o time.
 *  ok       → um único melhor candidato, com nome exato ou cidade confirmada
 *  revisar  → achou, mas há empate ou a confirmação é fraca (conferir a imagem)
 *  faltando → nenhum candidato
 * @param {TimeDoBanco} time
 * @param {ClubeWikidata[]} clubes
 * @returns {Resultado}
 */
export function escolherClube(time, clubes) {
    const pontuados = clubes
        .map((clube) => ({ clube, ...pontuar(time, clube) }))
        .filter((c) => c.pontos > 0)
        .sort((a, b) => b.pontos - a.pontos);

    if (!pontuados.length)
        return { status: 'faltando', clube: null, motivo: 'nenhum clube com esse nome e escudo no Wikidata' };

    const [melhor, segundo] = pontuados;
    const empate = segundo && segundo.pontos === melhor.pontos && segundo.clube.qid !== melhor.clube.qid;
    if (empate) {
        return {
            status: 'revisar',
            clube: melhor.clube,
            motivo: `${pontuados.length} clubes com o mesmo nome; confira a cidade`,
        };
    }
    if (melhor.cidade === 'igual') return { status: 'ok', clube: melhor.clube, motivo: 'nome e cidade conferem' };
    if (melhor.nomeExato) return { status: 'ok', clube: melhor.clube, motivo: 'nome confere (cidade sem confirmação)' };
    return { status: 'revisar', clube: melhor.clube, motivo: 'nome parecido, sem confirmação de cidade' };
}

/**
 * Extrai o nome do arquivo do Commons de uma URL do Wikidata:
 * ".../Special:FilePath/Palmeiras%20logo.svg" → "Palmeiras logo.svg"
 * @param {string} url
 */
export function arquivoDoCommons(url) {
    const fim = String(url).split('/').pop() ?? '';
    return decodeURIComponent(fim).replace(/_/g, ' ');
}

/**
 * Converte a resposta JSON da consulta SPARQL em clubes.
 * @param {{ results: { bindings: Record<string, { value: string }>[] } }} json
 * @returns {ClubeWikidata[]}
 */
export function lerRespostaSparql(json) {
    return json.results.bindings.map((b) => {
        const nomes = [b.rotulo?.value, b.rotuloEn?.value, ...(b.apelidos?.value ?? '').split('|')]
            .map((n) => n?.trim())
            .filter(Boolean);
        return {
            qid: b.clube.value.split('/').pop(),
            nomes: [...new Set(nomes)],
            cidade: b.cidade?.value ?? null,
            arquivo: arquivoDoCommons(b.logo.value),
        };
    });
}

/**
 * Tira tags HTML do texto de autor do Commons ("<a ...>Fulano</a>" → "Fulano").
 * @param {string | null | undefined} html
 */
export function textoSemHtml(html) {
    return (
        String(html ?? '')
            .replace(/<[^>]*>/g, '')
            .replace(/\s+/g, ' ')
            .trim() || null
    );
}
