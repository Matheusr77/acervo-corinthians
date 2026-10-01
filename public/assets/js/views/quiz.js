/**
 * Quiz diário do Timão: 5 perguntas por dia, iguais para todos.
 * /quiz (hoje) ou /quiz?dia=AAAA-MM-DD (dias anteriores)
 *
 * As respostas ficam no localStorage do navegador (só para lembrar o que a
 * pessoa já respondeu naquele dia); sem ele, o quiz funciona normalmente.
 */

import { api } from '../core/api.js';
import { html } from '../core/html.js';
import { botaoCompartilhar, ligarCompartilhar } from '../components/compartilhar.js';
import { pageHeader } from '../components/layout.js';
import { formatarData } from '../utils/format.js';

const FORMATO_DATA = /^\d{4}-\d{2}-\d{2}$/;
const CHAVE = (dia) => `acervo:quiz:${dia}`;

/** @param {string} dia @returns {(number | null)[]} */
function lerRespostas(dia, total) {
    try {
        const salvo = JSON.parse(localStorage.getItem(CHAVE(dia)) ?? 'null');
        if (Array.isArray(salvo) && salvo.length === total) return salvo;
    } catch {
        /* armazenamento indisponível: começa do zero */
    }
    return Array(total).fill(null);
}

function salvarRespostas(dia, respostas) {
    try {
        localStorage.setItem(CHAVE(dia), JSON.stringify(respostas));
    } catch {
        /* sem armazenamento: só não lembra depois */
    }
}

/** Dia anterior em 'AAAA-MM-DD'. */
function diaAnterior(dia) {
    const d = new Date(`${dia}T12:00:00Z`);
    d.setUTCDate(d.getUTCDate() - 1);
    return d.toISOString().slice(0, 10);
}

/**
 * Uma pergunta (estado respondido ou não).
 * @param {any} p
 * @param {number} i
 * @param {number | null} resposta
 */
function pergunta(p, i, resposta) {
    const respondida = resposta !== null;
    const acertou = resposta === p.correta;
    return html`
        <li
            class="bg-sccp-gray border ${respondida ? (acertou ? 'border-green-600/60' : 'border-red-600/60') : 'border-gray-800'} rounded-xl p-5 md:p-6"
            data-pergunta="${i}"
        >
            <p class="text-xs text-gray-400 uppercase font-bold">Pergunta ${i + 1} de 5</p>
            <h3 class="text-lg md:text-xl font-bold text-white mt-2">${p.pergunta}</h3>
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-5">
                ${p.opcoes.map((opcao, j) => {
                    const ehCorreta = j === p.correta;
                    const escolhida = j === resposta;
                    let classe = 'border-gray-700 hover:border-gray-400 hover:bg-white/[0.03] text-gray-200';
                    let marca = '';
                    if (respondida && ehCorreta) {
                        classe = 'border-green-600 bg-green-600/15 text-white';
                        marca = '✓';
                    } else if (respondida && escolhida) {
                        classe = 'border-red-600 bg-red-600/15 text-white';
                        marca = '✗';
                    } else if (respondida) {
                        classe = 'border-gray-800 text-gray-400';
                    }
                    return html`
                        <button
                            type="button"
                            data-opcao="${j}"
                            class="text-left rounded-lg border px-4 py-3 transition flex items-center justify-between gap-3 disabled:cursor-default ${classe}"
                            ${respondida ? 'disabled' : ''}
                        >
                            <span>${opcao}</span>
                            ${marca ? html`<span class="font-bold" aria-label="${ehCorreta ? 'Resposta certa' : 'Sua resposta, errada'}">${marca}</span>` : ''}
                        </button>
                    `;
                })}
            </div>
            ${
                respondida
                    ? html`
                          <div class="mt-4 text-sm flex flex-wrap items-center justify-between gap-2">
                              <p class="${acertou ? 'text-green-400' : 'text-red-400'} font-bold">
                                  ${acertou ? 'Acertou! 🎉' : 'Errou!'}
                              </p>
                              <p class="text-gray-400">
                                  ${p.explicacao}
                                  <a
                                      href="${p.link}"
                                      class="text-white underline underline-offset-4 decoration-gray-500 hover:decoration-white whitespace-nowrap"
                                      >Ver mais →</a
                                  >
                              </p>
                          </div>
                      `
                    : ''
            }
        </li>
    `;
}

/** Quadradinhos para compartilhar (🟩🟥⬜). */
function emojis(quiz, respostas) {
    return respostas.map((r, i) => (r === null ? '⬜' : r === quiz.perguntas[i].correta ? '🟩' : '🟥')).join('');
}

