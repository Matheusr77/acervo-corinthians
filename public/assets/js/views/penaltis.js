/**
 * Disputa de Pênaltis (/penaltis): minigame contra Palmeiras, São Paulo ou Santos.
 * O Corinthians bate primeiro; você escolhe o canto do chute e, na vez do rival,
 * para onde o goleiro pula. Regras e sorteios em utils/penaltis.js.
 *
 * O retrospecto (vitórias e derrotas por rival) fica só no navegador
 * (localStorage); sem ele, o jogo funciona normalmente.
 */

import { html } from '../core/html.js';
import { botaoCompartilhar, ligarCompartilhar } from '../components/compartilhar.js';
import { pageHeader } from '../components/layout.js';
import { NOMES_ZONA, chuteCpu, cobranca, coluna, emojis, linha, puloCpu, vencedor } from '../utils/penaltis.js';

const RIVAIS = {
    palmeiras: { nome: 'Palmeiras', classico: 'Derby', camisa: '#0f7a3c', detalhe: '#ffffff' },
    'sao-paulo': { nome: 'São Paulo', classico: 'Majestoso', camisa: '#f5f5f5', detalhe: '#d6001c' },
    santos: { nome: 'Santos', classico: 'Clássico Alvinegro', camisa: '#f5f5f5', detalhe: '#111111' },
};
const GOLEIRO_TIMAO = { camisa: '#161616', detalhe: '#ffffff' };
const CHAVE_RETROSPECTO = 'acervo:penaltis';

/* ---------- posições na tela (em % do campo) ---------- */

const X_COLUNA = [24.7, 50, 75.3];
const Y_LINHA = [27, 53];
const GOLEIRO_INICIO = { left: 50, top: 32, giro: 0 };

/** Para onde o goleiro vai em cada zona. */
function posicaoGoleiro(z) {
    const c = coluna(z);
    const alto = linha(z) === 0;
    if (c === 1) return { left: 50, top: alto ? 17 : 34, giro: 0 };
    const lado = c === 0 ? -1 : 1;
    return { left: 50 + lado * 21, top: alto ? 18 : 40, giro: lado * (alto ? 55 : 80) };
}

/** Onde a bola termina, conforme o resultado. */
function posicaoBola(z, resultado) {
    const c = coluna(z);
    const alto = linha(z) === 0;
    if (resultado === 'fora') {
        if (alto) return { left: X_COLUNA[c] + (c - 1) * 6, top: 5, escala: 0.55 };
        return { left: c === 0 ? 6 : c === 2 ? 94 : 50, top: c === 1 ? 5 : 55, escala: 0.6 };
    }
    if (resultado === 'trave') {
        if (c === 1) return { left: 50, top: 14, escala: 0.6 }; // travessão
        return { left: c === 0 ? 12.5 : 87.5, top: Y_LINHA[linha(z)], escala: 0.6 };
    }
    return { left: X_COLUNA[c], top: Y_LINHA[linha(z)], escala: 0.6 };
}

/* ---------- desenhos ---------- */

const BOLA = html`<svg viewBox="0 0 40 40" aria-hidden="true">
    <circle cx="20" cy="20" r="19" fill="#fafafa" stroke="#222" stroke-width="1.5" />
    <polygon points="20,12 27,17 24.5,25 15.5,25 13,17" fill="#1a1a1a" />
    <path d="M20 12V3M27 17l8-3M24.5 25l5 7M15.5 25l-5 7M13 17l-8-3" stroke="#1a1a1a" stroke-width="1.5" fill="none" />
</svg>`;

/** Goleiro de frente, braços abertos. */
function goleiro({ camisa, detalhe }) {
    return html`<svg viewBox="0 0 60 110" aria-hidden="true">
        <rect x="21" y="74" width="7" height="30" rx="3" fill="#2a2a2a" />
        <rect x="32" y="74" width="7" height="30" rx="3" fill="#2a2a2a" />
        <rect x="18" y="58" width="24" height="18" rx="4" fill="#111" />
        <rect x="2" y="25" width="17" height="8" rx="4" fill="${camisa}" transform="rotate(-25 17 29)" />
        <rect x="41" y="25" width="17" height="8" rx="4" fill="${camisa}" transform="rotate(25 43 29)" />
        <circle cx="5" cy="21" r="5" fill="#d4d4d4" />
        <circle cx="55" cy="21" r="5" fill="#d4d4d4" />
        <rect x="16" y="22" width="28" height="38" rx="7" fill="${camisa}" stroke="rgba(0,0,0,.35)" />
        <rect x="16" y="36" width="28" height="6" fill="${detalhe}" />
        <circle cx="30" cy="12" r="9" fill="#b98258" />
    </svg>`;
}

