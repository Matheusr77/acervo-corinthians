/**
 * Ponto de entrada do front-end: registra as rotas e liga o layout
 * (menu ativo e menu mobile).
 */

import { iniciarBusca } from './components/busca.js';
import { iniciarCorrecoes } from './components/correcao.js';
import { iniciarNavegacao } from './components/navegacao.js';
import { iniciarRedes } from './components/redes.js';
import { Router } from './core/router.js';
import { iniciarTema } from './core/tema.js';
import adminCorrecoes from './views/adminCorrecoes.js';
import adminPosts from './views/adminPosts.js';
import adversarioDetalhe from './views/adversarioDetalhe.js';
import adversarios from './views/adversarios.js';
import classicoDetalhe from './views/classicoDetalhe.js';
import classicos from './views/classicos.js';
import estadioDetalhe from './views/estadioDetalhe.js';
import estadios from './views/estadios.js';
import estatisticas from './views/estatisticas.js';
import fregueses from './views/fregueses.js';
import home from './views/home.js';
import hoje from './views/hoje.js';
import jogoDetalhe from './views/jogoDetalhe.js';
import jogos from './views/jogos.js';
import mapa from './views/mapa.js';
import minhaHistoria from './views/minhaHistoria.js';
import naoEncontrado from './views/naoEncontrado.js';
import miniJogos from './views/miniJogos.js';
import paredao from './views/paredao.js';
import penaltis from './views/penaltis.js';
import quiz from './views/quiz.js';
import sobre from './views/sobre.js';
import temporadaDetalhe from './views/temporadaDetalhe.js';
import temporadas from './views/temporadas.js';
import titulos from './views/titulos.js';

/** @type {import('./core/router.js').RouteDef[]} */
const ROUTES = [
    { path: '/', view: home, nav: 'home' },
    { path: '/jogos', view: jogos, nav: 'jogos' },
    { path: '/jogos/:id', view: jogoDetalhe, nav: 'jogos' },
    { path: '/temporadas', view: temporadas, nav: 'temporadas' },
    { path: '/temporadas/:ano', view: temporadaDetalhe, nav: 'temporadas' },
    { path: '/estatisticas', view: estatisticas, nav: 'estatisticas' },
    { path: '/adversarios', view: adversarios, nav: 'adversarios' },
    { path: '/adversarios/:id', view: adversarioDetalhe, nav: 'adversarios' },
    { path: '/classicos', view: classicos, nav: 'classicos' },
    { path: '/classicos/:slug', view: classicoDetalhe, nav: 'classicos' },
    { path: '/titulos', view: titulos, nav: 'titulos' },
    { path: '/hoje', view: hoje, nav: 'hoje' },
    { path: '/quiz', view: quiz, nav: 'quiz' },
    { path: '/mini-jogos', view: miniJogos, nav: 'mini-jogos' },
    { path: '/penaltis', view: penaltis, nav: 'mini-jogos' },
    { path: '/paredao', view: paredao, nav: 'mini-jogos' },
    { path: '/fregueses', view: fregueses, nav: 'fregueses' },
    { path: '/estadios', view: estadios, nav: 'estadios' },
    { path: '/mapa', view: mapa, nav: 'mapa' },
    { path: '/estadios/:id', view: estadioDetalhe, nav: 'estadios' },
    { path: '/minha-historia', view: minhaHistoria, nav: 'minha-historia' },
    { path: '/sobre', view: sobre, nav: 'sobre' },
    { path: '/admin/correcoes', view: adminCorrecoes },
    { path: '/admin/posts', view: adminPosts },
];

const ACTIVE_CLASSES = ['text-white', 'border-white'];
const INACTIVE_CLASSES = ['text-gray-400', 'border-transparent'];

/**
 * Destaca o link do menu correspondente à rota atual.
 * @param {string | undefined} nav
 */
function updateMenu(nav) {
    document.querySelectorAll('[data-nav]').forEach((link) => {
        const ativo = link.getAttribute('data-nav') === nav;
        link.classList.remove(...(ativo ? INACTIVE_CLASSES : ACTIVE_CLASSES));
        link.classList.add(...(ativo ? ACTIVE_CLASSES : INACTIVE_CLASSES));
        if (ativo) link.setAttribute('aria-current', 'page');
        else link.removeAttribute('aria-current');
    });
    setMobileMenu(false);
}

/** @param {boolean} aberto */
function setMobileMenu(aberto) {
    const menu = document.getElementById('mobile-menu');
    const botao = document.getElementById('mobile-menu-button');
    if (!menu || !botao) return;
    menu.hidden = !aberto;
    botao.setAttribute('aria-expanded', String(aberto));
    botao.setAttribute('aria-label', aberto ? 'Fechar menu' : 'Abrir menu');
}

function setupMobileMenu() {
    const botao = document.getElementById('mobile-menu-button');
    botao?.addEventListener('click', () => {
        setMobileMenu(botao.getAttribute('aria-expanded') !== 'true');
    });
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') setMobileMenu(false);
    });
}

function setupFooterYear() {
    const el = document.getElementById('ano-atual');
    if (el) el.textContent = String(new Date().getFullYear());
}

/** O link "pular para o conteúdo" não pode alterar o hash (ele é a rota da SPA). */
function setupSkipLink() {
    document.querySelector('[data-skip-link]')?.addEventListener('click', (e) => {
        e.preventDefault();
        document.getElementById('app-content')?.focus();
    });
}

iniciarNavegacao();
iniciarRedes();
setupMobileMenu();
setupFooterYear();
setupSkipLink();
iniciarBusca();
iniciarCorrecoes();

const router = new Router(document.getElementById('app-content'), ROUTES, {
    notFound: naoEncontrado,
    onNavigate: updateMenu,
});
router.start();

// O tema troca só as variáveis de cor do CSS: a página (gráficos e mapa inclusive)
// muda de cor no lugar, sem redesenhar nem voltar para o topo
iniciarTema();
