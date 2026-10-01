/**
 * Roteador da SPA com History API (URLs limpas: /jogos/123?filtro=x).
 *
 * - Cliques em links internos (`<a href="/jogos">`) são interceptados e
 *   viram navegação sem recarregar a página. Ctrl/Cmd+clique, botão do meio,
 *   `target="_blank"`, `download` e links externos seguem o comportamento normal.
 * - Voltar/avançar do navegador funcionam (evento popstate).
 * - Links antigos no formato `/#/jogos` são convertidos automaticamente.
 * - Cada view é um objeto `{ render(ctx), mount?(root, ctx) }`:
 *     render → Promise<{ title: string, content: SafeHtml }>
 *     mount  → liga eventos após inserir o HTML; pode devolver uma função de limpeza.
 * - Navegações concorrentes são canceladas (AbortController), então uma
 *   resposta lenta nunca sobrescreve a página atual.
 */

import { errorState, spinner } from '../components/feedback.js';

const SITE_NAME = 'Acervo Corinthians';

/** Instância ativa (usada por navegar()). */
let ativo = null;
const SPINNER_DELAY_MS = 150;

/**
 * @typedef {{ params: Record<string, string>, query: URLSearchParams, signal: AbortSignal, path: string }} RouteContext
 * @typedef {{ render: (ctx: RouteContext) => Promise<{ title?: string, content: unknown }>, mount?: (root: HTMLElement, ctx: RouteContext) => (void | (() => void) | Promise<unknown>) }} View
 * @typedef {{ path: string, view: View, nav?: string }} RouteDef
 */

export class Router {
    /**
     * @param {HTMLElement} outlet - Elemento onde as views são renderizadas
     * @param {RouteDef[]} routes
     * @param {{ notFound: View, onNavigate?: (nav: string | undefined) => void }} options
     */
    constructor(outlet, routes, { notFound, onNavigate }) {
        this.outlet = outlet;
        this.routes = routes.map((r) => ({ ...r, ...compile(r.path) }));
        this.notFound = notFound;
        this.onNavigate = onNavigate;
        this.controller = null;
        this.cleanup = null;
        this.lastPath = null;
    }

    start() {
        ativo = this;
        migrarLinkAntigo();
        window.addEventListener('popstate', () => this.resolve());
        document.addEventListener('click', (e) => this.onLinkClick(e));
        this.resolve();
    }

    /**
     * Navega para um caminho interno.
     * @param {string} url - ex.: '/jogos?ano=2012'
     * @param {{ replace?: boolean }} [opcoes]
     */
    navigate(url, { replace = false } = {}) {
        if (url === location.pathname + location.search) return;
        history[replace ? 'replaceState' : 'pushState'](null, '', url);
        this.resolve();
    }

    /** Recarrega a rota atual (usado no botão "tentar novamente"). */
    reload() {
        this.resolve({ force: true });
    }

    /** @param {MouseEvent} e */
    onLinkClick(e) {
        if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
        const link = /** @type {HTMLAnchorElement | null} */ (
            e.target instanceof Element ? e.target.closest('a[href]') : null
        );
        if (!link || link.target || link.hasAttribute('download') || link.origin !== location.origin) return;
        if (link.pathname.startsWith('/api/') || /\.[a-z0-9]+$/i.test(link.pathname)) return; // arquivos e API
        if (link.getAttribute('href')?.startsWith('#')) return; // âncoras na mesma página

        e.preventDefault();
        this.navigate(link.pathname + link.search);
    }

