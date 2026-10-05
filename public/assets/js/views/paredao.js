/**
 * Paredão (/paredao): você é o goleiro e controla só as luvas.
 * O rival cria 10 lances (chute de longe, pênalti, falta com barreira,
 * cruzamento e cabeçada, cara a cara com finta, rebote). Defesa é ponto do
 * Timão; gol é ponto do rival.
 *
 * Modos: Jogo rápido (um clássico) ou Torneio mata-mata (4, 8 ou 16 times).
 * No torneio não tem empate: se terminar igual, vem a prorrogação (lances
 * extras até alguém marcar ponto).
 *
 * Física em utils/paredao.js, torneio em utils/torneio.js, desenho em
 * components/paredaoCena.js.
 */

import { html } from '../core/html.js';
import { botaoCompartilhar, ligarCompartilhar } from '../components/compartilhar.js';
import { pageHeader } from '../components/layout.js';
import {
    TIMAO,
    TIMES,
    escolhaDeRival,
    ligarTelaCheia,
    resolverRival,
    somarRetrospecto,
    somarTitulo,
    telaModo,
    telaTorneio,
    textoRetrospecto,
    textoTorneio,
} from '../components/miniJogos.js';
import { criarCenaParedao } from '../components/paredaoCena.js';
import { criarLance, desfecho, lanceExtra, montarPartida, sobraNaArea } from '../utils/paredao.js';
import { criarSom } from '../utils/penaltisSom.js';
import { criarTorneio, jogoDoTimao, nivel, nomeFase, registrarResultado, simularParedao } from '../utils/torneio.js';

const CHAVE_RETROSPECTO = 'acervo:paredao';
const NOME_JOGO = 'Paredão';
const TOTAL = 10;

const AVISOS = {
    agarrou: { texto: 'AGARROU!', bom: true },
    espalmou: { texto: 'ESPALMOU!', bom: true },
    gol: { texto: 'GOOOL…', bom: false },
    trave: { texto: 'NA TRAVE!', bom: true },
    fora: { texto: 'PRA FORA!', bom: true },
};
/** Emoji de cada lance no resultado compartilhado. */
const EMOJI = { defesa: '🧤', gol: '⚽', fora: '⬜' };

/* ---------- telas ---------- */

const comoJogar = html`
    <div class="bg-sccp-gray border border-gray-800 rounded-xl p-5 text-sm text-gray-400 space-y-2">
        <p class="font-bold text-white">Como jogar</p>
        <p>
            🧤 Você controla <strong class="text-gray-200">só as luvas</strong>: no computador, com o mouse; no celular,
            arrastando o dedo na tela (as luvas ficam um pouco acima do dedo). Dica: use a tela cheia.
        </p>
        <p>
            ⚽ O rival chuta de longe, cobra pênalti e falta, cruza para cabecear e parte cara a cara. Fique de olho na
            sombra da bola para saber a altura. Bola no meio das luvas você agarra; de raspão, espalma e pode dar
            rebote.
        </p>
        <p>🏆 Defesa é ponto do Timão. Gol é ponto do rival. No torneio, empate vai para a prorrogação.</p>
    </div>
`;

const telaInicio = () => html`<div class="space-y-6">${telaModo('paredao')} ${comoJogar}</div>`;

const telaEscolha = () => html`
    <div class="space-y-5">
        <button type="button" data-acao="menu" class="btn-ghost text-sm">← Voltar</button>
        ${escolhaDeRival(CHAVE_RETROSPECTO, `Escolha o rival. São ${TOTAL} lances, cada vez mais difíceis.`)}
    </div>
`;

/** Marcadores de cada lance: verde defesa, vermelho gol, cinza fora ou trave. */
function marcadores(historico) {
    return Array.from({ length: Math.max(TOTAL, historico.length) }, (_, i) => {
        const h = historico[i];
        const classe = !h
            ? 'border border-gray-600'
            : h === 'defesa'
              ? 'bg-green-500'
              : h === 'gol'
                ? 'bg-red-500'
                : 'bg-gray-500';
        return html`<span class="w-3.5 h-3.5 rounded-full ${classe}"></span>`;
    });
}