/* ---------- retrospecto (localStorage) ---------- */

function lerRetrospecto() {
    try {
        return JSON.parse(localStorage.getItem(CHAVE_RETROSPECTO) ?? '{}') ?? {};
    } catch {
        return {};
    }
}

function somarRetrospecto(rival, venceu) {
    const r = lerRetrospecto();
    const atual = r[rival] ?? { v: 0, d: 0 };
    r[rival] = { v: atual.v + (venceu ? 1 : 0), d: atual.d + (venceu ? 0 : 1) };
    try {
        localStorage.setItem(CHAVE_RETROSPECTO, JSON.stringify(r));
    } catch {
        /* sem armazenamento: só não lembra depois */
    }
    return r[rival];
}

const textoRetrospecto = (r) =>
    r ? `${r.v} ${r.v === 1 ? 'vitória' : 'vitórias'} e ${r.d} ${r.d === 1 ? 'derrota' : 'derrotas'}` : '';

/* ---------- telas ---------- */

function telaEscolha() {
    const retro = lerRetrospecto();
    return html`
        <div class="space-y-5">
            <p class="text-gray-300">Escolha o rival. O Timão bate primeiro.</p>
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
                                style="background: linear-gradient(90deg, ${r.camisa} 50%, ${r.detalhe} 50%)"
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
        </div>
    `;
}

/** Bolinhas de cada cobrança (5 ou mais, na morte súbita). */
function bolinhas(cobrancas, total) {
    return Array.from({ length: total }, (_, i) => {
        const c = cobrancas[i];
        const classe = c === undefined ? 'border border-gray-600' : c ? 'bg-green-500' : 'bg-red-500';
        const rotulo = c === undefined ? 'a bater' : c ? 'gol' : 'perdeu';
        return html`<span class="w-3.5 h-3.5 rounded-full ${classe}" title="${rotulo}"></span>`;
    });
}

function placar(rival, nossos, deles) {
    const total = Math.max(5, nossos.length, deles.length);
    const linhaTime = (nome, cobrancas) => html`
        <div class="flex items-center gap-3">
            <span class="w-24 sm:w-32 font-bold text-white truncate">${nome}</span>
            <span class="flex flex-wrap gap-1.5 flex-1">${bolinhas(cobrancas, total)}</span>
            <span class="text-2xl font-display font-bold text-white tabular-nums w-8 text-right"
                >${cobrancas.filter(Boolean).length}</span
            >
        </div>
    `;
    return html`
        <div class="bg-sccp-gray border border-gray-800 rounded-xl p-4 space-y-2">
            ${linhaTime('Corinthians', nossos)} ${linhaTime(RIVAIS[rival].nome, deles)}
        </div>
    `;
}

function telaJogo() {
    return html`
        <div class="space-y-4">
            <div id="penaltis-placar"></div>
            <p id="penaltis-instrucao" class="text-center font-bold text-white min-h-[1.5rem]" aria-live="polite"></p>
            <div class="penaltis-campo" id="penaltis-campo">
                <div class="penaltis-gol"></div>
                <div class="penaltis-linha"></div>
                <div class="penaltis-marca"></div>
                <div class="penaltis-goleiro" id="penaltis-goleiro"></div>
                <div class="penaltis-bola" id="penaltis-bola">${BOLA}</div>
                <div class="penaltis-zonas" id="penaltis-zonas">
                    ${NOMES_ZONA.map(
                        (nome, z) =>
                            html`<button
                                type="button"
                                class="penaltis-zona"
                                data-zona="${z}"
                                aria-label="${nome}"
                            ></button>`,
                    )}
                </div>
                <div class="penaltis-aviso" id="penaltis-aviso"></div>
            </div>
            <p class="text-center text-xs text-gray-400">
                Mirar no ângulo é mais difícil de defender, mas a bola pode ir para fora.
            </p>
        </div>
    `;
}

