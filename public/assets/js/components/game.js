/**
 * Componentes de jogo: card da listagem, linha compacta, selo de resultado e escudo.
 */

import { html } from '../core/html.js';
import { RESULTADO_LABEL, anoDe, formatarData, formatarDiaMes } from '../utils/format.js';

const BADGE_CLASSES = {
    V: 'bg-green-500/10 text-green-500 border-green-500/20',
    E: 'bg-gray-500/10 text-gray-400 border-gray-500/20',
    D: 'bg-red-500/10 text-red-500 border-red-500/20',
};

/**
 * Selo "Vitória / Empate / Derrota".
 * @param {'V'|'E'|'D'|null} resultado
 * @param {{ compacto?: boolean }} [opcoes]
 */
export function resultBadge(resultado, { compacto = false } = {}) {
    if (!resultado) {
        return html`<span
            class="inline-flex px-3 py-1 rounded-full text-xs font-bold border border-gray-700 text-gray-400"
            >Sem placar</span
        >`;
    }
    return html`
        <span
            class="inline-flex items-center justify-center rounded-full font-bold text-xs border flex-shrink-0 ${compacto ? 'w-7 h-7' : 'px-3 py-1'} ${BADGE_CLASSES[resultado]}"
            title="${RESULTADO_LABEL[resultado]}"
            >${compacto ? resultado : RESULTADO_LABEL[resultado]}</span
        >
    `;
}

/**
 * Placar do ponto de vista do Corinthians, com pênaltis quando houver.
 * @param {any} jogo
 */
function placarCorinthians(jogo) {
    if (jogo.golsPro === null || jogo.golsPro === undefined) return '– x –';
    const { penaltisMandante: pm, penaltisVisitante: pv } = jogo.placar;
    const temPenaltis = pm !== null && pv !== null;
    const penPro = jogo.emCasa ? pm : pv;
    const penContra = jogo.emCasa ? pv : pm;
    return html`${temPenaltis ? html`<span class="text-xs text-gray-400 mr-1">(${penPro})</span>` : ''}${jogo.golsPro} -
    ${jogo.golsContra}${temPenaltis ? html`<span class="text-xs text-gray-400 ml-1">(${penContra})</span>` : ''}`;
}

/**
 * Card de jogo usado nas listagens (layout original do protótipo).
 * @param {any} jogo
 */
export function gameCard(jogo) {
    return html`
        <a
            href="/jogos/${jogo.id}"
            class="group block bg-gray-900 border border-gray-800 rounded-xl px-5 py-4 hover:border-gray-600 hover:bg-gray-800/60 transition-all duration-300 shadow-sm space-y-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-sccp-gold"
            aria-label="Corinthians ${jogo.golsPro ?? ''} x ${jogo.golsContra ?? ''} ${jogo.adversario.nome}, ${formatarData(jogo.data)}"
        >
            <div class="flex items-center gap-3">
                <div class="flex-shrink-0 w-12 text-center">
                    <span class="block text-xs text-gray-400 font-bold uppercase">${anoDe(jogo.data)}</span>
                    <span class="block text-sm text-white font-bold">${formatarDiaMes(jogo.data)}</span>
                </div>
                <div class="h-6 w-px bg-gray-700 flex-shrink-0"></div>
                <div class="min-w-0 flex-1">
                    <p class="text-xs text-gray-300 font-bold uppercase tracking-wide truncate">
                        ${jogo.campeonato?.nome ?? 'Competição não informada'}${jogo.fase ? html` <span class="text-gray-400 normal-case font-normal">· ${jogo.fase}</span>` : ''}
                    </p>
                    <p class="text-gray-400 text-xs truncate">${jogo.estadio?.nome ?? 'Estádio não informado'}</p>
                </div>
                ${
                    jogo.jogoDoTitulo
                        ? html`<span
                              class="text-[10px] uppercase tracking-wider font-bold text-sccp-gold bg-sccp-gold/10 border border-sccp-gold/30 rounded px-2 py-0.5 flex-shrink-0"
                              title="${jogo.observacoes}"
                              >🏆 Título</span
                          >`
                        : ''
                }
                <span
                    class="hidden sm:inline text-[10px] uppercase tracking-wider font-bold text-gray-400 border border-gray-800 rounded px-2 py-0.5"
                >
                    ${jogo.emCasa ? 'Mandante' : 'Visitante'}
                </span>
            </div>

            <div class="flex items-center justify-between min-h-[36px]">
                <div class="flex-1 flex items-center justify-center gap-2 sm:gap-4 min-w-0">
                    <span class="flex-1 min-w-0 flex items-center justify-end gap-2">
                        <span class="text-sm sm:text-base font-medium text-white truncate">Corinthians</span>
                        ${miniEscudo(jogo.emCasa ? jogo.mandante : jogo.visitante)}
                    </span>
                    <div
                        class="bg-sccp-black border border-gray-700 rounded-lg px-3 py-1 min-w-[75px] text-center font-display font-bold text-lg text-white group-hover:border-gray-500 transition flex-shrink-0 whitespace-nowrap"
                    >
                        ${placarCorinthians(jogo)}
                    </div>
                    <span class="flex-1 min-w-0 flex items-center gap-2">
                        ${miniEscudo(jogo.adversario)}
                        <span class="text-sm sm:text-base font-medium text-white truncate"
                            >${jogo.adversario.nome}</span
                        >
                    </span>
                </div>
                <span class="ml-3 sm:ml-4 hidden sm:inline-flex">${resultBadge(jogo.resultado)}</span>
                <span class="ml-3 sm:hidden">${resultBadge(jogo.resultado, { compacto: true })}</span>
            </div>
        </a>
    `;
}

