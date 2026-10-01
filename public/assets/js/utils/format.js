/**
 * Formatação de datas, números e rótulos (pt-BR).
 * As datas chegam da API como 'YYYY-MM-DD' (sem fuso), então são
 * tratadas como texto para nunca deslocar o dia.
 */

const MESES = [
    'janeiro',
    'fevereiro',
    'março',
    'abril',
    'maio',
    'junho',
    'julho',
    'agosto',
    'setembro',
    'outubro',
    'novembro',
    'dezembro',
];

const numberFormat = new Intl.NumberFormat('pt-BR');
const percentFormat = new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 });

/** @param {string | null | undefined} iso */
function partes(iso) {
    const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso ?? '');
    return m ? { ano: m[1], mes: m[2], dia: m[3] } : null;
}

/** '2012-12-16' → '16/12/2012' */
export function formatarData(iso) {
    const p = partes(iso);
    return p ? `${p.dia}/${p.mes}/${p.ano}` : '—';
}

/** '2012-12-16' → '16 de dezembro de 2012' */
export function formatarDataExtensa(iso) {
    const p = partes(iso);
    return p ? `${Number(p.dia)} de ${MESES[Number(p.mes) - 1]} de ${p.ano}` : '—';
}

/** '2012-12-16' → '16/12' */
export function formatarDiaMes(iso) {
    const p = partes(iso);
    return p ? `${p.dia}/${p.mes}` : '—';
}

/** '2012-12-16' → '2012' */
export function anoDe(iso) {
    return partes(iso)?.ano ?? '—';
}

/** 68275 → '68.275' */
export function formatarNumero(n) {
    return n === null || n === undefined || Number.isNaN(Number(n)) ? '—' : numberFormat.format(Number(n));
}

/** 72.4 → '72,4%' */
export function formatarPorcentagem(n) {
    return n === null || n === undefined ? '—' : `${percentFormat.format(Number(n))}%`;
}

/** 5 → '+5', -3 → '−3' */
export function formatarSaldo(n) {
    if (!n) return '0';
    return n > 0 ? `+${formatarNumero(n)}` : `−${formatarNumero(Math.abs(n))}`;
}

/**
 * Valor monetário com a moeda registrada no banco (pode ser histórica, ex.: Cr$).
 * @param {number} valor
 * @param {string | null} moeda
 */
export function formatarRenda(valor, moeda) {
    const texto = new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(valor);
    return moeda ? `${moeda} ${texto}` : texto;
}

export const RESULTADO_LABEL = Object.freeze({ V: 'Vitória', E: 'Empate', D: 'Derrota' });

/** Pluralização simples: (1, 'jogo') → '1 jogo', (3, 'jogo') → '3 jogos' */
export function plural(n, singular, pluralForm = `${singular}s`) {
    return `${formatarNumero(n)} ${n === 1 ? singular : pluralForm}`;
}

/**
 * Remove acentos e caixa para comparar textos em buscas.
 * @param {string} texto
 */
export function normalizar(texto) {
    return String(texto ?? '')
        .normalize('NFD')
        .replace(/[̀-ͯ]/g, '')
        .toLowerCase();
}

/** Dia de hoje (fuso do navegador) no formato 'MM-DD'. */
export function hojeDiaMes(agora = new Date()) {
    return `${String(agora.getMonth() + 1).padStart(2, '0')}-${String(agora.getDate()).padStart(2, '0')}`;
}

/** Data de hoje (fuso do navegador) no formato 'AAAA-MM-DD'. */
export function hojeIso(agora = new Date()) {
    return `${agora.getFullYear()}-${hojeDiaMes(agora)}`;
}

/** (9, 30) → '30 de setembro' */
export function formatarDiaDoAno(mes, dia) {
    return `${Number(dia)} de ${MESES[Number(mes) - 1]}`;
}

/**
 * Anos entre a data e hoje: '2012-12-16' → 13 (em 2026, antes de 16/12 → 13).
 * @param {string} iso
 * @param {Date} [agora]
 */
export function anosDesde(iso, agora = new Date()) {
    const p = partes(iso);
    if (!p) return 0;
    let anos = agora.getFullYear() - Number(p.ano);
    const aindaNaoFez =
        agora.getMonth() + 1 < Number(p.mes) ||
        (agora.getMonth() + 1 === Number(p.mes) && agora.getDate() < Number(p.dia));
    if (aindaNaoFez) anos -= 1;
    return Math.max(0, anos);
}

/** 0 → 'neste ano', 1 → 'há 1 ano', 63 → 'há 63 anos' */
export function haAnos(anos) {
    if (anos <= 0) return 'neste ano';
    return anos === 1 ? 'há 1 ano' : `há ${anos} anos`;
}

/**
 * Soma (ou subtrai) dias a um 'MM-DD', usando um ano bissexto para aceitar 29/02.
 * @param {string} diaMes
 * @param {number} delta
 */
export function somarDias(diaMes, delta) {
    const [mes, dia] = diaMes.split('-').map(Number);
    const d = new Date(Date.UTC(2024, mes - 1, dia + delta));
    return `${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`;
}
