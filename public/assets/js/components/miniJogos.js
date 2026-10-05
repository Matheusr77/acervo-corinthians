/**
 * Peças comuns dos mini jogos: uniformes dos times (só cores, nada de
 * escudos), retrospecto de cada jogo contra cada rival (no navegador) e o
 * seletor de rival.
 */

import { html } from '../core/html.js';

/** Uniformes (só cores; nada de escudos). */
export const TIMAO = {
    batedor: { camisa: '#f4f4f4', numero: '#111111', calcao: '#111111', meiao: '#111111', nome: 'FIEL', num: '10' },
    goleiro: { camisa: '#1f1f1f', detalhe: '#d4af37', calcao: '#111111', meiao: '#1f1f1f' },
};
export const RIVAIS = {
    palmeiras: {
        nome: 'Palmeiras',
        classico: 'Derby',
        batedor: {
            camisa: '#0f7a3c',
            numero: '#ffffff',
            calcao: '#f4f4f4',
            meiao: '#0f7a3c',
            nome: 'SEM',
            num: 'MUNDIAL',
        },
        goleiro: { camisa: '#2a3f94', detalhe: '#ffffff', calcao: '#1b2a66', meiao: '#2a3f94' },
    },
    'sao-paulo': {
        nome: 'São Paulo',
        classico: 'Majestoso',
        batedor: {
            camisa: '#f5f5f5',
            faixa: ['#d6001c', '#f5f5f5', '#111111'],
            numero: '#111111',
            calcao: '#f5f5f5',
            meiao: '#f5f5f5',
            num: '9',
        },
        goleiro: { camisa: '#e8661c', detalhe: '#111111', calcao: '#111111', meiao: '#e8661c' },
    },
    santos: {
        nome: 'Santos',
        classico: 'Clássico Alvinegro',
        batedor: { camisa: '#f5f5f5', numero: '#111111', calcao: '#f5f5f5', meiao: '#f5f5f5', num: '9' },
        goleiro: { camisa: '#5a36a6', detalhe: '#ffffff', calcao: '#2b1a55', meiao: '#5a36a6' },
    },
};

/* ---------- retrospecto (localStorage) ---------- */

/** @param {string} chave */
export function lerRetrospecto(chave) {
    try {
        return JSON.parse(localStorage.getItem(chave) ?? '{}') ?? {};
    } catch {
        return {};
    }
}

/**
 * @param {string} chave
 * @param {string} rival
 * @param {boolean} venceu
 */
export function somarRetrospecto(chave, rival, venceu) {
    const r = lerRetrospecto(chave);
    const atual = r[rival] ?? { v: 0, d: 0 };
    r[rival] = { v: atual.v + (venceu ? 1 : 0), d: atual.d + (venceu ? 0 : 1) };
    try {
        localStorage.setItem(chave, JSON.stringify(r));
    } catch {
        /* sem armazenamento: só não lembra depois */
    }
    return r[rival];
}

export const textoRetrospecto = (r) =>
    r ? `${r.v} ${r.v === 1 ? 'vitória' : 'vitórias'} e ${r.d} ${r.d === 1 ? 'derrota' : 'derrotas'}` : '';

/** Sorteia um rival quando a pessoa escolhe "Sortear". */
export const resolverRival = (slug) =>
    slug === 'sortear' || !RIVAIS[slug] ? Object.keys(RIVAIS)[Math.floor(Math.random() * 3)] : slug;

/**
 * Cards para escolher o rival.
 * @param {string} chave - chave do retrospecto do jogo
 * @param {string} intro
 */
export function escolhaDeRival(chave, intro) {
    const retro = lerRetrospecto(chave);
    return html`
        <p class="text-gray-300">${intro}</p>
        <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
            ${Object.entries(RIVAIS).map(
                ([slug, r]) => html`
                    <button
                        type="button"
                        data-rival="${slug}"
                        class="group text-left bg-sccp-gray border border-gray-800 hover:border-sccp-gold rounded-xl p-5 transition"
                    >
                        <span
                            class="block h-1.5 w-12 rounded-full mb-4"
                            style="background: linear-gradient(90deg, ${r.batedor.camisa} 50%, ${
                                r.batedor.faixa?.[0] ?? r.batedor.calcao
                            } 50%)"
                        ></span>
                        <span class="block text-xs font-bold uppercase tracking-[0.2em] text-sccp-gold"
                            >${r.classico}</span
                        >
                        <span class="block text-2xl font-display font-bold text-white mt-1">${r.nome}</span>
                        <span class="block text-sm text-gray-400 mt-2"
                            >${retro[slug] ? `Você: ${textoRetrospecto(retro[slug])}` : 'Ainda não jogou'}</span
                        >
                    </button>
                `,
            )}
        </div>
        <button type="button" data-rival="sortear" class="btn-ghost text-sm">🎲 Sortear o rival</button>
    `;
}
