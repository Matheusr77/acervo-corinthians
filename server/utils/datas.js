/**
 * Datas no fuso do clube (America/Sao_Paulo), independente do fuso do servidor.
 */

const FUSO = 'America/Sao_Paulo';

/**
 * Hoje no fuso de São Paulo, como { mes, dia, ano }.
 * @param {Date} [agora]
 */
export function hojeEmSaoPaulo(agora = new Date()) {
    const partes = Object.fromEntries(
        new Intl.DateTimeFormat('en-CA', { timeZone: FUSO, year: 'numeric', month: 'numeric', day: 'numeric' })
            .formatToParts(agora)
            .map((p) => [p.type, Number(p.value)]),
    );
    return { ano: partes.year, mes: partes.month, dia: partes.day };
}