function placar(rival, historico, lance, rotulo, fase = '') {
    const defesas = historico.filter((h) => h === 'defesa').length;
    const gols = historico.filter((h) => h === 'gol').length;
    const extra = lance > TOTAL;
    return html`
        <div class="bg-sccp-gray border border-gray-800 rounded-xl p-4 space-y-3">
            ${
                fase
                    ? html`<p class="text-[11px] font-bold uppercase tracking-[0.2em] text-sccp-gold">🏆 ${fase}</p>`
                    : ''
            }
            <div class="flex items-center justify-between gap-3">
                <span class="font-bold text-white">Corinthians</span>
                <span class="text-3xl font-display font-bold text-white tabular-nums">${defesas} x ${gols}</span>
                <span class="font-bold text-white text-right">${TIMES[rival].nome}</span>
            </div>
            <div class="flex flex-wrap items-center justify-between gap-x-3 gap-y-2 text-xs">
                <span class="flex flex-wrap gap-1.5">${marcadores(historico)}</span>
                <span class="font-bold uppercase tracking-wider text-sccp-gold"
                    >${lance ? (extra ? 'Prorrogação' : `Lance ${lance}/${TOTAL}`) : ''}<span class="hidden sm:inline"
                        >${rotulo ? ` · ${rotulo}` : ''}</span
                    ></span
                >
            </div>
        </div>
    `;
}

function telaJogo(somLigado) {
    return html`
        <div class="jogo-tela space-y-4">
            <div id="paredao-placar"></div>
            <div class="flex items-center justify-between gap-3 min-h-[2.5rem]">
                <p id="paredao-instrucao" class="font-bold text-white" aria-live="polite"></p>
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
                    id="paredao-canvas"
                    class="paredao-canvas"
                    data-aspecto="${800 / 500}"
                    role="img"
                    aria-label="Visão de dentro do gol. Mova as luvas para defender."
                ></canvas>
                <div class="penaltis-aviso" id="paredao-aviso"></div>
            </div>
        </div>
    `;
}

function telaFim(rival, historico, retro) {
    const defesas = historico.filter((h) => h === 'defesa').length;
    const gols = historico.filter((h) => h === 'gol').length;
    const resultado = defesas > gols ? 'vitoria' : defesas === gols ? 'empate' : 'derrota';
    const frase = {
        vitoria: defesas >= 8 ? 'Paredão! Que noite do goleiro! 🧤🦅' : 'Fechou o gol! A Fiel agradece. 🦅',
        empate: 'Empate no detalhe. Dá para fechar mais o gol!',
        derrota: 'Hoje não foi o seu dia. Bora pra revanche!',
    }[resultado];
    return html`
        <section
            class="bg-gradient-to-br from-gray-900 to-black border ${resultado === 'vitoria' ? 'border-sccp-gold/60' : 'border-gray-700'} rounded-xl p-6 md:p-8 text-center space-y-4"
        >
            <p
                class="text-xs font-bold uppercase tracking-[0.2em] ${resultado === 'vitoria' ? 'text-sccp-gold' : 'text-gray-400'}"
            >
                ${{ vitoria: 'Vitória do Timão!', empate: 'Empate', derrota: 'Não foi dessa vez' }[resultado]}
            </p>
            <p class="text-3xl md:text-5xl font-display font-bold text-white leading-tight">
                ${defesas} ${defesas === 1 ? 'defesa' : 'defesas'} em ${TOTAL} lances
            </p>
            <p class="text-2xl tracking-widest" aria-hidden="true">${historico.map((h) => EMOJI[h]).join('')}</p>
            <p class="text-gray-300">${frase}</p>
            <p class="text-sm text-gray-400">
                Corinthians ${defesas} x ${gols} ${TIMES[rival].nome} · Seu retrospecto: ${textoRetrospecto(retro)}
            </p>
            <div class="flex flex-wrap justify-center gap-3 pt-2">
                ${botaoCompartilhar('compartilhar-paredao', 'Compartilhar resultado')}
                <button type="button" data-acao="revanche" class="btn-primary">Jogar de novo</button>
                <button type="button" data-acao="trocar" class="btn-secondary">Trocar de rival</button>
                <button type="button" data-acao="menu" class="btn-ghost">Menu</button>
            </div>
        </section>
    `;
}

