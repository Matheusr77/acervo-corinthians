/**
 * Disputa de Pênaltis (/penaltis).
 *
 * Modos: Jogo rápido (um clássico) ou Torneio mata-mata (4, 8 ou 16 times),
 * sempre com o Corinthians. Na sua cobrança: toque no gol para mirar e toque
 * de novo para parar a barra de força. Na do rival: toque no gol para escolher
 * para onde o goleiro pula.
 *
 * Regras em utils/penaltis.js, torneio em utils/torneio.js, desenho em
 * components/penaltisCena.js e sons em utils/penaltisSom.js. Retrospecto,
 * taças e a preferência de som ficam só no navegador.
 */

import { html } from '../core/html.js';
import { botaoCompartilhar, ligarCompartilhar } from '../components/compartilhar.js';
import { pageHeader } from '../components/layout.js';
import {
    TIMAO,
    TIMES,
    aguardarInicio,
    escolhaDeRival,
    ligarTelaCheia,
    resolverRival,
    somarRetrospecto,
    somarTitulo,
    telaModo,
    telaPronto,
    telaTorneio,
    textoRetrospecto,
    textoTorneio,
} from '../components/miniJogos.js';
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
import { criarTorneio, jogoDoTimao, nivel, nomeFase, registrarResultado, simularPenaltis } from '../utils/torneio.js';

const CHAVE_RETROSPECTO = 'acervo:penaltis';
const NOME_JOGO = 'Pênaltis';

/* ---------- telas ---------- */

const comoJogar = html`
    <div class="bg-sccp-gray border border-gray-800 rounded-xl p-5 text-sm text-gray-400 space-y-2">
        <p class="font-bold text-white">Como jogar</p>
        <p>
            ⚽ <strong class="text-gray-200">Sua cobrança:</strong> toque no gol para mirar e toque de novo para parar a
            barra de força. Na faixa verde, a bola vai onde você mirou. Forte demais, ela sobe; fraca demais, o goleiro
            chega.
        </p>
        <p>
            🧤 <strong class="text-gray-200">Cobrança do rival:</strong> toque no gol para escolher para onde o seu
            goleiro pula.
        </p>
        <p>🏆 No torneio, o adversário fica mais difícil a cada fase.</p>
    </div>
`;

const telaInicio = () => html`<div class="space-y-6">${telaModo('penaltis')} ${comoJogar}</div>`;

const telaEscolha = () => html`
    <div class="space-y-5">
        <button type="button" data-acao="menu" class="btn-ghost text-sm">← Voltar</button>
        ${escolhaDeRival(CHAVE_RETROSPECTO, 'Escolha o rival. O Timão bate primeiro.')}
    </div>
`;

/** Bolinhas de cada cobrança (5 ou mais, na morte súbita). */
function bolinhas(cobrancas, total) {
    return Array.from({ length: total }, (_, i) => {
        const c = cobrancas[i];
        const classe = c === undefined ? 'border border-gray-600' : c ? 'bg-green-500' : 'bg-red-500';
        const rotulo = c === undefined ? 'a bater' : c ? 'gol' : 'perdeu';
        return html`<span class="w-3.5 h-3.5 rounded-full ${classe}" title="${rotulo}"></span>`;
    });
}

