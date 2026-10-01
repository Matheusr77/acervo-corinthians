/**
 * Criação e configuração da aplicação Express.
 * Separado de server.js para facilitar testes (a app não abre porta aqui).
 */

import path from 'node:path';
import compression from 'compression';
import express from 'express';
import helmet from 'helmet';
import config from './config/index.js';
import { apiNotFound, errorHandler } from './middlewares/errorHandler.js';
import { requestLogger } from './middlewares/requestLogger.js';
import apiRoutes from './routes/index.js';
import * as seo from './services/seoService.js';
import { imagemDoJogo } from './services/ogImageService.js';

export function createApp() {
    const app = express();

    app.disable('x-powered-by');

    app.use(
        helmet({
            contentSecurityPolicy: {
                directives: {
                    defaultSrc: ["'self'"],
                    scriptSrc: ["'self'"],
                    styleSrc: ["'self'", 'https://fonts.googleapis.com'],
                    // Larguras das barras de progresso são definidas via atributo style
                    styleSrcAttr: ["'unsafe-inline'"],
                    fontSrc: ["'self'", 'https://fonts.gstatic.com'],
                    imgSrc: [
                        "'self'",
                        'data:',
                        'blob:', // prévia da imagem gerada em "O Timão na sua vida"
                        'https://images.unsplash.com',
                        'https://plus.unsplash.com',
                    ],
                    connectSrc: ["'self'"],
                    objectSrc: ["'none'"],
                    upgradeInsecureRequests: config.isProduction ? [] : null,
                },
            },
        }),
    );
    app.use(compression());
    app.set('trust proxy', 1); // hospedagens usam proxy reverso (req.protocol correto para links absolutos)

    // ---- API ----
    const api = express.Router();
    if (!config.isProduction) api.use(requestLogger);
    api.use((_req, res, next) => {
        // Dados históricos: cache curto no navegador/proxy
        res.set('Cache-Control', 'public, max-age=60');
        next();
    });
    api.use(apiRoutes);
    api.use(apiNotFound);

    app.use('/api', api);

    // ---- Imagem de prévia de cada jogo (WhatsApp, redes sociais) ----
    app.get('/og/jogo/:arquivo', async (req, res, next) => {
        const m = /^(\d+)\.png$/.exec(req.params.arquivo);
        if (!m) return next();
        const png = await imagemDoJogo(Number(m[1]));
        if (!png) return next();
        res.type('png').set('Cache-Control', 'public, max-age=86400').send(png);
    });

    // ---- SEO: sitemap e robots ----
    app.get('/sitemap.xml', async (req, res) => {
        res.type('application/xml').set('Cache-Control', 'public, max-age=3600');
        res.send(await seo.sitemap(seo.urlBase(req)));
    });
    app.get('/robots.txt', (req, res) => {
        res.type('text/plain').send(seo.robots(seo.urlBase(req)));
    });

    // ---- Front-end estático (somente a pasta public/) ----
    app.use(
        express.static(config.paths.public, {
            maxAge: config.isProduction ? '7d' : 0,
            index: false, // o index.html é servido abaixo, com as meta tags da rota
        }),
    );

    // ---- Páginas da SPA ----
    // Rotas sem extensão devolvem o index.html com título/descrição da página
    // (e status 404 quando a rota não existe). Arquivos inexistentes recebem 404.
    app.get('/{*caminho}', async (req, res, next) => {
        if (path.extname(req.path)) return next();
        const meta = await seo.metaDaRota(req.path);
        const base = seo.urlBase(req);
        const html = await seo.renderIndex(meta, `${base}${req.path === '/' ? '' : req.path}`, base);
        res.status(meta.status).set('Cache-Control', 'no-cache').type('html').send(html);
    });

    app.use((_req, res) => {
        res.status(404).type('text/plain').send('Não encontrado.');
    });

    app.use(errorHandler);

    return app;
}
