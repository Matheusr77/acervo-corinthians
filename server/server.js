/**
 * Ponto de entrada: sobe o servidor HTTP e trata o desligamento.
 */

import config from './config/index.js';
import { createApp } from './app.js';
import { close as closeDb, ping } from './db/pool.js';

const app = createApp();

const server = app.listen(config.port, async () => {
    console.log(`🚀 Acervo Corinthians em http://localhost:${config.port} (${config.env})`);
    try {
        await ping();
        console.log('✅ Conectado ao banco de dados MySQL.');
    } catch (err) {
        console.error(`❌ Não foi possível conectar ao banco: ${err.code ?? ''} ${err.message}`);
    }
});

/** Encerra o servidor e o pool de conexões de forma limpa. */
function shutdown(sinal) {
    console.log(`\n${sinal} recebido, encerrando...`);
    server.close(async () => {
        await closeDb().catch(() => {});
        process.exit(0);
    });
    // Força a saída se algo travar
    setTimeout(() => process.exit(1), 10_000).unref();
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
