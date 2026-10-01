/**
 * Controladores HTTP de estatísticas, temporadas, adversários, clássicos e títulos.
 */

import * as buscaService from '../services/buscaService.js';
import * as classicosService from '../services/classicosService.js';
import * as estadiosService from '../services/estadiosService.js';
import * as mapaService from '../services/mapaService.js';
import * as statsService from '../services/estatisticasService.js';
import * as quizService from '../services/quizService.js';
import * as rivalidadesService from '../services/rivalidadesService.js';
import * as titulosService from '../services/titulosService.js';
import { hojeEmSaoPaulo } from '../utils/datas.js';
import { HttpError } from '../utils/httpError.js';
import { parseAno, parseBusca, parseData, parseId } from '../utils/validators.js';

/** GET /api/estatisticas/resumo */
export async function resumo(_req, res) {
    res.json(await statsService.resumoGeral());
}

/** GET /api/estatisticas/recordes */
export async function recordes(_req, res) {
    res.json(await statsService.recordes());
}

/** GET /api/temporadas */
export async function temporadas(_req, res) {
    res.json(await statsService.temporadas());
}

/** GET /api/temporadas/:ano */
export async function temporada(req, res) {
    res.json(await statsService.temporada(parseAno(req.params.ano)));
}

/** GET /api/adversarios */
export async function adversarios(req, res) {
    res.json(await statsService.adversarios(parseBusca(req.query.busca)));
}

/** GET /api/adversarios/:id */
export async function adversario(req, res) {
    res.json(await statsService.adversario(parseId(req.params.id)));
}

/** GET /api/titulos */
export async function titulos(_req, res) {
    res.json(await titulosService.titulos());
}

/** GET /api/classicos */
export async function classicos(_req, res) {
    res.json(await classicosService.listar());
}

/** GET /api/classicos/:slug */
export async function classico(req, res) {
    res.json(await classicosService.detalhar(String(req.params.slug).toLowerCase()));
}

/** GET /api/fregueses */
export async function rivalidades(_req, res) {
    res.json(await rivalidadesService.rivalidades());
}

/** GET /api/estadios */
export async function estadios(_req, res) {
    res.json(await estadiosService.listar());
}

/** GET /api/estadios/:id */
export async function estadio(req, res) {
    res.json(await estadiosService.detalhar(parseId(req.params.id)));
}

/** GET /api/busca?q= */
export async function busca(req, res) {
    const termo = parseBusca(req.query.q);
    if (!termo) throw HttpError.badRequest('Informe o termo de busca (?q=).');
    res.json(await buscaService.buscar(termo));
}

/** GET /api/quiz?dia=AAAA-MM-DD (padrão: hoje em São Paulo; datas futuras não são liberadas) */
export async function quiz(req, res) {
    const { ano, mes, dia } = hojeEmSaoPaulo();
    const hoje = `${ano}-${String(mes).padStart(2, '0')}-${String(dia).padStart(2, '0')}`;
    const data = req.query.dia ? parseData(req.query.dia, 'dia') : hoje;
    if (data > hoje) throw HttpError.badRequest('O quiz desse dia ainda não foi liberado. 😉');
    res.json(await quizService.doDia(data));
}

/** GET /api/mapa */
export async function mapa(_req, res) {
    res.json(await mapaService.mapa());
}
