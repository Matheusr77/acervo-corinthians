/**
 * Log simples de requisições da API (método, rota, status e duração).
 */
export function requestLogger(req, res, next) {
    const inicio = process.hrtime.bigint();
    res.on('finish', () => {
        const ms = Number(process.hrtime.bigint() - inicio) / 1e6;
        console.log(`${req.method} ${req.originalUrl} ${res.statusCode} ${ms.toFixed(1)}ms`);
    });
    next();
}
