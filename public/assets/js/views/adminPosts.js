/**
 * Painel "Posts do dia" (/admin/posts): imagens e legendas prontas para o X e o
 * Instagram do @sccpacervo.
 *  - Hoje na História: jogos do Timão na data escolhida (o mais marcante vem primeiro);
 *  - Aniversários: títulos conquistados nesta data e nos próximos 7 dias.
 *
 * Protegido pela mesma senha (ADMIN_TOKEN) do painel de correções.
 */

import { api } from '../core/api.js';
import { html } from '../core/html.js';
import { abasAdmin, formLogin, lerToken, salvarToken } from '../components/admin.js';
import { pageHeader } from '../components/layout.js';
import { FORMATOS_POST, gerarPost, legendaPost } from '../utils/cartaoPost.js';
import { pesoTitulo } from '../utils/cartaoStory.js';
import { formatarData, hojeIso } from '../utils/format.js';

const DIAS_ANIVERSARIO = 7;

/** Soma dias a uma data 'AAAA-MM-DD'. */
function somarDias(iso, dias) {
    const d = new Date(`${iso}T12:00:00`);
    d.setDate(d.getDate() + dias);
    return hojeIso(d);
}
const mesDia = (iso) => iso.slice(5);

/**
 * Títulos cujo jogo decisivo faz aniversário entre `inicio` e os próximos dias.
 * @param {any} titulos - resposta de /api/titulos
 */
function aniversarios(titulos, inicio) {
    const datas = Array.from({ length: DIAS_ANIVERSARIO + 1 }, (_, i) => somarDias(inicio, i));
    const lista = [];
    for (const categoria of titulos?.categorias ?? []) {
        for (const comp of categoria.competicoes) {
            for (const c of comp.conquistas) {
                if (!c.jogo) continue;
                const i = datas.findIndex((d) => mesDia(d) === mesDia(c.jogo.data));
                if (i === -1) continue;
                lista.push({ quando: datas[i], emDias: i, competicao: comp.nome, edicao: c.edicao, jogo: c.jogo });
            }
        }
    }
    // Mais perto primeiro; no mesmo dia, o título mais importante (Mundial, Libertadores...)
    return lista.sort((a, b) => a.emDias - b.emDias || pesoTitulo(a.competicao) - pesoTitulo(b.competicao));
}

const placar = (j) =>
    `${j.mandante.nome} ${j.placar.mandante ?? '–'} x ${j.placar.visitante ?? '–'} ${j.visitante.nome}`;

