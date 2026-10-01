/**
 * Handlers das correções enviadas pela torcida e do painel de revisão.
 */

import config from '../config/index.js';
import * as correcoes from '../services/correcoesService.js';
import { HttpError } from '../utils/httpError.js';

const semCache = (res) => res.set('Cache-Control', 'no-store');

/** POST /api/correcoes */
export async function enviar(req, res) {
    semCache(res);
    // Campo "armadilha": invisível para pessoas, robôs de spam costumam preencher.
    // Responde como sucesso para o robô não perceber, mas não grava nada.
    if (typeof req.body?.site === 'string' && req.body.site.trim() !== '') {
        return res.status(201).json({ ok: true });
    }
    if (!correcoes.dentroDoLimite(req.ip ?? 'desconhecido')) {
        throw new HttpError(429, 'Muitos avisos seguidos. Tente de novo daqui a alguns minutos.');
    }
    const { id } = await correcoes.registrar(req.body);
    res.status(201).json({ ok: true, id });
}

/** Protege as rotas /api/admin com o ADMIN_TOKEN (cabeçalho Authorization: Bearer ...). */
export function exigirAdmin(req, res, next) {
    semCache(res);
    if (!config.adminToken) {
        throw new HttpError(503, 'Painel desligado: defina ADMIN_TOKEN no arquivo .env.');
    }
    const [tipo, token] = String(req.get('authorization') ?? '').split(' ');
    if (tipo !== 'Bearer' || !correcoes.tokenValido(token, config.adminToken)) {
        throw new HttpError(401, 'Senha do painel inválida.');
    }
    next();
}

/** GET /api/admin/correcoes?status= */
export async function listar(req, res) {
    res.json(await correcoes.listar(typeof req.query.status === 'string' ? req.query.status : undefined));
}

/** PATCH /api/admin/correcoes/:id  { status } */
export async function atualizar(req, res) {
    res.json(await correcoes.atualizarStatus(req.params.id, req.body?.status));
}
