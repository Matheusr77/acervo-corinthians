/**
 * Controladores HTTP de /api/jogos.
 */

import * as hojeService from '../services/hojeService.js';
import * as jogosService from '../services/jogosService.js';
import * as minhaHistoriaService from '../services/minhaHistoriaService.js';
import { hojeEmSaoPaulo } from '../utils/datas.js';
import { HttpError } from '../utils/httpError.js';
import { parseData, parseDiaMes, parseFiltrosJogos, parseId, parsePaginacao } from '../utils/validators.js';

const LIMITE_RECENTES_MAX = 20;

/** GET /api/jogos */
export async function listar(req, res) {
    const filtros = parseFiltrosJogos(req.query);
    const paginacao = parsePaginacao(req.query);
    res.json(await jogosService.listar(filtros, paginacao));
}

/** GET /api/jogos/filtros */
export async function filtros(_req, res) {
    res.json(await jogosService.opcoesFiltro());
}

/** GET /api/jogos/recentes */
export async function recentes(req, res) {
    const limite = Math.min(Number.parseInt(req.query.limite, 10) || 5, LIMITE_RECENTES_MAX);
    res.json(await jogosService.recentes(limite));
}

/** GET /api/jogos/:id */
export async function detalhar(req, res) {
    res.json(await jogosService.detalhar(parseId(req.params.id)));
}

/** GET /api/hoje?dia=MM-DD (padrão: hoje em São Paulo) */
export async function hoje(req, res) {
    const diaDoAno = req.query.dia ? parseDiaMes(req.query.dia) : hojeEmSaoPaulo();
    res.json(await hojeService.doDia({ mes: diaDoAno.mes, dia: diaDoAno.dia }));
}

/** GET /api/minha-historia?desde=AAAA-MM-DD */
export async function minhaHistoria(req, res) {
    const desde = parseData(req.query.desde, 'desde');
    const { ano, mes, dia } = hojeEmSaoPaulo();
    const hojeIso = `${ano}-${String(mes).padStart(2, '0')}-${String(dia).padStart(2, '0')}`;
    if (desde > hojeIso) throw HttpError.badRequest('A data não pode estar no futuro.');
    res.set('Cache-Control', 'private, max-age=300'); // a data é pessoal: não guardar em caches compartilhados
    res.json(await minhaHistoriaService.calcular(desde));
}