function painel(dia, dadosDia, lista) {
    const jogos = dadosDia?.jogos ?? [];
    const destaqueId = dadosDia?.destaque?.id;
    const ordenados = [...jogos].sort((a, b) => (b.id === destaqueId) - (a.id === destaqueId));
    return html`
        <div class="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_auto] gap-8 items-start">
            <div class="space-y-8 min-w-0">
                <div class="flex flex-wrap items-end gap-3">
                    <div>
                        <label
                            for="post-dia"
                            class="block text-xs font-bold uppercase tracking-wider text-gray-400 mb-1"
                            >Data</label
                        >
                        <input id="post-dia" type="date" value="${dia}" class="form-control py-2" />
                    </div>
                    <button type="button" class="btn-secondary text-sm" data-mudar-dia="-1">← Dia anterior</button>
                    <button type="button" class="btn-secondary text-sm" data-mudar-dia="1">Próximo dia →</button>
                    <button type="button" class="btn-ghost text-sm" data-mudar-dia="0">Hoje</button>
                </div>

                <section class="space-y-3">
                    <h3 class="text-xl font-display font-bold text-white">🏆 Aniversários de conquista</h3>
                    ${
                        lista.length
                            ? html`<ul class="space-y-2">
                                  ${lista.map(
                                      (a, i) => html`
                                          <li>
                                              <button
                                                  type="button"
                                                  data-aniversario="${i}"
                                                  class="w-full text-left rounded-lg border px-4 py-3 transition hover:border-gray-500 aria-pressed:border-sccp-gold aria-pressed:bg-white/5 ${a.emDias === 0 ? 'border-sccp-gold/60' : 'border-gray-800'}"
                                              >
                                                  <span
                                                      class="block text-xs font-bold uppercase tracking-wider ${a.emDias === 0 ? 'text-sccp-gold' : 'text-gray-400'}"
                                                  >
                                                      ${a.emDias === 0 ? 'Hoje' : `Em ${a.emDias} ${a.emDias === 1 ? 'dia' : 'dias'} · ${formatarData(a.quando).slice(0, 5)}`}
                                                  </span>
                                                  <span class="block font-bold text-white"
                                                      >${a.competicao} ${a.edicao}</span
                                                  >
                                                  <span class="block text-sm text-gray-400"
                                                      >${formatarData(a.jogo.data)} · ${placar(a.jogo)}</span
                                                  >
                                              </button>
                                          </li>
                                      `,
                                  )}
                              </ul>`
                            : html`<p class="text-gray-400 text-sm">
                                  Nenhum título faz aniversário nos próximos ${DIAS_ANIVERSARIO} dias.
                              </p>`
                    }
                </section>

                <section class="space-y-3">
                    <h3 class="text-xl font-display font-bold text-white">
                        📅 Hoje na História · ${formatarData(dia).slice(0, 5)}
                    </h3>
                    ${
                        ordenados.length
                            ? html`<ul class="space-y-2 max-h-[28rem] overflow-y-auto pr-1">
                                  ${ordenados.map(
                                      (j) => html`
                                          <li>
                                              <button
                                                  type="button"
                                                  data-jogo="${j.id}"
                                                  class="w-full text-left rounded-lg border border-gray-800 px-4 py-3 transition hover:border-gray-500 aria-pressed:border-sccp-gold aria-pressed:bg-white/5"
                                              >
                                                  <span class="flex items-center justify-between gap-3">
                                                      <span class="font-bold text-white">${placar(j)}</span>
                                                      ${j.id === destaqueId ? html`<span class="text-[10px] uppercase font-bold text-sccp-gold">Destaque</span>` : ''}
                                                  </span>
                                                  <span class="block text-sm text-gray-400"
                                                      >${formatarData(j.data)} · ${j.campeonato?.nome ?? ''}</span
                                                  >
                                              </button>
                                          </li>
                                      `,
                                  )}
                              </ul>`
                            : html`<p class="text-gray-400 text-sm">O Timão não jogou nesta data.</p>`
                    }
                </section>
            </div>

            <aside class="space-y-4 w-full lg:w-[22rem] lg:sticky lg:top-28" id="post-saida" hidden>
                <div class="grid grid-cols-3 gap-2" role="radiogroup" aria-label="Formato">
                    ${Object.entries(FORMATOS_POST).map(
                        ([id, f], i) => html`
                            <button
                                type="button"
                                role="radio"
                                aria-checked="${i === 0}"
                                data-formato-post="${id}"
                                class="rounded-lg border border-gray-700 px-2 py-2 text-center transition hover:border-gray-500 aria-checked:border-sccp-gold aria-checked:bg-white/5"
                            >
                                <span class="block text-sm font-bold text-white">${f.nome}</span>
                                <span class="block text-[11px] text-gray-400">${f.descricao}</span>
                            </button>
                        `,
                    )}
                </div>
                <div class="rounded-xl overflow-hidden border border-gray-700 bg-black">
                    <img id="post-previa" alt="Prévia do post" class="w-full h-auto" />
                </div>
                <button type="button" id="post-baixar" class="btn-primary w-full" disabled>Baixar imagem</button>
                <div>
                    <label
                        for="post-legenda"
                        class="block text-xs font-bold uppercase tracking-wider text-gray-400 mb-1"
                        >Legenda</label
                    >
                    <textarea id="post-legenda" rows="8" class="form-control text-sm leading-relaxed"></textarea>
                </div>
                <button type="button" id="post-copiar" class="btn-secondary w-full">Copiar legenda</button>
            </aside>
        </div>
    `;
}

