/**
 * Disputa de Pênaltis (/penaltis): minigame contra Palmeiras, São Paulo ou Santos.
 *
 * Na sua cobrança: toque no gol para mirar e toque de novo para parar a barra
 * de força. Na do rival: toque no gol para escolher para onde o goleiro pula.
 * Regras em utils/penaltis.js, desenho em components/penaltisCena.js e sons em
 * utils/penaltisSom.js.
 *
 * O retrospecto (vitórias e derrotas por rival) e a preferência de som ficam
 * só no navegador (localStorage); sem ele, o jogo funciona normalmente.
 */

import { html } from '../core/html.js';
import { botaoCompartilhar, ligarCompartilhar } from '../components/compartilhar.js';
import { pageHeader } from '../components/layout.js';
import { criarCena } from '../components/penaltisCena.js';
import {
    FORCA_IDEAL,
    chuteCpu,
    emojis,
    forcaNoTempo,
    puloCpu,
    resultadoCobranca,
    trajetoria,
    vencedor,
} from '../utils/penaltis.js';
import { criarSom } from '../utils/penaltisSom.js';

/** Uniformes (só cores; nada de escudos). */
const TIMAO = {
    batedor: { camisa: '#f4f4f4', numero: '#111111', calcao: '#111111', meiao: '#111111', nome: 'FIEL', num: '10' },
    goleiro: { camisa: '#1f1f1f', detalhe: '#d4af37', calcao: '#111111', meiao: '#1f1f1f' },
};
const RIVAIS = {
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
const CHAVE_RETROSPECTO = 'acervo:penaltis';

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
            <div class="bg-sccp-gray border border-gray-800 rounded-xl p-5 text-sm text-gray-400 space-y-2">
                <p class="font-bold text-white">Como jogar</p>
                <p>
                    ⚽ <strong class="text-gray-200">Sua cobrança:</strong> toque no gol para mirar e toque de novo para
                    parar a barra de força. Na faixa verde, a bola vai onde você mirou. Forte demais, ela sobe; fraca
                    demais, o goleiro chega.
                </p>
                <p>
                    🧤 <strong class="text-gray-200">Cobrança do rival:</strong> toque no gol para escolher para onde o
                    seu goleiro pula.
                </p>
            </div>
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

function telaJogo(somLigado) {
    return html`
        <div class="space-y-4">
            <div id="penaltis-placar"></div>
            <div class="flex items-center justify-between gap-3 min-h-[2.5rem]">
                <p id="penaltis-instrucao" class="font-bold text-white" aria-live="polite"></p>
                <button
                    type="button"
                    data-acao="som"
                    class="btn-ghost text-sm whitespace-nowrap"
                    aria-pressed="${somLigado}"
                >
                    ${somLigado ? '🔊 Som' : '🔇 Som'}
                </button>
            </div>
            <div class="penaltis-palco">
                <canvas
                    id="penaltis-canvas"
                    class="penaltis-canvas"
                    role="img"
                    aria-label="Gol, goleiro e batedor. Toque no gol para jogar."
                ></canvas>
                <div class="penaltis-aviso" id="penaltis-aviso"></div>
            </div>
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

const AVISOS = { gol: 'GOOOL!', defesa: 'DEFENDEU!', fora: 'PRA FORA!', trave: 'NA TRAVE!' };

/* ---------- view ---------- */

export default {
    async render() {
        return {
            title: 'Disputa de Pênaltis',
            content: html`
                <div class="max-w-3xl mx-auto space-y-8">
                    ${pageHeader(
                        'Disputa de Pênaltis',
                        'Bata e defenda contra os rivais. Mire, acerte a força e escolha o canto do goleiro.',
                    )}
                    <div id="penaltis-app">${telaEscolha()}</div>
                </div>
            `,
        };
    },

    mount(root) {
        const app = /** @type {HTMLElement} */ (root.querySelector('#penaltis-app'));
        const som = criarSom();
        /** @type {ReturnType<typeof criarCena> | null} */
        let cena = null;

        let rival = 'palmeiras';
        /** @type {boolean[]} */ let nossos = [];
        /** @type {boolean[]} */ let deles = [];
        let partida = 0; // invalida o que sobrou de uma partida anterior
        /** @type {import('../utils/penaltis.js').Ponto | null} */ let mira = null;

        const $ = (sel) => /** @type {HTMLElement} */ (app.querySelector(sel));
        const nossaVez = () => nossos.length === deles.length;
        const instrucao = (texto) => {
            const el = app.querySelector('#penaltis-instrucao');
            if (el) el.textContent = texto;
        };

        function desligarCena() {
            cena?.destruir();
            cena = null;
        }

        function prepararCobranca() {
            $('#penaltis-placar').innerHTML = String(placar(rival, nossos, deles));
            $('#penaltis-aviso').removeAttribute('data-visivel');
            const morteSubita = nossos.length >= 5 && deles.length >= 5 ? 'Morte súbita! ' : '';
            mira = null;
            if (nossaVez()) {
                cena?.trocarKits({ batedor: TIMAO.batedor, goleiro: RIVAIS[rival].goleiro });
                cena?.esperar('mirar');
                instrucao(`${morteSubita}Sua vez: toque no gol para mirar.`);
            } else {
                cena?.trocarKits({ batedor: RIVAIS[rival].batedor, goleiro: TIMAO.goleiro });
                cena?.esperar('pular');
                instrucao(`${morteSubita}Defenda: toque onde o goleiro vai pular.`);
            }
        }

        function novaPartida(slug) {
            rival = slug === 'sortear' ? Object.keys(RIVAIS)[Math.floor(Math.random() * 3)] : slug;
            nossos = [];
            deles = [];
            partida++;
            desligarCena();
            app.innerHTML = String(telaJogo(som.ligado));
            cena = criarCena(/** @type {HTMLCanvasElement} */ ($('#penaltis-canvas')), {
                forcaNoTempo,
                faixaIdeal: FORCA_IDEAL,
                aoMirar(p) {
                    if (nossaVez()) {
                        mira = p;
                        cena?.pedirForca();
                        instrucao('Toque de novo para chutar: pare a barra no verde.');
                    } else {
                        cobrar(chuteCpu(), p);
                    }
                },
                aoChutar(forca) {
                    if (mira) cobrar({ mira, forca }, puloCpu());
                },
            });
            som.ambiente();
            prepararCobranca();
            $('#penaltis-placar').scrollIntoView({ behavior: 'smooth', block: 'start' });
        }

        /**
         * @param {{ mira: import('../utils/penaltis.js').Ponto, forca: number }} batida
         * @param {import('../utils/penaltis.js').Ponto} pulo
         */
        async function cobrar(batida, pulo) {
            if (!cena) return;
            const minha = partida;
            const batendo = nossaVez();
            const chute = trajetoria(batida.mira, batida.forca);
            const resultado = resultadoCobranca(chute, pulo, batida.forca);
            const fezGol = resultado === 'gol';
            const bomProTimao = batendo === fezGol;
            instrucao(batendo ? 'Lá vai…' : 'Lá vem o chute…');
            som.apito();

            await cena.cobrar({
                chute,
                pulo,
                resultado,
                comemora: bomProTimao,
                aoChutar: () => som.chute(),
                aoChegar: () => {
                    if (minha !== partida) return;
                    if (resultado === 'gol') som.rede();
                    if (resultado === 'trave') som.trave();
                    if (resultado === 'defesa') som.defesa();
                    if (bomProTimao) som.festa();
                    else som.lamento();
                    const aviso = $('#penaltis-aviso');
                    aviso.textContent = AVISOS[resultado];
                    aviso.dataset.tipo = bomProTimao ? 'gol' : 'ruim';
                    aviso.setAttribute('data-visivel', '');
                    (batendo ? nossos : deles).push(fezGol);
                    $('#penaltis-placar').innerHTML = String(placar(rival, nossos, deles));
                },
            });
            if (minha !== partida) return;
            if (vencedor(nossos, deles)) terminar();
            else prepararCobranca();
        }

        function terminar() {
            const ganhou = vencedor(nossos, deles) === 'corinthians';
            const retro = somarRetrospecto(rival, ganhou);
            desligarCena();
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
            const botao = alvo.closest('[data-acao]');
            const acao = botao?.getAttribute('data-acao');
            if (acao === 'som' && botao) {
                const ligado = som.alternar();
                botao.textContent = ligado ? '🔊 Som' : '🔇 Som';
                botao.setAttribute('aria-pressed', String(ligado));
            }
            if (acao === 'revanche') return novaPartida(rival);
            if (acao === 'trocar') {
                partida++;
                app.innerHTML = String(telaEscolha());
            }
        });

        return () => {
            partida++;
            desligarCena();
            som.parar();
        };
    },
};
