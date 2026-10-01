/**
 * Configuração centralizada da aplicação.
 *
 * Lê as variáveis de ambiente (arquivo .env na raiz do projeto), aplica
 * valores padrão e valida o que é obrigatório. Nenhum outro módulo deve
 * acessar `process.env` diretamente.
 */

import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';

const ROOT_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');

dotenv.config({ path: path.join(ROOT_DIR, '.env'), quiet: true });

/**
 * Converte "1, 1014" em [1, 1014] (ignora valores inválidos).
 * @param {string | undefined} value
 * @param {number[]} fallback
 * @returns {number[]}
 */
function toIdList(value, fallback) {
    const ids = String(value ?? '')
        .split(',')
        .map((v) => Number.parseInt(v.trim(), 10))
        .filter((n) => Number.isInteger(n) && n > 0);
    return ids.length ? [...new Set(ids)] : fallback;
}

/**
 * Converte uma variável de ambiente em inteiro positivo.
 * @param {string | undefined} value
 * @param {number} fallback
 * @returns {number}
 */
function toPositiveInt(value, fallback) {
    const parsed = Number.parseInt(value ?? '', 10);
    return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

/**
 * Configuração TLS do MySQL (bancos gerenciados na nuvem exigem conexão segura).
 * - DB_SSL=true ativa o TLS.
 * - DB_SSL_CA recebe o conteúdo do certificado CA (PEM) fornecido pela hospedagem;
 *   quebras de linha podem vir como "\n" literais.
 * @returns {import('mysql2').SslOptions | undefined}
 */
function buildSsl() {
    if (String(process.env.DB_SSL).toLowerCase() !== 'true') return undefined;
    const ca = process.env.DB_SSL_CA?.replace(/\\n/g, '\n').trim();
    return ca ? { ca, rejectUnauthorized: true } : { rejectUnauthorized: false };
}

const env = process.env.NODE_ENV ?? 'development';

const config = Object.freeze({
    env,
    isProduction: env === 'production',
    port: toPositiveInt(process.env.PORT, 3000),

    paths: Object.freeze({
        root: ROOT_DIR,
        public: path.join(ROOT_DIR, 'public'),
        /** Pasta de dados gravados pelo site (correções enviadas pela torcida). */
        dados: path.resolve(ROOT_DIR, process.env.DATA_DIR?.trim() || 'data'),
    }),

    /** Senha do painel /admin/correcoes (sem ela, o painel fica desligado). */
    adminToken: process.env.ADMIN_TOKEN?.trim() || null,

    db: Object.freeze({
        host: process.env.DB_HOST ?? '127.0.0.1',
        port: toPositiveInt(process.env.DB_PORT, 3306),
        user: process.env.DB_USER ?? 'root',
        password: process.env.DB_PASSWORD ?? '',
        database: process.env.DB_NAME,
        connectionLimit: toPositiveInt(process.env.DB_CONNECTION_LIMIT, 10),
        ssl: buildSsl(),
    }),

    /** URL pública do site (ex.: https://acervocorinthians.com.br), usada em links absolutos e no sitemap. */
    siteUrl: process.env.SITE_URL?.trim() || null,

    /**
     * IDs do Corinthians na tabela `time` — referência para todos os cálculos.
     * Aceita mais de um ID (ex.: "1,1014") para cobrir registros duplicados do scraping.
     * `CORINTHIANS_ID` (singular) continua aceito por compatibilidade.
     */
    clubeIds: Object.freeze(toIdList(process.env.CORINTHIANS_IDS ?? process.env.CORINTHIANS_ID, [1])),
});

if (!config.db.database) {
    throw new Error('Variável de ambiente DB_NAME não definida. Copie .env.example para .env e preencha.');
}

export default config;