    async resolve({ force = false } = {}) {
        const path = normalizar(location.pathname);
        const query = new URLSearchParams(location.search);

        this.controller?.abort();
        const controller = new AbortController();
        this.controller = controller;

        const match = this.match(path);
        const view = match?.route.view ?? this.notFound;
        const ctx = { params: match?.params ?? {}, query, signal: controller.signal, path };

        const samePath = path === this.lastPath && !force;
        this.lastPath = path;
        this.onNavigate?.(match?.route.nav);

        const spinnerTimer = setTimeout(() => {
            this.outlet.innerHTML = String(spinner());
        }, SPINNER_DELAY_MS);

        try {
            const { title, content } = await view.render(ctx);
            if (controller.signal.aborted) return;

            this.runCleanup();
            this.outlet.innerHTML = String(content);
            this.replayAnimation();
            document.title = title ? `${title} · ${SITE_NAME}` : SITE_NAME;
            if (!samePath) window.scrollTo({ top: 0 });

            this.registrarCleanup(view.mount?.(this.outlet, ctx), controller);
        } catch (err) {
            if (err?.name === 'AbortError' || controller.signal.aborted) return;
            if (err?.status !== 404) console.error(err);
            this.runCleanup();
            this.outlet.innerHTML = String(errorState(err));
            document.title = `Erro · ${SITE_NAME}`;
            this.outlet.querySelector('[data-action="retry"]')?.addEventListener('click', () => this.reload());
        } finally {
            clearTimeout(spinnerTimer);
        }
    }

    /** @param {string} path */
    match(path) {
        for (const route of this.routes) {
            const m = route.regex.exec(path);
            if (m) {
                const params = Object.fromEntries(route.keys.map((k, i) => [k, decodeURIComponent(m[i + 1])]));
                return { route, params };
            }
        }
        return null;
    }

    /**
     * Guarda a função de limpeza devolvida pelo mount (que pode ser assíncrono).
     * Se o usuário já mudou de página quando a promessa resolver, limpa na hora.
     * @param {unknown} retorno
     * @param {AbortController} controller
     */
    registrarCleanup(retorno, controller) {
        const guardar = (fn) => {
            if (typeof fn !== 'function') return;
            if (this.controller === controller && !controller.signal.aborted) this.cleanup = fn;
            else fn();
        };
        if (retorno instanceof Promise) retorno.then(guardar).catch((err) => console.error(err));
        else guardar(retorno);
    }

    runCleanup() {
        try {
            this.cleanup?.();
        } finally {
            this.cleanup = null;
        }
    }

    /** Reaplica a animação de entrada a cada troca de página. */
    replayAnimation() {
        this.outlet.classList.remove('fade-in');
        void this.outlet.offsetWidth; // força reflow para reiniciar a animação
        this.outlet.classList.add('fade-in');
    }
}

/**
 * Converte '/jogos/:id' em regex + lista de parâmetros.
 * @param {string} path
 */
function compile(path) {
    const keys = [];
    const pattern = path.replace(/\/:([a-zA-Z]+)/g, (_m, key) => {
        keys.push(key);
        return '/([^/]+)';
    });
    return { regex: new RegExp(`^${pattern}/?$`), keys };
}

/** Remove a barra final ('/jogos/' → '/jogos'). */
function normalizar(path) {
    return path.length > 1 ? path.replace(/\/+$/, '') : path;
}

/** Links compartilhados na versão antiga (/#/jogos/12) continuam funcionando. */
function migrarLinkAntigo() {
    if (location.hash.startsWith('#/')) {
        history.replaceState(null, '', location.hash.slice(1));
    }
}

/**
 * Atualiza a query string da rota atual sem disparar nova navegação
 * (usado pelos filtros, para manter foco e rolagem).
 * @param {string} path
 * @param {Record<string, unknown>} params
 */
export function replaceQuery(path, params) {
    const search = new URLSearchParams();
    for (const [key, value] of Object.entries(params)) {
        if (value !== undefined && value !== null && value !== '') search.set(key, String(value));
    }
    const qs = search.toString();
    history.replaceState(null, '', `${path}${qs ? `?${qs}` : ''}`);
}

/**
 * Navega para uma rota interna a partir de qualquer view (ex.: após enviar um formulário).
 * @param {string} url
 * @param {{ replace?: boolean }} [opcoes]
 */
export function navegar(url, opcoes) {
    if (ativo) ativo.navigate(url, opcoes);
    else location.assign(url);
}