function telaFim(rival, nossos, deles, retro) {
    const ganhou = vencedor(nossos, deles) === 'corinthians';
    const gN = nossos.filter(Boolean).length;
    const gD = deles.filter(Boolean).length;
    return html`
        <section
            class="bg-gradient-to-br from-gray-900 to-black border ${ganhou ? 'border-sccp-gold/60' : 'border-gray-700'} rounded-xl p-6 md:p-8 text-center space-y-4"
        >
            <p class="text-xs font-bold uppercase tracking-[0.2em] ${ganhou ? 'text-sccp-gold' : 'text-gray-400'}">
                ${ganhou ? 'Vitória do Timão!' : 'Não foi dessa vez'}
            </p>
            <p class="text-3xl md:text-5xl font-display font-bold text-white leading-tight">
                Corinthians <span class="whitespace-nowrap">${gN} x ${gD}</span> ${RIVAIS[rival].nome}
            </p>
            <div class="text-2xl tracking-widest space-y-1" aria-hidden="true">
                <p>${emojis(nossos)}</p>
                <p>${emojis(deles)}</p>
            </div>
            <p class="text-gray-300">${ganhou ? 'É campeão! A Fiel agradece. 🦅' : 'Bora pra revanche, Fiel!'}</p>
            <p class="text-sm text-gray-400">
                Seu retrospecto contra o ${RIVAIS[rival].nome}: ${textoRetrospecto(retro)}
            </p>
            <div class="flex flex-wrap justify-center gap-3 pt-2">
                ${botaoCompartilhar('compartilhar-penaltis', 'Compartilhar resultado')}
                <button type="button" data-acao="revanche" class="btn-primary">Jogar de novo</button>
                <button type="button" data-acao="trocar" class="btn-secondary">Trocar de rival</button>
            </div>
        </section>
    `;
}

/* ---------- view ---------- */

