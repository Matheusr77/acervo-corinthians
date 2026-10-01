/**
 * Confrontos: retrospecto contra todos os adversários, com busca.
 */

import { api } from '../core/api.js';
import { html } from '../core/html.js';
import { emptyState } from '../components/feedback.js';
import { miniEscudo } from '../components/game.js';
import { pageHeader } from '../components/layout.js';
import { corAproveitamento } from '../components/stats.js';
import { anoDe, formatarNumero, formatarPorcentagem, normalizar, plural } from '../utils/format.js';

const POR_PAGINA = 40;

function linha(a, posicao) {
    return html`
        <tr class="border-t border-gray-800 text-right text-gray-300 hover:bg-white/[0.03] transition">
            <td class="text-left py-3 pr-2 text-gray-500 text-xs w-10">${posicao}</td>
            <td class="text-left py-3">
                <div class="flex items-center gap-3">
                    ${miniEscudo(a)}
                    <div class="min-w-0">
                        <a href="/adversarios/${a.id}" class="text-white font-medium hover:text-gray-300 transition"
                            >${a.nome}</a
                        >
                        <span class="block text-xs text-gray-400">${anoDe(a.primeiroJogo)}–${anoDe(a.ultimoJogo)}</span>
                    </div>
                </div>
            </td>
            <td class="font-bold text-white">${formatarNumero(a.jogos)}</td>
            <td class="text-green-400">${a.vitorias}</td>
            <td class="hidden sm:table-cell">${a.empates}</td>
            <td class="text-red-400">${a.derrotas}</td>
            <td class="hidden md:table-cell">${a.golsPro}:${a.golsContra}</td>
            <td class="font-bold ${corAproveitamento(a.aproveitamento)}">${formatarPorcentagem(a.aproveitamento)}</td>
        </tr>
    `;
}

function tabela(itens, limite) {
    if (!itens.length) return emptyState('Nenhum adversário encontrado.');
    return html`
        <div class="overflow-x-auto">
            <table class="w-full text-sm">
                <thead>
                    <tr class="text-xs text-gray-400 uppercase text-right">
                        <th scope="col" class="text-left font-bold pb-2">#</th>
                        <th scope="col" class="text-left font-bold pb-2">Adversário</th>
                        <th scope="col" class="font-bold pb-2" title="Jogos">J</th>
                        <th scope="col" class="font-bold pb-2" title="Vitórias">V</th>
                        <th scope="col" class="font-bold pb-2 hidden sm:table-cell" title="Empates">E</th>
                        <th scope="col" class="font-bold pb-2" title="Derrotas">D</th>
                        <th scope="col" class="font-bold pb-2 hidden md:table-cell" title="Gols pró e contra">Gols</th>
                        <th scope="col" class="font-bold pb-2" title="Aproveitamento">%</th>
                    </tr>
                </thead>
                <tbody>
                    ${itens.slice(0, limite).map((a, i) => linha(a, i + 1))}
                </tbody>
            </table>
        </div>
    `;
}

export default {
    async render({ query, signal }) {
        const adversarios = await api.adversarios(signal);
        const busca = query.get('busca') ?? '';

        return {
            title: 'Confrontos',
            content: html`
                <div class="space-y-8">
                    ${pageHeader(
                        'Confrontos',
                        `Retrospecto contra ${plural(adversarios.length, 'adversário')}, do mais ao menos enfrentado.`,
                    )}
                    <nav class="flex flex-wrap gap-3" aria-label="Mais sobre confrontos">
                        <a href="/fregueses" class="btn-secondary">🍗 Fregueses &amp; Tabus</a>
                        <a href="/classicos" class="btn-secondary">⚔️ Clássicos</a>
                        <a href="/estadios" class="btn-secondary">🏟️ Estádios</a>
                        <a href="/mapa" class="btn-secondary">🗺️ Mapa</a>
                    </nav>

                    <div class="bg-sccp-gray border border-gray-800 rounded-xl p-6 space-y-6">
                        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                            <label for="busca-adversario" class="sr-only">Buscar adversário</label>
                            <input
                                type="search"
                                id="busca-adversario"
                                value="${busca}"
                                placeholder="Buscar adversário..."
                                autocomplete="off"
                                class="form-control sm:max-w-xs"
                            />
                            <span id="contador-adversarios" class="text-gray-400 text-sm" aria-live="polite"></span>
                        </div>
                        <div id="tabela-adversarios"></div>
                        <div class="text-center">
                            <button type="button" id="mostrar-mais" class="btn-ghost" hidden>Mostrar mais</button>
                        </div>
                    </div>
                </div>
            `,
        };
    },

    async mount(root, ctx) {
        const adversarios = await api.adversarios(); // vem do cache
        const input = /** @type {HTMLInputElement} */ (root.querySelector('#busca-adversario'));
        const alvo = /** @type {HTMLElement} */ (root.querySelector('#tabela-adversarios'));
        const contadorEl = /** @type {HTMLElement} */ (root.querySelector('#contador-adversarios'));
        const botaoMais = /** @type {HTMLButtonElement} */ (root.querySelector('#mostrar-mais'));
        let limite = POR_PAGINA;

        const atualizar = () => {
            const termo = normalizar(input.value.trim());
            const filtrados = termo ? adversarios.filter((a) => normalizar(a.nome).includes(termo)) : adversarios;
            alvo.innerHTML = String(tabela(filtrados, limite));
            contadorEl.textContent = plural(filtrados.length, 'adversário');
            botaoMais.hidden = filtrados.length <= limite;
        };

        input.addEventListener('input', () => {
            limite = POR_PAGINA;
            const busca = input.value.trim();
            history.replaceState(null, '', `${ctx.path}${busca ? `?busca=${encodeURIComponent(busca)}` : ''}`);
            atualizar();
        });
        botaoMais.addEventListener('click', () => {
            limite += POR_PAGINA;
            atualizar();
        });

        atualizar();
    },
};
