/**
 * Middlewares de erro da API.
 * Express 5 já encaminha erros de handlers async para cá automaticamente.
 */

import config from '../config/index.js';
import { HttpError } from '../utils/httpError.js';

/** 404 para qualquer rota /api inexistente. */
export function apiNotFound(req, _res, next) {
    next(HttpError.notFound(`Rota não encontrada: ${req.method} ${req.originalUrl}`));
}

/**
 * Converte qualquer erro em uma resposta JSON padronizada:
 * `{ erro: { status, mensagem, detalhes? } }`
 */
export function errorHandler(err, req, res, _next) {
    const status = err instanceof HttpError ? err.status : 500;

    if (status >= 500) {
        console.error(`[erro] ${req.method} ${req.originalUrl}`, err);
    }

    const mensagem =
        status >= 500 && config.isProduction ? 'Erro interno do servidor.' : err.message || 'Erro interno do servidor.';

    res.status(status).json({
        erro: {
            status,
            mensagem,
            ...(err.details ? { detalhes: err.details } : {}),
        },
    });
}