/**
 * Linha compacta de jogo (listas de recordes, últimos confrontos).
 * @param {any} jogo
 * @param {{ destaque?: unknown }} [opcoes] - Conteúdo exibido à direita no lugar do selo
 */
export function gameRow(jogo, { destaque } = {}) {
    return html`
        <li>
            <a
                href="/jogos/${jogo.id}"
                class="flex items-center gap-3 py-2.5 border-b border-gray-800 last:border-0 hover:bg-white/[0.03] -mx-2 px-2 rounded transition"
            >
                <span class="text-xs text-gray-400 w-20 flex-shrink-0">${formatarData(jogo.data)}</span>
                <span class="flex-1 min-w-0 text-sm text-gray-200 truncate">
                    ${jogo.emCasa ? 'Corinthians' : jogo.adversario.nome}
                    <strong class="text-white font-display mx-1"
                        >${jogo.placar.mandante ?? '–'} x ${jogo.placar.visitante ?? '–'}</strong
                    >
                    ${jogo.emCasa ? jogo.adversario.nome : 'Corinthians'}
                </span>
                ${destaque ?? resultBadge(jogo.resultado, { compacto: true })}
            </a>
        </li>
    `;
}

/**
 * Escudo do time: a imagem, quando existe em /assets/img/escudos/, ou um
 * círculo com a sigla (Corinthians sem imagem: "CP").
 * @param {{ nome: string, sigla?: string | null, escudo?: string | null }} time
 * @param {{ clube?: boolean, tamanho?: 'md' | 'lg' }} [opcoes]
 */
export function teamCrest(time, { clube = false, tamanho = 'lg' } = {}) {
    const tamanhoClasse =
        tamanho === 'lg' ? 'w-20 h-20 md:w-32 md:h-32 text-2xl md:text-4xl' : 'w-14 h-14 md:w-16 md:h-16 text-lg';

    if (time.escudo) {
        return html`
            <img
                src="${time.escudo}"
                alt=""
                aria-hidden="true"
                loading="lazy"
                class="${tamanhoClasse} mx-auto object-contain drop-shadow-lg"
            />
        `;
    }

    const sigla = (time.sigla || time.nome.slice(0, 3)).toUpperCase();
    const corClasse = clube ? 'bg-white text-black' : 'bg-gray-800 text-white';
    return html`
        <div
            class="${tamanhoClasse} ${corClasse} rounded-full mx-auto flex items-center justify-center border-4 border-gray-800 shadow-lg font-bold"
            aria-hidden="true"
        >
            ${clube ? 'CP' : sigla}
        </div>
    `;
}

/**
 * Escudo pequeno (24px) para listas; sem imagem, mostra a inicial num círculo discreto.
 * @param {{ nome: string, escudo?: string | null }} time
 */
export function miniEscudo(time) {
    if (time?.escudo) {
        return html`<img
            src="${time.escudo}"
            alt=""
            aria-hidden="true"
            loading="lazy"
            width="24"
            height="24"
            class="w-6 h-6 object-contain flex-shrink-0"
        />`;
    }
    return html`<span
        class="w-6 h-6 flex-shrink-0 rounded-full bg-gray-800 text-gray-400 text-[10px] font-bold hidden sm:flex items-center justify-center"
        aria-hidden="true"
        >${(time?.nome ?? '?').slice(0, 1).toUpperCase()}</span
    >`;
}
