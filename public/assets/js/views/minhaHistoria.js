/**
 * "O Timão na sua vida": o torcedor informa a data de nascimento e vê tudo o
 * que o Corinthians viveu desde então, com uma imagem pronta para o story.
 *
 * /minha-historia                          → formulário
 * /minha-historia?nascimento=AAAA-MM-DD    → resultado (o nome é opcional: &nome=)
 *
 * Nada é salvo no servidor: a data só serve para o cálculo.
 */

import { api } from '../core/api.js';
import { html } from '../core/html.js';
import { navegar } from '../core/router.js';
import { botaoCompartilhar, ligarCompartilhar } from '../components/compartilhar.js';
import { gameCard, miniEscudo } from '../components/game.js';
import { card } from '../components/layout.js';
import { corAproveitamento, kpi, sequenciaTile } from '../components/stats.js';
import { gerarCartaoStory, ordenarPorPrestigio, rotuloTitulo } from '../utils/cartaoStory.js';
import { anoDe, formatarData, formatarNumero, formatarPorcentagem, hojeIso, plural } from '../utils/format.js';

const FORMATO_DATA = /^\d{4}-\d{2}-\d{2}$/;
const TAMANHO_MAX_NOME = 30;

/** Nome opcional: só letras, espaços e alguns sinais, com limite de tamanho. */
function limparNome(nome) {
    return String(nome ?? '')
        .replace(/[^\p{L}\p{M} .'-]/gu, '')
        .trim()
        .slice(0, TAMANHO_MAX_NOME);
}

function formulario({ nascimento = '', nome = '', erro = null } = {}) {
    return html`
        <section class="relative overflow-hidden rounded-xl border border-gray-800 bg-black">
            <div class="absolute inset-0 bg-[url('/assets/img/arena-hero.jpg')] bg-cover bg-center opacity-30"></div>
            <div class="absolute inset-0 bg-gradient-to-t from-black via-black/70 to-black/30"></div>

            <div class="relative z-10 px-6 py-16 md:py-24 max-w-2xl mx-auto text-center space-y-6">
                <p class="text-sccp-gold text-xs font-bold uppercase tracking-[0.2em]">Descubra a sua história</p>
                <h2 class="text-5xl md:text-7xl font-display font-black text-white leading-[0.95] tracking-tight">
                    O Timão na <span class="text-sccp-gold">sua vida</span>
                </h2>
                <p class="text-gray-300 text-lg">
                    Coloque sua data de nascimento e veja quantos jogos, vitórias e títulos o Corinthians viveu com
                    você. No final, sua imagem pronta para o story.
                </p>

                <form
                    id="form-minha-historia"
                    class="bg-black/60 backdrop-blur border border-gray-800 rounded-xl p-5 md:p-6 text-left space-y-4"
                    novalidate
                >
                    <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label for="nascimento" class="block text-xs font-semibold text-gray-400 uppercase mb-1"
                                >Data de nascimento</label
                            >
                            <input
                                type="date"
                                id="nascimento"
                                name="nascimento"
                                required
                                min="1910-09-01"
                                max="${hojeIso()}"
                                value="${nascimento}"
                                class="form-control py-2.5"
                            />
                        </div>
                        <div>
                            <label for="nome" class="block text-xs font-semibold text-gray-400 uppercase mb-1"
                                >Seu nome
                                <span class="normal-case text-gray-500">(opcional, vai na imagem)</span></label
                            >
                            <input
                                type="text"
                                id="nome"
                                name="nome"
                                maxlength="${TAMANHO_MAX_NOME}"
                                autocomplete="given-name"
                                value="${nome}"
                                class="form-control py-2.5"
                                placeholder="Ex.: Matheus"
                            />
                        </div>
                    </div>
                    ${erro ? html`<p class="text-red-400 text-sm" role="alert">${erro}</p>` : ''}
                    <button type="submit" class="btn-hero-primary w-full">Descobrir minha história</button>
                    <p class="text-xs text-gray-400 text-center">
                        Nada é salvo: a data só é usada para fazer as contas.
                    </p>
                </form>
            </div>
        </section>
    `;
}

/** Veredito divertido do clássico. */
function veredito(c) {
    if (c.vitorias > c.derrotas) return 'Você viu mais vitórias! 😎';
    if (c.vitorias === c.derrotas) return 'Tudo igual no seu tempo.';
    return 'Esse aí ainda está te devendo… 😤';
}

function resultado(dados, nome) {
    const r = dados.resumo;
    const primeiro = dados.primeiroJogo;
    const nasceuEmDiaDeJogo = primeiro && primeiro.data === dados.desde;
    const saudacao = nome ? `${nome}, desde` : 'Desde';

    return html`
        <div class="space-y-10">
            <header class="text-center space-y-3 pt-4">
                <p class="text-gray-400 text-xs font-bold uppercase tracking-[0.2em]">O Timão na sua vida</p>
                <h2 class="text-3xl md:text-5xl font-display font-bold text-white leading-tight">
                    ${saudacao} ${formatarData(dados.desde)}, o Corinthians fez
                    <span class="text-sccp-gold">${formatarNumero(r.jogos)} jogos</span> com você
                </h2>
                <p class="text-gray-400">${plural(r.temporadas, 'temporada')} de Fiel Torcida.</p>
            </header>

            <div class="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
                ${kpi('Vitórias', formatarNumero(r.vitorias), 'text-green-500')}
                ${kpi('Gols marcados', formatarNumero(r.golsPro), 'text-white')}
                ${kpi('Títulos', formatarNumero(dados.titulos.total), 'text-sccp-gold')}
                ${kpi('Aproveitamento', formatarPorcentagem(r.aproveitamento), corAproveitamento(r.aproveitamento))}
            </div>

            <section class="grid grid-cols-1 lg:grid-cols-5 gap-6 items-start">
                <div class="lg:col-span-3 space-y-6">
                    ${card(
                        {
                            titulo: 'Títulos que você viveu',
                            subtitulo: dados.titulos.primeiro
                                ? `Seu primeiro: ${dados.titulos.primeiro.competicao} ${dados.titulos.primeiro.edicao}`
                                : 'Ainda não veio o primeiro… mas vai vir!',
                        },
                        dados.titulos.competicoes.length
                            ? html`
                                  <ul class="space-y-4">
                                      ${ordenarPorPrestigio(dados.titulos.competicoes).map(
                                          (c) => html`
                                              <li>
                                                  <p class="text-white font-bold">${rotuloTitulo(c)}</p>
                                                  <p class="text-sm text-gray-400">${c.edicoes.join(' · ')}</p>
                                              </li>
                                          `,
                                      )}
                                  </ul>
                              `
                            : html`<p class="text-gray-400 text-sm">Nenhum título grande desde essa data.</p>`,
                    )}
                    ${
                        primeiro
                            ? html`
                                  <div class="space-y-3">
                                      <h3 class="text-lg font-bold text-white">
                                          ${nasceuEmDiaDeJogo ? '⚽ O Timão jogou no dia em que você nasceu!' : 'O primeiro jogo da sua vida'}
                                      </h3>
                                      ${gameCard(primeiro)}
                                  </div>
                              `
                            : ''
                    }
                </div>

                <div class="lg:col-span-2 space-y-6">
                    ${card(
                        { titulo: 'Clássicos no seu tempo' },
                        html`
                            <ul class="space-y-4">
                                ${dados.classicos.map(
                                    (c) => html`
                                        <li>
                                            <a
                                                href="/classicos/${c.slug}"
                                                class="flex items-center justify-between gap-3 hover:text-gray-300 transition"
                                            >
                                                <span class="flex items-center gap-2 text-white font-medium"
                                                    >${miniEscudo(c.rival)} ${c.nome}</span
                                                >
                                                <span class="text-sm text-gray-300 whitespace-nowrap"
                                                    >${c.vitorias}V ${c.empates}E ${c.derrotas}D</span
                                                >
                                            </a>
                                            <p class="text-xs text-gray-400 mt-1">${veredito(c)}</p>
                                        </li>
                                    `,
                                )}
                            </ul>
                        `,
                    )}
                    <div class="grid grid-cols-1 gap-4">
                        ${sequenciaTile('Maior invencibilidade que você viu', dados.sequencias.invencibilidade, 'text-white')}
                        ${
                            dados.melhorTemporada
                                ? html`
                                      <a
                                          href="/temporadas/${dados.melhorTemporada.ano}"
                                          class="block bg-gray-800/50 rounded-lg p-4 border border-gray-700 hover:border-gray-600 transition"
                                      >
                                          <p class="text-xs text-gray-400 uppercase font-bold mb-1">
                                              Melhor temporada que você viu
                                          </p>
                                          <p class="text-3xl font-bold font-display text-white">
                                              ${dados.melhorTemporada.ano}
                                          </p>
                                          <p class="text-xs text-gray-400 mt-1">
                                              ${formatarPorcentagem(dados.melhorTemporada.aproveitamento)} de
                                              aproveitamento
                                          </p>
                                      </a>
                                  `
                                : ''
                        }
                        ${
                            dados.maiorVitoria
                                ? html`
                                      <a
                                          href="/jogos/${dados.maiorVitoria.id}"
                                          class="block bg-gray-800/50 rounded-lg p-4 border border-gray-700 hover:border-gray-600 transition"
                                      >
                                          <p class="text-xs text-gray-400 uppercase font-bold mb-1">
                                              Maior goleada que você viu
                                          </p>
                                          <p class="text-white font-bold">
                                              Corinthians ${dados.maiorVitoria.golsPro} x
                                              ${dados.maiorVitoria.golsContra} ${dados.maiorVitoria.adversario.nome}
                                          </p>
                                          <p class="text-xs text-gray-400 mt-1">
                                              ${formatarData(dados.maiorVitoria.data)} ·
                                              ${dados.maiorVitoria.campeonato?.nome ?? ''}
                                          </p>
                                      </a>
                                  `
                                : ''
                        }
                    </div>
                </div>
            </section>

            <section class="bg-sccp-gray border border-gray-700 rounded-xl p-6 md:p-10">
                <div class="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
                    <div class="space-y-4">
                        <h3 class="text-3xl font-display font-bold text-white">Mostre para a Fiel</h3>
                        <p class="text-gray-400">
                            Sua imagem no tamanho de story, pronta para o Instagram e o WhatsApp. Desafie os amigos a
                            descobrirem a deles.
                        </p>
                        <div class="flex flex-wrap gap-3">
                            <button type="button" id="baixar-imagem" class="btn-primary" disabled>
                                Gerando imagem…
                            </button>
                            ${botaoCompartilhar('compartilhar-historia', 'Compartilhar')}
                        </div>
                        <a href="/minha-historia" class="inline-block text-sm text-gray-400 hover:text-white transition"
                            >↺ Fazer com outra data</a
                        >
                    </div>
                    <div class="flex justify-center">
                        <div
                            class="w-56 md:w-64 aspect-[9/16] rounded-xl overflow-hidden border border-gray-700 bg-black shadow-2xl"
                        >
                            <img
                                id="previa-story"
                                alt="Prévia da imagem para story"
                                class="w-full h-full object-cover hidden"
                            />
                            <div
                                id="previa-carregando"
                                class="w-full h-full flex items-center justify-center text-gray-500 text-sm"
                            >
                                Gerando…
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            <p class="text-center text-xs text-gray-500">
                Contagem a partir de ${formatarData(dados.desde)} (${anoDe(dados.desde)}), com os jogos registrados no
                acervo.
            </p>
        </div>
    `;
}

export default {
    async render({ query, signal }) {
        const nascimento = query.get('nascimento') ?? '';
        const nome = limparNome(query.get('nome'));

        if (!FORMATO_DATA.test(nascimento)) {
            return { title: 'O Timão na sua vida', content: formulario({ nome }) };
        }

        try {
            const dados = await api.minhaHistoria(nascimento, signal);
            return { title: 'O Timão na sua vida', content: resultado(dados, nome) };
        } catch (err) {
            if (err.name === 'AbortError' || !err.status || err.status >= 500) throw err;
            return { title: 'O Timão na sua vida', content: formulario({ nascimento, nome, erro: err.message }) };
        }
    },

    async mount(root, ctx) {
        const form = /** @type {HTMLFormElement | null} */ (root.querySelector('#form-minha-historia'));
        if (form) {
            form.addEventListener('submit', (e) => {
                e.preventDefault();
                const dados = new FormData(form);
                const nascimento = String(dados.get('nascimento') ?? '');
                const nome = limparNome(dados.get('nome'));
                if (!FORMATO_DATA.test(nascimento)) {
                    form.querySelector('#nascimento')?.focus();
                    return;
                }
                const params = new URLSearchParams({ nascimento });
                if (nome) params.set('nome', nome);
                navegar(`/minha-historia?${params}`);
            });
            return undefined;
        }

        // Resultado: gera a imagem e liga os botões
        const nascimento = ctx.query.get('nascimento') ?? '';
        const nome = limparNome(ctx.query.get('nome'));
        const botaoBaixar = /** @type {HTMLButtonElement} */ (root.querySelector('#baixar-imagem'));
        const previa = /** @type {HTMLImageElement} */ (root.querySelector('#previa-story'));
        const carregando = root.querySelector('#previa-carregando');
        let arquivo = null;
        let urlPrevia = null;

        // O link compartilhado leva ao formulário (sem a data de quem compartilhou)
        const dadosCompartilhar = () => ({
            title: 'O Timão na minha vida',
            text: 'Descobri quantos jogos e títulos o Corinthians viveu comigo. Descubra o seu! 🦅',
            url: `${location.origin}/minha-historia`,
        });

        const botaoCompartilharEl = root.querySelector('#compartilhar-historia');
        botaoCompartilharEl?.addEventListener(
            'click',
            async (e) => {
                // Com a imagem pronta e suporte a arquivos (celular), compartilha a imagem junto
                if (arquivo && navigator.canShare?.({ files: [arquivo] })) {
                    e.stopImmediatePropagation();
                    try {
                        await navigator.share({ ...dadosCompartilhar(), files: [arquivo] });
                    } catch {
                        /* usuário cancelou */
                    }
                }
            },
            { capture: true },
        );
        ligarCompartilhar(root, 'compartilhar-historia', dadosCompartilhar);

        try {
            const dados = await api.minhaHistoria(nascimento); // vem do cache
            const blob = await gerarCartaoStory(dados, { nome, site: location.host });
            arquivo = new File([blob], 'timao-na-minha-vida.png', { type: 'image/png' });
            urlPrevia = URL.createObjectURL(blob);
            previa.src = urlPrevia;
            previa.classList.remove('hidden');
            carregando?.classList.add('hidden');

            botaoBaixar.disabled = false;
            botaoBaixar.textContent = 'Baixar imagem';
            botaoBaixar.addEventListener('click', () => {
                const link = document.createElement('a');
                link.href = urlPrevia;
                link.download = 'timao-na-minha-vida.png';
                link.click();
            });
        } catch (err) {
            console.error(err);
            botaoBaixar.textContent = 'Não foi possível gerar a imagem';
            if (carregando) carregando.textContent = 'Erro ao gerar';
        }

        return () => {
            if (urlPrevia) URL.revokeObjectURL(urlPrevia);
        };
    },
};
