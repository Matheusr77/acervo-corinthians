/**
 * Clássicos em destaque.
 *
 * Os times são localizados por nome + cidade (e não por ID), para a
 * configuração continuar válida se o banco for recriado pelo scraping.
 * Se um dia existirem registros históricos separados (ex.: "Palestra Itália"),
 * basta incluí-los na lista `times` do clássico.
 */
export const CLASSICOS = Object.freeze([
    {
        slug: 'derby',
        nome: 'Derby Paulista',
        descricao: 'Corinthians x Palmeiras, o clássico mais tradicional de São Paulo.',
        times: [{ nome: 'Palmeiras', cidade: 'São Paulo' }],
    },
    {
        slug: 'majestoso',
        nome: 'Majestoso',
        descricao: 'Corinthians x São Paulo, o duelo da capital paulista.',
        times: [{ nome: 'São Paulo', cidade: 'São Paulo' }],
    },
    {
        slug: 'alvinegro',
        nome: 'Clássico Alvinegro',
        descricao: 'Corinthians x Santos, o encontro dos alvinegros paulistas.',
        times: [{ nome: 'Santos', cidade: 'Santos' }],
    },
]);