function placar(quiz, respostas) {
    const acertos = respostas.filter((r, i) => r === quiz.perguntas[i].correta).length;
    const frase =
        acertos === 5
            ? 'Gabaritou! Você é Fiel de carteirinha. 🦅'
            : acertos >= 3
              ? 'Mandou bem! Mas dá para melhorar.'
              : acertos >= 1
                ? 'Hora de estudar a história do Timão!'
                : 'Ixi… volta amanhã para a revanche!';
    return html`
        <section
            class="bg-gradient-to-br from-gray-900 to-black border border-gray-700 rounded-xl p-6 md:p-8 text-center space-y-4"
        >
            <p class="text-gray-400 text-xs font-bold uppercase tracking-[0.2em]">Seu resultado</p>
            <p class="text-6xl font-display font-bold text-white">${acertos}/5</p>
            <p class="text-3xl tracking-widest" aria-hidden="true">${emojis(quiz, respostas)}</p>
            <p class="text-gray-300">${frase}</p>
            <div class="flex flex-wrap justify-center gap-3 pt-2">
                ${botaoCompartilhar('compartilhar-quiz', 'Compartilhar resultado')}
                <a href="/quiz?dia=${diaAnterior(quiz.dia)}" class="btn-secondary">Jogar o quiz de ontem</a>
            </div>
            <p class="text-xs text-gray-400">Um novo quiz sai todo dia à meia-noite (horário de Brasília).</p>
        </section>
    `;
}

function conteudo(quiz, respostas) {
    const terminou = respostas.every((r) => r !== null);
    return html`
        ${terminou ? placar(quiz, respostas) : ''}
        <ol class="space-y-5">
            ${quiz.perguntas.map((p, i) => pergunta(p, i, respostas[i]))}
        </ol>
    `;
}

export default {
    async render({ query, signal }) {
        const dia = FORMATO_DATA.test(query.get('dia') ?? '') ? query.get('dia') : undefined;
        const quiz = await api.quiz(dia, signal);
        const respostas = lerRespostas(quiz.dia, quiz.perguntas.length);

        return {
            title: 'Quiz do Timão',
            content: html`
                <div class="max-w-3xl mx-auto space-y-8">
                    ${pageHeader('Quiz do Timão', `Quiz de ${formatarData(quiz.dia)}: cinco perguntas sobre a história do Corinthians. Todo mundo recebe as mesmas perguntas no mesmo dia.`)}
                    <div id="quiz-conteudo" class="space-y-8">${conteudo(quiz, respostas)}</div>
                </div>
            `,
        };
    },

    async mount(root, ctx) {
        const dia = FORMATO_DATA.test(ctx.query.get('dia') ?? '') ? ctx.query.get('dia') : undefined;
        const quiz = await api.quiz(dia); // cache
        const alvo = /** @type {HTMLElement} */ (root.querySelector('#quiz-conteudo'));
        const respostas = lerRespostas(quiz.dia, quiz.perguntas.length);

        const ligarCompartilharQuiz = () =>
            ligarCompartilhar(root, 'compartilhar-quiz', () => {
                const acertos = respostas.filter((r, i) => r === quiz.perguntas[i].correta).length;
                return {
                    title: 'Quiz do Timão',
                    text: `Quiz do Timão ${formatarData(quiz.dia).slice(0, 5)} 🦅 ${acertos}/5\n${emojis(quiz, respostas)}\n`,
                    url: `${location.origin}/quiz`,
                };
            });

        alvo.addEventListener('click', (e) => {
            const botao = /** @type {HTMLElement} */ (e.target).closest('[data-opcao]');
            const bloco = botao?.closest('[data-pergunta]');
            if (!botao || !bloco || botao.hasAttribute('disabled')) return;

            const i = Number(bloco.getAttribute('data-pergunta'));
            if (respostas[i] !== null) return;
            respostas[i] = Number(botao.getAttribute('data-opcao'));
            salvarRespostas(quiz.dia, respostas);

            const terminou = respostas.every((r) => r !== null);
            alvo.innerHTML = String(conteudo(quiz, respostas));
            if (terminou) {
                ligarCompartilharQuiz();
                alvo.scrollIntoView({ behavior: 'smooth', block: 'start' });
            } else {
                alvo.querySelector(`[data-pergunta="${i}"]`)?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
            }
        });

        ligarCompartilharQuiz();
    },
};
