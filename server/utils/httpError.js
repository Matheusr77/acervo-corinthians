/**
 * Erro HTTP com status e mensagem segura para exibir ao cliente.
 */
export class HttpError extends Error {
    /**
     * @param {number} status - Código HTTP
     * @param {string} message - Mensagem exposta na resposta
     * @param {unknown} [details] - Informações extras (ex.: erros de validação)
     */
    constructor(status, message, details) {
        super(message);
        this.name = 'HttpError';
        this.status = status;
        this.details = details;
    }

    static badRequest(message, details) {
        return new HttpError(400, message, details);
    }

    static notFound(message = 'Recurso não encontrado.') {
        return new HttpError(404, message);
    }
}