export default {
    render() {
        return {
            title: 'Posts do dia',
            content: html`
                <div class="max-w-6xl mx-auto space-y-8">
                    ${abasAdmin('posts')}
                    ${pageHeader('Posts do dia', 'Imagens e legendas prontas para o X e o Instagram do @sccpacervo.')}
                    <div id="posts-conteudo"></div>
                </div>
            `,
        };
    },

    mount(root) {
        const alvo = /** @type {HTMLElement} */ (root.querySelector('#posts-conteudo'));
        let token = lerToken();
        let ativo = true;
        let dia = hojeIso();
        let lista = [];
        let jogosDoDia = [];
        let post = null;
        let formato = 'x';
        let urlPrevia = null;
        let geracao = 0;

        const mostrarLogin = (mensagem) => {
            alvo.innerHTML = String(formLogin(mensagem));
            /** @type {HTMLElement} */ (alvo.querySelector('#admin-token')).focus();
        };

        const desenhar = async () => {
            if (!post) return;
            const minha = ++geracao;
            const saida = /** @type {HTMLElement} */ (alvo.querySelector('#post-saida'));
            const botao = /** @type {HTMLButtonElement} */ (alvo.querySelector('#post-baixar'));
            saida.hidden = false;
            botao.disabled = true;
            const site = location.host;
            /** @type {HTMLTextAreaElement} */ (alvo.querySelector('#post-legenda')).value = legendaPost(
                post,
                post.referencia,
                site,
            );
            const blob = await gerarPost(post, { formato, hoje: post.referencia, site });
            if (minha !== geracao || !ativo) return;
            if (urlPrevia) URL.revokeObjectURL(urlPrevia);
            urlPrevia = URL.createObjectURL(blob);
            /** @type {HTMLImageElement} */ (alvo.querySelector('#post-previa')).src = urlPrevia;
            botao.disabled = false;
        };

        const marcar = (seletor, el) => {
            alvo.querySelectorAll(seletor).forEach((b) => b.setAttribute('aria-pressed', String(b === el)));
        };

        const carregar = async () => {
            if (!token) return mostrarLogin();
            try {
                await api.correcoes(token, 'aberta'); // confere a senha
            } catch (err) {
                if (!ativo) return;
                if (err.status === 401) {
                    token = '';
                    salvarToken('');
                }
                return mostrarLogin(err.message);
            }
            const [dadosDia, titulos] = await Promise.all([
                api.hoje(dia.slice(5)).catch(() => null),
                api.titulos().catch(() => null),
            ]);
            if (!ativo) return;
            lista = aniversarios(titulos, dia);
            jogosDoDia = dadosDia?.jogos ?? [];
            alvo.innerHTML = String(painel(dia, dadosDia, lista));

            // Já abre com o aniversário de hoje ou, se não houver, o jogo em destaque
            const inicial =
                alvo.querySelector('[data-aniversario]') && lista[0]?.emDias === 0
                    ? alvo.querySelector('[data-aniversario="0"]')
                    : alvo.querySelector('[data-jogo]');
            /** @type {HTMLElement | null} */ (inicial)?.click();
        };

        alvo.addEventListener('submit', (e) => {
            e.preventDefault();
            token = /** @type {HTMLInputElement} */ (alvo.querySelector('#admin-token')).value.trim();
            salvarToken(token);
            carregar();
        });

        alvo.addEventListener('change', (e) => {
            const el = /** @type {HTMLInputElement} */ (e.target);
            if (el.id === 'post-dia' && /^\d{4}-\d{2}-\d{2}$/.test(el.value)) {
                dia = el.value;
                carregar();
            }
        });

        alvo.addEventListener('click', async (e) => {
            const el = /** @type {HTMLElement} */ (e.target);
            const mudar = el.closest('[data-mudar-dia]');
            const aniv = el.closest('[data-aniversario]');
            const jogo = el.closest('[data-jogo]');
            const fmt = el.closest('[data-formato-post]');
            if (mudar) {
                const n = Number(mudar.getAttribute('data-mudar-dia'));
                dia = n === 0 ? hojeIso() : somarDias(dia, n);
                carregar();
            } else if (aniv) {
                const a = lista[Number(aniv.getAttribute('data-aniversario'))];
                post = {
                    tipo: 'aniversario',
                    jogo: a.jogo,
                    competicao: a.competicao,
                    edicao: a.edicao,
                    referencia: a.quando,
                };
                marcar('[data-aniversario], [data-jogo]', aniv);
                desenhar();
            } else if (jogo) {
                const id = Number(jogo.getAttribute('data-jogo'));
                post = { tipo: 'hoje', jogo: jogosDoDia.find((j) => j.id === id), referencia: dia };
                marcar('[data-aniversario], [data-jogo]', jogo);
                desenhar();
            } else if (fmt) {
                formato = fmt.getAttribute('data-formato-post') ?? 'x';
                alvo.querySelectorAll('[data-formato-post]').forEach((b) =>
                    b.setAttribute('aria-checked', String(b === fmt)),
                );
                desenhar();
            } else if (el.closest('#post-baixar') && urlPrevia) {
                const link = document.createElement('a');
                link.href = urlPrevia;
                link.download = `post-${post?.tipo}-${post?.jogo?.data}-${formato}.png`;
                link.click();
            } else if (el.closest('#post-copiar')) {
                const legenda = /** @type {HTMLTextAreaElement} */ (alvo.querySelector('#post-legenda'));
                const botao = /** @type {HTMLButtonElement} */ (el.closest('#post-copiar'));
                try {
                    await navigator.clipboard.writeText(legenda.value);
                    botao.textContent = 'Legenda copiada!';
                } catch {
                    legenda.select();
                    botao.textContent = 'Selecionada: aperte Ctrl+C';
                }
                setTimeout(() => (botao.textContent = 'Copiar legenda'), 2000);
            }
        });

        carregar();
        return () => {
            ativo = false;
            geracao++;
            if (urlPrevia) URL.revokeObjectURL(urlPrevia);
        };
    },
};