export default {
    async render() {
        return {
            title: 'Disputa de Pênaltis',
            content: html`
                <div class="max-w-3xl mx-auto space-y-8">
                    ${pageHeader(
                        'Disputa de Pênaltis',
                        'Bata e defenda contra os rivais. Escolha o canto do chute e, na vez deles, para onde o goleiro pula.',
                    )}
                    <div id="penaltis-app">${telaEscolha()}</div>
                </div>
            `,
        };
    },

    mount(root) {
        const app = /** @type {HTMLElement} */ (root.querySelector('#penaltis-app'));
        /** @type {ReturnType<typeof setTimeout>[]} */
        const timers = [];
        const esperar = (ms) => new Promise((ok) => timers.push(setTimeout(ok, ms)));

        let rival = 'palmeiras';
        /** @type {boolean[]} */ let nossos = [];
        /** @type {boolean[]} */ let deles = [];
        let ocupado = false;
        let rodada = 0; // invalida animações de uma partida anterior

        const $ = (sel) => /** @type {HTMLElement} */ (app.querySelector(sel));
        const nossaVez = () => nossos.length === deles.length;

        function posicionar(el, { left, top }, transform) {
            el.style.left = `${left}%`;
            el.style.top = `${top}%`;
            el.style.transform = transform;
        }

        /** Volta bola e goleiro ao lugar, sem animação. */
        function resetarCampo() {
            const campo = $('#penaltis-campo');
            campo.classList.add('penaltis-sem-transicao');
            const cores = nossaVez() ? RIVAIS[rival] : GOLEIRO_TIMAO;
            $('#penaltis-goleiro').innerHTML = String(goleiro(cores));
            posicionar($('#penaltis-goleiro'), GOLEIRO_INICIO, 'translateX(-50%) rotate(0deg)');
            posicionar($('#penaltis-bola'), { left: 50, top: 84 }, 'translate(-50%, -50%) scale(1)');
            $('#penaltis-aviso').removeAttribute('data-visivel');
            void campo.offsetHeight; // aplica antes de religar as transições
            campo.classList.remove('penaltis-sem-transicao');
        }

        function atualizarPlacar() {
            $('#penaltis-placar').innerHTML = String(placar(rival, nossos, deles));
        }

        function prepararCobranca() {
            atualizarPlacar();
            resetarCampo();
            const morteSubita = nossos.length >= 5 && deles.length >= 5;
            const prefixo = morteSubita ? 'Morte súbita! ' : '';
            $('#penaltis-instrucao').textContent = nossaVez()
                ? `${prefixo}Sua vez de bater: escolha o canto.`
                : `${prefixo}Agora defenda: escolha para onde o goleiro pula.`;
            $('#penaltis-zonas').removeAttribute('data-travado');
            ocupado = false;
        }

        function novaPartida(slug) {
            rival = slug === 'sortear' ? Object.keys(RIVAIS)[Math.floor(Math.random() * 3)] : slug;
            nossos = [];
            deles = [];
            rodada++;
            app.innerHTML = String(telaJogo());
            prepararCobranca();
            $('#penaltis-placar').scrollIntoView({ behavior: 'smooth', block: 'start' });
        }

        async function cobrar(zonaEscolhida) {
            if (ocupado) return;
            ocupado = true;
            const minhaRodada = rodada;
            $('#penaltis-zonas').setAttribute('data-travado', '');
            $('#penaltis-instrucao').textContent = '';

            const batendo = nossaVez();
            const chute = batendo ? zonaEscolhida : chuteCpu();
            const pulo = batendo ? puloCpu() : zonaEscolhida;
            const resultado = cobranca(chute, pulo);
            const fezGol = resultado === 'gol';

            const bola = posicaoBola(chute, resultado);
            posicionar($('#penaltis-bola'), bola, `translate(-50%, -50%) scale(${bola.escala})`);
            await esperar(70);
            const g = posicaoGoleiro(pulo);
            posicionar($('#penaltis-goleiro'), g, `translateX(-50%) rotate(${g.giro}deg)`);
            await esperar(480);
            if (minhaRodada !== rodada) return;

            const aviso = $('#penaltis-aviso');
            const bom = batendo === fezGol; // bom para o Timão
            aviso.textContent = { gol: 'GOOOL!', defesa: 'DEFENDEU!', fora: 'PRA FORA!', trave: 'NA TRAVE!' }[
                resultado
            ];
            aviso.dataset.tipo = bom ? 'gol' : 'ruim';
            aviso.setAttribute('data-visivel', '');

            (batendo ? nossos : deles).push(fezGol);
            atualizarPlacar();
            await esperar(1300);
            if (minhaRodada !== rodada) return;

            if (vencedor(nossos, deles)) terminar();
            else prepararCobranca();
        }

        function terminar() {
            const ganhou = vencedor(nossos, deles) === 'corinthians';
            const retro = somarRetrospecto(rival, ganhou);
            app.innerHTML = String(
                html`${placar(rival, nossos, deles)}
                    <div class="mt-6">${telaFim(rival, nossos, deles, retro)}</div>`,
            );
            ligarCompartilhar(app, 'compartilhar-penaltis', () => {
                const gN = nossos.filter(Boolean).length;
                const gD = deles.filter(Boolean).length;
                return {
                    title: 'Disputa de Pênaltis',
                    text: `Disputa de pênaltis 🦅\nCorinthians ${gN} x ${gD} ${RIVAIS[rival].nome}\n${emojis(nossos)}\n${emojis(deles)}\n${ganhou ? 'Vai encarar?' : 'Me ajuda na revanche?'}\n`,
                    url: `${location.origin}/penaltis`,
                };
            });
        }

        app.addEventListener('click', (e) => {
            const alvo = /** @type {HTMLElement} */ (e.target);
            const botaoRival = alvo.closest('[data-rival]');
            if (botaoRival) return novaPartida(botaoRival.getAttribute('data-rival') ?? 'palmeiras');
            const zona = alvo.closest('[data-zona]');
            if (zona) return cobrar(Number(zona.getAttribute('data-zona')));
            const acao = alvo.closest('[data-acao]')?.getAttribute('data-acao');
            if (acao === 'revanche') return novaPartida(rival);
            if (acao === 'trocar') {
                rodada++;
                app.innerHTML = String(telaEscolha());
            }
        });

        return () => {
            rodada++;
            timers.forEach(clearTimeout);
        };
    },
};