function placar(rival, nossos, deles, fase = '') {
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
            ${
                fase
                    ? html`<p class="text-[11px] font-bold uppercase tracking-[0.2em] text-sccp-gold">🏆 ${fase}</p>`
                    : ''
            }
            ${linhaTime('Corinthians', nossos)} ${linhaTime(TIMES[rival].nome, deles)}
        </div>
    `;
}

function telaJogo(somLigado) {
    return html`
        <div class="jogo-tela space-y-4">
            <div id="penaltis-placar"></div>
            <div class="flex items-center justify-between gap-3 min-h-[2.5rem]">
                <p id="penaltis-instrucao" class="font-bold text-white" aria-live="polite"></p>
                <div class="flex items-center gap-1">
                    <button
                        type="button"
                        data-acao="som"
                        class="btn-ghost text-sm whitespace-nowrap"
                        aria-pressed="${somLigado}"
                    >
                        ${somLigado ? '🔊 Som' : '🔇 Som'}
                    </button>
                    <button type="button" data-acao="tela-cheia" class="btn-ghost text-sm whitespace-nowrap">
                        ⛶ Tela cheia
                    </button>
                </div>
            </div>
            <div class="penaltis-palco">
                <canvas
                    id="penaltis-canvas"
                    class="penaltis-canvas"
                    data-aspecto="${800 / 560}"
                    role="img"
                    aria-label="Gol, goleiro e batedor. Toque no gol para jogar."
                ></canvas>
                <div class="penaltis-aviso" id="penaltis-aviso"></div>
                ${telaPronto('Bora pra disputa!', 'O Timão bate primeiro. Mire no gol e acerte a força.')}
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
                Corinthians <span class="whitespace-nowrap">${gN} x ${gD}</span> ${TIMES[rival].nome}
            </p>
            <div class="text-2xl tracking-widest space-y-1" aria-hidden="true">
                <p>${emojis(nossos)}</p>
                <p>${emojis(deles)}</p>
            </div>
            <p class="text-gray-300">${ganhou ? 'A Fiel agradece! 🦅' : 'Bora pra revanche, Fiel!'}</p>
            <p class="text-sm text-gray-400">
                Seu retrospecto contra o ${TIMES[rival].nome}: ${textoRetrospecto(retro)}
            </p>
            <div class="flex flex-wrap justify-center gap-3 pt-2">
                ${botaoCompartilhar('compartilhar-penaltis', 'Compartilhar resultado')}
                <button type="button" data-acao="revanche" class="btn-primary">Jogar de novo</button>
                <button type="button" data-acao="trocar" class="btn-secondary">Trocar de rival</button>
                <button type="button" data-acao="menu" class="btn-ghost">Menu</button>
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
                    <a href="/mini-jogos" class="btn-ghost text-sm">← Mini Jogos</a>
                    ${pageHeader(
                        'Disputa de Pênaltis',
                        'Bata e defenda contra os rivais. Jogo rápido ou torneio mata-mata até a taça.',
                    )}
                    <div id="jogo-raiz" class="jogo-raiz">
                        <div class="jogo-barra">
                            <button type="button" data-acao="tela-cheia" class="btn-ghost text-sm">
                                ✕ Sair da tela cheia
                            </button>
                        </div>
                        <div id="penaltis-app">${telaInicio()}</div>
                    </div>
                </div>
            `,
        };
    },

    mount(root) {
        const raiz = /** @type {HTMLElement} */ (root.querySelector('#jogo-raiz'));
        const app = /** @type {HTMLElement} */ (root.querySelector('#penaltis-app'));
        const som = criarSom();
        const desligarTelaCheia = ligarTelaCheia(raiz);
        /** @type {ReturnType<typeof criarCena> | null} */
        let cena = null;

        let rival = 'palmeiras';
        /** @type {boolean[]} */ let nossos = [];
        /** @type {boolean[]} */ let deles = [];
        let partida = 0; // invalida o que sobrou de uma partida anterior
        /** @type {import('../utils/penaltis.js').Ponto | null} */ let mira = null;
        /** @type {import('../utils/torneio.js').Torneio | null} */ let torneio = null;
        let dificuldade = 0;

        const $ = (sel) => /** @type {HTMLElement} */ (app.querySelector(sel));
        const nossaVez = () => nossos.length === deles.length;
        const faseAtual = () => (torneio ? nomeFase(torneio) : '');
        const instrucao = (texto) => {
            const el = app.querySelector('#penaltis-instrucao');
            if (el) el.textContent = texto;
        };
        const mostrar = (conteudo) => {
            partida++;
            desligarCena();
            app.innerHTML = String(conteudo);
            // Volta para o topo do jogo (fora da tela cheia)
            if (!raiz.classList.contains('jogo-ampliado')) {
                const topo = raiz.getBoundingClientRect().top + window.scrollY - 96;
                if (window.scrollY > topo) window.scrollTo({ top: topo, behavior: 'smooth' });
            }
        };

        function desligarCena() {
            cena?.destruir();
            cena = null;
        }

        function prepararCobranca() {
            $('#penaltis-placar').innerHTML = String(placar(rival, nossos, deles, faseAtual()));
            $('#penaltis-aviso').removeAttribute('data-visivel');
            const morteSubita = nossos.length >= 5 && deles.length >= 5 ? 'Morte súbita! ' : '';
            mira = null;
            if (nossaVez()) {
                cena?.trocarKits({ batedor: TIMAO.batedor, goleiro: TIMES[rival].goleiro });
                cena?.esperar('mirar');
                instrucao(`${morteSubita}Sua vez: toque no gol para mirar.`);
            } else {
                cena?.trocarKits({ batedor: TIMES[rival].batedor, goleiro: TIMAO.goleiro });
                cena?.esperar('pular');
                instrucao(`${morteSubita}Defenda: toque onde o goleiro vai pular.`);
            }
        }

        function novaPartida(slug, nivelDoJogo = 0) {
            rival = slug;
            dificuldade = nivelDoJogo;
            nossos = [];
            deles = [];
            mostrar(telaJogo(som.ligado));
            cena = criarCena(/** @type {HTMLCanvasElement} */ ($('#penaltis-canvas')), {
                forcaNoTempo,
                faixaIdeal: FORCA_IDEAL,
                zoeira: rival === 'palmeiras',
                aoMirar(p) {
                    if (nossaVez()) {
                        mira = p;
                        cena?.pedirForca();
                        instrucao('Toque de novo para chutar: pare a barra no verde.');
                    } else {
                        cobrar(chuteCpu(Math.random, dificuldade), p);
                    }
                },
                aoChutar(forca) {
                    if (mira) cobrar({ mira, forca }, puloCpu(Math.random, dificuldade, mira));
                },
            });
            prepararCobranca();
            instrucao('Toque em Começar quando estiver pronto.');
            const minha = partida;
            aguardarInicio(app).then(() => {
                if (minha !== partida) return;
                som.ambiente();
                prepararCobranca();
            });
            if (!raiz.classList.contains('jogo-ampliado')) {
                $('#penaltis-placar').scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
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
                    $('#penaltis-placar').innerHTML = String(placar(rival, nossos, deles, faseAtual()));
                },
            });
            if (minha !== partida) return;
            if (vencedor(nossos, deles)) terminar();
            else prepararCobranca();
        }

        function terminar() {
            const ganhou = vencedor(nossos, deles) === 'corinthians';
            const gN = nossos.filter(Boolean).length;
            const gD = deles.filter(Boolean).length;
            const placarTexto = `Corinthians ${gN} x ${gD} ${TIMES[rival].nome} (pênaltis)`;
            const retro = somarRetrospecto(CHAVE_RETROSPECTO, rival, ganhou);

            if (torneio) {
                torneio = registrarResultado(torneio, { nos: gN, eles: gD }, simularPenaltis);
                if (torneio.status === 'campeao') somarTitulo('penaltis', torneio.tamanho);
                const t = torneio;
                mostrar(telaTorneio(t, { nomeJogo: NOME_JOGO, ultimo: { venceu: ganhou, texto: placarTexto } }));
                ligarCompartilhar(app, 'compartilhar-torneio', () => ({
                    title: 'Torneio de Pênaltis',
                    text: textoTorneio(t, NOME_JOGO, placarTexto),
                    url: `${location.origin}/penaltis`,
                }));
                return;
            }

            mostrar(
                html`${placar(rival, nossos, deles)}
                    <div class="mt-6">${telaFim(rival, nossos, deles, retro)}</div>`,
            );
            ligarCompartilhar(app, 'compartilhar-penaltis', () => ({
                title: 'Disputa de Pênaltis',
                text: `Disputa de pênaltis 🦅\nCorinthians ${gN} x ${gD} ${TIMES[rival].nome}\n${emojis(nossos)}\n${emojis(deles)}\n${ganhou ? 'Vai encarar?' : 'Me ajuda na revanche?'}\n`,
                url: `${location.origin}/penaltis`,
            }));
        }

        function novoTorneio(tamanho) {
            torneio = criarTorneio(/** @type {4 | 8 | 16} */ (tamanho), Object.keys(TIMES));
            mostrar(telaTorneio(torneio, { nomeJogo: NOME_JOGO }));
        }

        app.addEventListener('click', (e) => {
            const alvo = /** @type {HTMLElement} */ (e.target);
            const botaoRival = alvo.closest('[data-rival]');
            if (botaoRival) {
                torneio = null;
                return novaPartida(resolverRival(botaoRival.getAttribute('data-rival') ?? 'palmeiras'));
            }
            if (alvo.closest('[data-modo="rapido"]')) return mostrar(telaEscolha());
            const botaoTorneio = alvo.closest('[data-torneio]');
            if (botaoTorneio) return novoTorneio(Number(botaoTorneio.getAttribute('data-torneio')));

            const botao = alvo.closest('[data-acao]');
            const acao = botao?.getAttribute('data-acao');
            if (acao === 'som' && botao) {
                const ligado = som.alternar();
                botao.textContent = ligado ? '🔊 Som' : '🔇 Som';
                botao.setAttribute('aria-pressed', String(ligado));
            }
            if (acao === 'revanche') return novaPartida(rival);
            if (acao === 'trocar') return mostrar(telaEscolha());
            if (acao === 'menu') {
                torneio = null;
                return mostrar(telaInicio());
            }
            if (acao === 'novo-torneio' && torneio) return novoTorneio(torneio.tamanho);
            if (acao === 'jogar-torneio' && torneio) {
                const jogo = jogoDoTimao(torneio);
                if (jogo) novaPartida(jogo.adversario, nivel(torneio));
            }
        });

        return () => {
            partida++;
            desligarCena();
            som.parar();
            desligarTelaCheia();
        };
    },
};
