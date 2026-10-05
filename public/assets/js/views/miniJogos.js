/**
 * Mini Jogos (/mini-jogos): vitrine com os jogos do acervo.
 * Para incluir um jogo novo, basta adicioná-lo em JOGOS (e a imagem em
 * /assets/img/minijogos/).
 */

import { html } from '../core/html.js';
import { lerRetrospecto } from '../components/miniJogos.js';

const JOGOS = [
    {
        href: '/penaltis',
        titulo: 'Disputa de Pênaltis',
        resumo: 'Mire, acerte a força e escolha o canto do goleiro. Jogue um clássico ou encare um mata-mata até a taça.',
        imagem: '/assets/img/minijogos/penaltis.jpg',
        chave: 'acervo:penaltis',
        etiquetas: ['Rápido ou torneio', 'Batedor e goleiro'],
    },
    {
        href: '/paredao',
        titulo: 'Paredão',
        resumo: 'Você é o goleiro e controla só as luvas. Chute de longe, falta, cabeçada, cara a cara… pare tudo.',
        imagem: '/assets/img/minijogos/paredao.jpg',
        chave: 'acervo:paredao',
        etiquetas: ['Rápido ou torneio', 'Reflexo'],
        novo: true,
    },
];

const EM_BREVE = [
    { emoji: '🎯', titulo: 'Cobrança de falta', resumo: 'Passe a bola por cima da barreira com efeito.' },
    { emoji: '🥅', titulo: 'Desafio do travessão', resumo: 'Cinco chutes para acertar o travessão.' },
];

/** Soma vitórias e derrotas de todos os rivais. */
function retrospectoGeral(chave) {
    const r = Object.values(lerRetrospecto(chave));
    if (!r.length) return '';
    const v = r.reduce((a, x) => a + (x.v ?? 0), 0);
    const d = r.reduce((a, x) => a + (x.d ?? 0), 0);
    return `Você: ${v}V · ${d}D`;
}

function cardJogo(j) {
    const retro = retrospectoGeral(j.chave);
    return html`
        <a
            href="${j.href}"
            class="group relative flex flex-col overflow-hidden rounded-2xl border border-gray-800 bg-sccp-gray hover:border-sccp-gold transition-colors"
        >
            <div class="relative aspect-[16/10] overflow-hidden bg-black">
                <img
                    src="${j.imagem}"
                    alt=""
                    width="800"
                    height="500"
                    loading="lazy"
                    class="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                />
                <div class="absolute inset-0 bg-gradient-to-t from-black via-black/30 to-transparent"></div>
                ${
                    j.novo
                        ? html`<span
                              class="absolute top-3 left-3 rounded-full bg-sccp-gold text-black text-[11px] font-black uppercase tracking-wider px-3 py-1"
                              >Novo</span
                          >`
                        : ''
                }
                ${
                    retro
                        ? html`<span
                              class="absolute top-3 right-3 rounded-full bg-black/70 backdrop-blur text-white text-xs font-bold px-3 py-1 border border-white/10"
                              >${retro}</span
                          >`
                        : ''
                }
                <h2
                    class="absolute bottom-3 left-4 right-4 text-3xl md:text-4xl font-display font-black text-white leading-none drop-shadow-lg"
                >
                    ${j.titulo}
                </h2>
            </div>
            <div class="flex flex-1 flex-col gap-4 p-5">
                <p class="text-gray-300 leading-relaxed">${j.resumo}</p>
                <div class="mt-auto flex items-center justify-between gap-3">
                    <div class="flex flex-wrap gap-2">
                        ${j.etiquetas.map(
                            (e) =>
                                html`<span
                                    class="rounded-full border border-gray-700 px-3 py-1 text-xs font-bold text-gray-300"
                                    >${e}</span
                                >`,
                        )}
                    </div>
                    <span
                        class="inline-flex items-center gap-2 rounded-lg bg-sccp-gold px-4 py-2 text-sm font-black uppercase tracking-wider text-black transition-transform group-hover:translate-x-1"
                        >Jogar →</span
                    >
                </div>
            </div>
        </a>
    `;
}

function cardEmBreve(j) {
    return html`
        <div class="flex items-center gap-4 rounded-2xl border border-dashed border-gray-700 p-5 opacity-80">
            <span class="text-4xl" aria-hidden="true">${j.emoji}</span>
            <div>
                <p class="font-bold text-white">
                    ${j.titulo}
                    <span class="ml-2 text-[11px] font-bold uppercase tracking-wider text-sccp-gold">Em breve</span>
                </p>
                <p class="text-sm text-gray-400">${j.resumo}</p>
            </div>
        </div>
    `;
}

export default {
    async render() {
        return {
            title: 'Mini Jogos',
            content: html`
                <div class="max-w-5xl mx-auto space-y-10">
                    <header class="space-y-3">
                        <p class="text-xs font-bold uppercase tracking-[0.25em] text-sccp-gold">Torcida</p>
                        <h1 class="text-4xl md:text-6xl font-display font-black text-white leading-none">Mini Jogos</h1>
                        <p class="text-gray-400 text-lg max-w-2xl">
                            Entre em campo pelo Timão contra os rivais. Jogue, compartilhe o resultado e desafie os
                            amigos.
                        </p>
                    </header>
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-6">${JOGOS.map(cardJogo)}</div>
                    <section class="space-y-4">
                        <h2 class="text-sm font-bold uppercase tracking-[0.2em] text-gray-400">Vem aí</h2>
                        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">${EM_BREVE.map(cardEmBreve)}</div>
                    </section>
                </div>
            `,
        };
    },
};
