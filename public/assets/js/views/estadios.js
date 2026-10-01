/**
 * Estádios: retrospecto do Corinthians em cada estádio, com busca.
 */

import { api } from '../core/api.js';
import { html } from '../core/html.js';
import { emptyState } from '../components/feedback.js';
import { pageHeader } from '../components/layout.js';
import { corAproveitamento } from '../components/stats.js';
import { anoDe, formatarNumero, formatarPorcentagem, normalizar, plural } from '../utils/format.js';

const POR_PAGINA = 40;

function tabela(itens, limite) {
    if (!itens.length) return emptyState('Nenhum estádio encontrado.');
    return html`
        <div class="overflow-x-auto">
            <table class="w-full text-sm">
                <thead>
                    <tr class="text-xs text-gray-400 uppercase text-right">
                        <th scope="col" class="text-left font-bold pb-2">Estádio</th>
                        <th scope="col" class="font-bold pb-2" title="Jogos">J</th>
                        <th scope="col" class="font-bold pb-2" title="Vitórias">V</th>
                        <th scope="col" class="font-bold pb-2 hidden sm:table-cell" title="Empates">E</th>
                        <th scope="col" class="font-bold pb-2" title="Derrotas">D</th>
                        <th scope="col" class="font-bold pb-2" title="Aproveitamento">%</th>
                    </tr>
                </thead>
                <tbody>
                    ${itens.slice(0, limite).map(
                        (e) => html`
                            <tr
                                class="border-t border-gray-800 text-right text-gray-300 hover:bg-white/[0.03] transition"
                            >
                                <td class="text-left py-3">
                                    <a
                                        href="/estadios/${e.id}"
                                        class="text-white font-medium hover:text-gray-300 transition"
                                        >${e.nome}</a
                                    >
                                    <span class="block text-xs text-gray-400">
                                        ${[e.cidade, e.pais !== 'Brasil' ? e.pais : null].filter(Boolean).join(', ')} ·
                                        ${anoDe(e.primeiroJogo)}–${anoDe(e.ultimoJogo)}
                                    </span>
                                </td>
                                <td class="font-bold text-white">${formatarNumero(e.jogos)}</td>
                                <td class="text-green-400">${e.vitorias}</td>
                                <td class="hidden sm:table-cell">${e.empates}</td>
                                <td class="text-red-400">${e.derrotas}</td>
                                <td class="font-bold ${corAproveitamento(e.aproveitamento)}">
                                    ${formatarPorcentagem(e.aproveitamento)}
                                </td>
                            </tr>
                        `,
                    )}
                </tbody>
            </table>
        </div>
    `;
}

export default {
    async render({ signal }) {
        const estadios = await api.estadios(signal);
        return {
            title: 'Estádios',
            content: html`
                <div class="space-y-8">
                    ${pageHeader('Estádios', `O Corinthians jogou em ${plural(estadios.length, 'estádio')} diferentes. Veja o retrospecto em cada um.`)}
                    <div class="bg-sccp-gray border border-gray-800 rounded-xl p-6 space-y-6">
                        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                            <label for="busca-estadio" class="sr-only">Buscar estádio</label>
                            <input
                                type="search"
                                id="busca-estadio"
                                placeholder="Buscar estádio ou cidade..."
                                autocomplete="off"
                                class="form-control sm:max-w-xs"
                            />
                            <span id="contador-estadios" class="text-gray-400 text-sm" aria-live="polite"></span>
                        </div>
                        <div id="tabela-estadios"></div>
                        <div class="text-center">
                            <button type="button" id="mais-estadios" class="btn-ghost" hidden>Mostrar mais</button>
                        </div>
                    </div>
                </div>
            `,
        };
    },

    async mount(root) {
        const estadios = await api.estadios(); // cache
        const input = /** @type {HTMLInputElement} */ (root.querySelector('#busca-estadio'));
        const alvo = /** @type {HTMLElement} */ (root.querySelector('#tabela-estadios'));
        const contador = /** @type {HTMLElement} */ (root.querySelector('#contador-estadios'));
        const botao = /** @type {HTMLButtonElement} */ (root.querySelector('#mais-estadios'));
        let limite = POR_PAGINA;

        const atualizar = () => {
            const termo = normalizar(input.value.trim());
            const lista = termo
                ? estadios.filter((e) => normalizar(`${e.nome} ${e.cidade ?? ''}`).includes(termo))
                : estadios;
            alvo.innerHTML = String(tabela(lista, limite));
            contador.textContent = plural(lista.length, 'estádio');
            botao.hidden = lista.length <= limite;
        };
        input.addEventListener('input', () => {
            limite = POR_PAGINA;
            atualizar();
        });
        botao.addEventListener('click', () => {
            limite += POR_PAGINA;
            atualizar();
        });
        atualizar();
    },
};
