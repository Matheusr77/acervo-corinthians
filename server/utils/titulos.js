/**
 * Extração de títulos a partir do campo `jogo.observacoes`.
 *
 * O banco não tem tabela de títulos, mas o scraping registra no jogo decisivo
 * frases como "Campeão Paulista pela 14ª vez", "Campeão da Libertadores pela
 * 1ª vez" ou "Bicampeão Mundial de Clubes". Estas funções são puras (sem banco)
 * para poderem ser testadas isoladamente.
 */

/** "Campeão", "Bicampeão", "Tricampeão"... — mas não "Campeões" (ex.: "Taça dos Campeões"). */
const TITULO = /(^|[\s.])(?:(?:Bi|Tri|Tetra|Penta|Hexa)c|C)ampeão(?!s)/;

/** Jogos festivos de entrega de taça repetem a palavra, mas não decidem título. */
const ENTREGA_DE_TROFEU = /^Entrega do troféu/i;

/** "Jogo válido pelo Campeonato Paulista de 1951" → edição 1951. */
const EDICAO = /Jogo válido pel[oa] .+? de (\d{4})/;

/** Categorias exibidas, na ordem de importância (usa `campeonato.tipo`). */
export const CATEGORIAS = Object.freeze([
    { tipo: 'Mundial', rotulo: 'Mundiais', principal: true },
    { tipo: 'Continental', rotulo: 'Continentais', principal: true },
    { tipo: 'Nacional', rotulo: 'Nacionais', principal: true },
    { tipo: 'Interestadual', rotulo: 'Interestaduais', principal: true },
    { tipo: 'Estadual', rotulo: 'Estaduais', principal: true },
    { tipo: 'Internacional', rotulo: 'Torneios Internacionais', principal: false },
    { tipo: 'Amistoso', rotulo: 'Torneios Amistosos', principal: false },
]);

const OUTROS = { tipo: null, rotulo: 'Outros', principal: false };

/**
 * Indica se a observação de um jogo registra a conquista de um título.
 * @param {string | null | undefined} observacoes
 */
export function ehJogoDeTitulo(observacoes) {
    if (!observacoes || ENTREGA_DE_TROFEU.test(observacoes)) return false;
    return TITULO.test(observacoes);
}

/**
 * Ano da edição do campeonato: o citado em "Jogo válido pelo ... de AAAA"
 * (finais disputadas no ano seguinte) ou, na falta dele, o ano do jogo.
 * @param {string | null} observacoes
 * @param {string} data - 'AAAA-MM-DD'
 */
export function anoDaEdicao(observacoes, data) {
    const m = EDICAO.exec(observacoes ?? '');
    return m ? Number(m[1]) : Number(String(data).slice(0, 4));
}

/**
 * @param {string | null | undefined} tipo
 */
export function categoriaDoTipo(tipo) {
    return CATEGORIAS.find((c) => c.tipo === tipo) ?? OUTROS;
}

/**
 * Agrupa jogos de título em categorias → competições → conquistas.
 * Conquistas repetidas (mesma competição e edição) contam uma vez só.
 *
 * @param {{ id: number, data: string, observacoes: string | null, campeonato: { nome: string, tipo: string | null } | null }[]} jogos
 *   Jogos já mapeados, em ordem cronológica.
 */
export function montarTitulos(jogos) {
    /** @type {Map<string, any>} */
    const conquistas = new Map();

    for (const jogo of jogos) {
        if (!jogo.campeonato || !ehJogoDeTitulo(jogo.observacoes)) continue;
        const edicao = anoDaEdicao(jogo.observacoes, jogo.data);
        const chave = `${jogo.campeonato.nome}|${edicao}`;
        if (!conquistas.has(chave)) {
            conquistas.set(chave, { competicao: jogo.campeonato.nome, tipo: jogo.campeonato.tipo, edicao, jogo });
        }
    }

    const categorias = [...CATEGORIAS, OUTROS]
        .map((cat) => {
            const daCategoria = [...conquistas.values()].filter((c) => categoriaDoTipo(c.tipo) === cat);
            const porCompeticao = new Map();
            for (const c of daCategoria) {
                if (!porCompeticao.has(c.competicao)) porCompeticao.set(c.competicao, []);
                porCompeticao.get(c.competicao).push({ edicao: c.edicao, jogo: c.jogo });
            }
            const competicoes = [...porCompeticao.entries()]
                .map(([nome, lista]) => ({ nome, total: lista.length, conquistas: lista }))
                .sort((a, b) => b.total - a.total || a.nome.localeCompare(b.nome, 'pt-BR'));
            return { rotulo: cat.rotulo, principal: cat.principal, total: daCategoria.length, competicoes };
        })
        .filter((cat) => cat.total > 0);

    /** @type {Record<number, { competicao: string, tipo: string | null, principal: boolean }[]>} */
    const porAno = {};
    for (const c of conquistas.values()) {
        (porAno[c.edicao] ??= []).push({
            competicao: c.competicao,
            tipo: c.tipo ?? null,
            principal: categoriaDoTipo(c.tipo).principal,
        });
    }

    return {
        total: conquistas.size,
        totalPrincipais: [...conquistas.values()].filter((c) => categoriaDoTipo(c.tipo).principal).length,
        categorias,
        porAno,
    };
}
