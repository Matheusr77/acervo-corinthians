/**
 * "Hoje na história": todos os jogos de um dia do ano, com navegação entre os dias.
 * /hoje (dia atual) ou /hoje?dia=MM-DD
 */

import { api } from '../core/api.js';
import { html } from '../core/html.js';
import { navegar } from '../core/router.js';
import { botaoCompartilhar, ligarCompartilhar } from '../components/compartilhar.js';
import { gameCard } from '../components/game.js';
import { cardDestaque, resumoDoDia } from '../components/hoje.js';
import { breadcrumb } from '../components/layout.js';
import { formatarDiaDoAno, hojeDiaMes, somarDias } from '../utils/format.js';

const FORMATO_DIA = /^\d{2}-\d{2}$/;

export default {
    async render({ query, signal }) {
        const hoje = hojeDiaMes();
        const dia = FORMATO_DIA.test(query.get('dia') ?? '') ? query.get('dia') : hoje;
        const dados = await api.hoje(dia, signal);
        const nomeDoDia = formatarDiaDoAno(dados.mes, dados.dia);
        const ehHoje = dia === hoje;
        const outros = dados.jogos.filter((j) => j.id !== dados.destaque?.id);

        return {
            title: ehHoje ? 'Hoje na História' : `${nomeDoDia} na História`,
            content: html`
                <div class="space-y-8">
                    ${breadcrumb([{ label: 'Home', href: '/' }, { label: 'Hoje na História' }])}

                    <header class="flex flex-col md:flex-row md:items-end justify-between gap-6">
                        <div>
                            <p class="text-gray-400 text-xs font-bold uppercase tracking-[0.2em]">
                                ${ehHoje ? 'Hoje na História' : 'Neste dia na História'}
                            </p>
                            <h2 class="text-4xl md:text-5xl font-display font-bold text-white mt-2">${nomeDoDia}</h2>
                        </div>
                        <nav class="flex flex-wrap items-center gap-2" aria-label="Escolher outro dia">
                            <a href="/hoje?dia=${somarDias(dia, -1)}" class="btn-secondary" aria-label="Dia anterior"
                                >←</a
                            >
                            <label for="escolher-dia" class="sr-only">Escolher dia</label>
                            <input
                                type="date"
                                id="escolher-dia"
                                class="form-control w-auto py-2"
                                value="2024-${dia}"
                                min="2024-01-01"
                                max="2024-12-31"
                            />
                            <a href="/hoje?dia=${somarDias(dia, 1)}" class="btn-secondary" aria-label="Próximo dia"
                                >→</a
                            >
                            ${ehHoje ? '' : html`<a href="/hoje" class="btn-secondary">Hoje</a>`}
                            ${botaoCompartilhar('compartilhar-dia')}
                        </nav>
                    </header>

                    ${dados.destaque ? cardDestaque(dados.destaque) : ''} ${resumoDoDia(dados.jogos)}

                    <section class="space-y-4">
                        <h3 class="text-2xl font-display font-bold text-white border-b border-gray-800 pb-3">
                            Todos os jogos em ${nomeDoDia}
                        </h3>
                        <div class="space-y-3">${outros.map(gameCard)}</div>
                    </section>
                </div>
            `,
        };
    },

    mount(root, ctx) {
        const input = /** @type {HTMLInputElement} */ (root.querySelector('#escolher-dia'));
        input.addEventListener('change', () => {
            if (!input.value) return;
            const diaMes = input.value.slice(5); // ignora o ano: só dia e mês importam
            navegar(`/hoje?dia=${diaMes}`);
        });

        ligarCompartilhar(root, 'compartilhar-dia', () => {
            const titulo = root.querySelector('h2')?.textContent?.trim() ?? '';
            return {
                title: `${titulo} na história do Corinthians`,
                text: `O que o Timão aprontou em ${titulo}? 🦅`,
                url: `${location.origin}${ctx.path}${location.search}`,
            };
        });
    },
};