/* ---------- view ---------- */

export default {
    async render() {
        return {
            title: 'Paredão',
            content: html`
                <div class="max-w-3xl mx-auto space-y-8">
                    <a href="/mini-jogos" class="btn-ghost text-sm">← Mini Jogos</a>
                    ${pageHeader(
                        'Paredão',
                        'Você é o goleiro do Timão. Mexa as luvas e pare tudo o que o rival criar.',
                    )}
                    <div id="jogo-raiz" class="jogo-raiz">
                        <div class="jogo-barra">
                            <button type="button" data-acao="tela-cheia" class="btn-ghost text-sm">
                                ✕ Sair da tela cheia
                            </button>
                        </div>
                        <div id="paredao-app">${telaInicio()}</div>
                    </div>
                </div>
            `,
        };
    },

    mount(root) {
        const raiz = /** @type {HTMLElement} */ (root.querySelector('#jogo-raiz'));
        const app = /** @type {HTMLElement} */ (root.querySelector('#paredao-app'));
        const som = criarSom();
        const desligarTelaCheia = ligarTelaCheia(raiz);
        /** @type {ReturnType<typeof criarCenaParedao> | null} */
        let cena = null;
        let rival = 'palmeiras';
        /** @type {('defesa' | 'gol' | 'fora')[]} */
        let historico = [];
        let partida = 0;
        /** @type {import('../utils/torneio.js').Torneio | null} */ let torneio = null;

        const $ = (sel) => /** @type {HTMLElement | null} */ (app.querySelector(sel));
        const faseAtual = () => (torneio ? nomeFase(torneio) : '');
        const instrucao = (t) => {
            const el = $('#paredao-instrucao');
            if (el) el.textContent = t;
        };
        const atualizarPlacar = (lance, rotulo) => {
            const el = $('#paredao-placar');
            if (el) el.innerHTML = String(placar(rival, historico, lance, rotulo, faseAtual()));
        };
        const esperar = (ms) => new Promise((ok) => setTimeout(ok, ms));
        const contar = () => ({
            defesas: historico.filter((h) => h === 'defesa').length,
            gols: historico.filter((h) => h === 'gol').length,
        });

        function desligarCena() {
            cena?.destruir();
            cena = null;
        }
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

        function mostrarAviso(d) {
            const aviso = $('#paredao-aviso');
            if (!aviso) return;
            aviso.textContent = AVISOS[d].texto;
            aviso.dataset.tipo = AVISOS[d].bom ? 'gol' : 'ruim';
            aviso.setAttribute('data-visivel', '');
        }
        const esconderAviso = () => $('#paredao-aviso')?.removeAttribute('data-visivel');

        /**
         * Joga um lance (e o rebote, se a bola espalmada sobrar).
         * @returns {Promise<'defesa' | 'gol' | 'fora' | null>} null se a partida foi interrompida
         */
        async function jogarLance(lanceInicial, numero, minha, progresso) {
            let lance = lanceInicial;
            for (;;) {
                if (minha !== partida || !cena) return null;
                atualizarPlacar(numero, lance.rotulo);
                instrucao(lance.rotulo);
                esconderAviso();
                const r = await cena.jogar(lance, desfecho, (res) => {
                    if (minha !== partida) return;
                    const d = res.desfecho;
                    mostrarAviso(d);
                    if (d === 'agarrou' || d === 'espalmou') {
                        som.defesa();
                        som.festa();
                    } else if (d === 'gol') {
                        som.rede();
                        som.lamento();
                    } else if (d === 'trave') {
                        som.trave();
                        som.festa();
                    } else som.festa();
                });
                if (minha !== partida || !cena) return null;
                const rebote =
                    r.desfecho === 'espalmou' &&
                    lance.tipo !== 'rebote' &&
                    sobraNaArea(r.rebatido) &&
                    Math.random() < 0.3 + progresso * 0.5;
                if (rebote) {
                    cena.limpar();
                    lance = criarLance('rebote', progresso);
                    esconderAviso();
                    instrucao('Rebote! Atenção!');
                    await esperar(350);
                    continue;
                }
                return r.desfecho === 'gol'
                    ? 'gol'
                    : r.desfecho === 'agarrou' || r.desfecho === 'espalmou'
                      ? 'defesa'
                      : 'fora';
            }
        }

        async function novaPartida(slug, nivelDoJogo = 0) {
            rival = slug;
            historico = [];
            mostrar(telaJogo(som.ligado));
            const minha = partida;
            cena = criarCenaParedao(/** @type {HTMLCanvasElement} */ ($('#paredao-canvas')), {
                aoChutar: () => som.chute(),
                aoApitar: () => som.apito(),
                zoeira: rival === 'palmeiras',
            });
            cena.trocarKits({ atacante: TIMES[rival].batedor, luva: TIMAO.goleiro.detalhe });
            som.ambiente();
            if (!raiz.classList.contains('jogo-ampliado')) {
                $('#paredao-placar')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }

            const lances = montarPartida(Math.random, nivelDoJogo);
            atualizarPlacar(1, '');
            instrucao('Posicione as luvas… o rival vem aí!');
            await esperar(1600);

            for (let i = 0; i < lances.length; i++) {
                const h = await jogarLance(lances[i], i + 1, minha, i / (TOTAL - 1));
                if (!h) return;
                historico.push(h);
                atualizarPlacar(Math.min(i + 2, TOTAL), '');
                cena?.limpar();
                esconderAviso();
                await esperar(450);
            }

            // Torneio: empate vai para a prorrogação (lances extras até alguém pontuar)
            let n = TOTAL;
            while (torneio && contar().defesas === contar().gols) {
                n++;
                instrucao('Empate! Prorrogação: quem pontuar primeiro vence.');
                await esperar(1200);
                const h = await jogarLance(lanceExtra(Math.random, nivelDoJogo), n, minha, 1);
                if (!h) return;
                historico.push(h);
                cena?.limpar();
                esconderAviso();
                await esperar(450);
            }
            if (minha === partida) terminar();
        }

        function terminar() {
            const { defesas, gols } = contar();
            const ganhou = defesas > gols;
            const retro = somarRetrospecto(CHAVE_RETROSPECTO, rival, ganhou);
            const placarTexto = `Corinthians ${defesas} x ${gols} ${TIMES[rival].nome} (defesas x gols)`;

            if (torneio) {
                torneio = registrarResultado(torneio, { nos: defesas, eles: gols }, simularParedao);
                if (torneio.status === 'campeao') somarTitulo('paredao', torneio.tamanho);
                const t = torneio;
                mostrar(telaTorneio(t, { nomeJogo: NOME_JOGO, ultimo: { venceu: ganhou, texto: placarTexto } }));
                ligarCompartilhar(app, 'compartilhar-torneio', () => ({
                    title: 'Torneio do Paredão',
                    text: textoTorneio(t, NOME_JOGO, placarTexto),
                    url: `${location.origin}/paredao`,
                }));
                return;
            }

            mostrar(
                html`${placar(rival, historico, 0, '')}
                    <div class="mt-6">${telaFim(rival, historico, retro)}</div>`,
            );
            ligarCompartilhar(app, 'compartilhar-paredao', () => ({
                title: 'Paredão',
                text: `Paredão 🧤 Defendi ${defesas} de ${TOTAL} contra o ${TIMES[rival].nome}\n${historico.map((h) => EMOJI[h]).join('')}\nVai encarar?\n`,
                url: `${location.origin}/paredao`,
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
                novaPartida(resolverRival(botaoRival.getAttribute('data-rival') ?? 'palmeiras'));
                return;
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
            if (acao === 'revanche') novaPartida(rival);
            if (acao === 'trocar') mostrar(telaEscolha());
            if (acao === 'menu') {
                torneio = null;
                mostrar(telaInicio());
            }
            if (acao === 'novo-torneio' && torneio) novoTorneio(torneio.tamanho);
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
