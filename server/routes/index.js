/**
 * Rotas da API REST (montadas em /api).
 *
 *  GET /api/health                  → status do servidor e do banco
 *  GET /api/jogos                   → lista paginada (filtros: ano, campeonato, adversario,
 *                                     adversarioId, resultado, mando, ordem, pagina, limite)
 *  GET /api/jogos/filtros           → anos e campeonatos disponíveis
 *  GET /api/jogos/recentes          → últimos jogos (?limite=)
 *  GET /api/jogos/:id               → detalhe + navegação + retrospecto do confronto
 *  GET /api/hoje                    → jogos neste dia do ano em outras temporadas (?dia=MM-DD)
 *  GET /api/minha-historia          → o Corinthians desde uma data (?desde=AAAA-MM-DD)
 *  GET /api/estatisticas/resumo     → números gerais do acervo
 *  GET /api/estatisticas/recordes   → goleadas, públicos, sequências, adversários, estádios
 *  GET /api/temporadas              → desempenho por ano
 *  GET /api/temporadas/:ano         → detalhe de uma temporada
 *  GET /api/adversarios             → retrospecto contra cada adversário (?busca=)
 *  GET /api/adversarios/:id         → retrospecto completo contra um adversário
 *  GET /api/classicos               → Derby, Majestoso e Clássico Alvinegro (placar geral)
 *  GET /api/classicos/:slug         → retrospecto completo de um clássico
 *  GET /api/titulos                 → títulos extraídos das observações dos jogos
 *  GET /api/fregueses               → fregueses, carrascos, tabus e sequências em andamento
 *  GET /api/estadios                → retrospecto em cada estádio
 *  GET /api/mapa                    → jogos por cidade (Brasil), estado e país
 *  GET /api/estadios/:id            → retrospecto completo em um estádio
 *  GET /api/busca?q=                → busca em times, estádios, campeonatos, temporadas e páginas
 *  GET /api/quiz?dia=AAAA-MM-DD     → 5 perguntas do dia (mesmas para todos)
 *  GET /api/escudos/creditos        → autor e licença dos escudos baixados do Wikimedia Commons
 *
 *  POST  /api/correcoes             → "Achou um erro? Avise" (formulário público)
 *  GET   /api/admin/correcoes       → avisos recebidos (?status=aberta|aceita|recusada)  [ADMIN_TOKEN]
 *  PATCH /api/admin/correcoes/:id   → muda o status de um aviso                          [ADMIN_TOKEN]
 */

import express, { Router } from 'express';
import * as correcoes from '../controllers/correcoesController.js';
import * as jogos from '../controllers/jogosController.js';
import * as stats from '../controllers/estatisticasController.js';
import { ping } from '../db/pool.js';
import { creditos as creditosEscudos } from '../services/escudosService.js';

const router = Router();

router.get('/health', async (_req, res) => {
    try {
        await ping();
        res.json({ status: 'ok', banco: 'ok' });
    } catch {
        res.status(503).json({ status: 'erro', banco: 'indisponível' });
    }
});

router.get('/jogos', jogos.listar);
router.get('/jogos/filtros', jogos.filtros);
router.get('/jogos/recentes', jogos.recentes);
router.get('/jogos/:id', jogos.detalhar);

router.get('/hoje', jogos.hoje);
router.get('/minha-historia', jogos.minhaHistoria);

router.get('/estatisticas/resumo', stats.resumo);
router.get('/estatisticas/recordes', stats.recordes);

router.get('/temporadas', stats.temporadas);
router.get('/temporadas/:ano', stats.temporada);

router.get('/adversarios', stats.adversarios);
router.get('/adversarios/:id', stats.adversario);

router.get('/classicos', stats.classicos);
router.get('/classicos/:slug', stats.classico);

router.get('/titulos', stats.titulos);

router.get('/fregueses', stats.rivalidades);
router.get('/estadios', stats.estadios);
router.get('/mapa', stats.mapa);
router.get('/estadios/:id', stats.estadio);
router.get('/busca', stats.busca);
router.get('/quiz', stats.quiz);

router.get('/escudos/creditos', (_req, res) => {
    res.json(creditosEscudos());
});

// Corpo JSON só nas rotas que precisam (e pequeno)
const lerJson = express.json({ limit: '10kb' });
router.post('/correcoes', lerJson, correcoes.enviar);
router.get('/admin/correcoes', correcoes.exigirAdmin, correcoes.listar);
router.patch('/admin/correcoes/:id', correcoes.exigirAdmin, lerJson, correcoes.atualizar);

export default router;
