/**
 * Conversão das linhas do banco (snake_case) para o formato da API (camelCase).
 */

import { escudoDoTime } from '../services/escudosService.js';
import { ehJogoDeTitulo } from '../utils/titulos.js';

/** Nomes usados pelo scraping quando o dado não existia na fonte (ex.: "Estádio nao encontrado"). */
const PLACEHOLDER = /n[aã]o (encontrad|informad)/i;

/**
 * Indica se um texto vindo do banco é um marcador de "dado não encontrado".
 * @param {string | null | undefined} texto
 */
export function ehPlaceholder(texto) {
    return !texto || PLACEHOLDER.test(texto);
}

/**
 * @param {Record<string, any>} row - Linha com COLUNAS_JOGO
 */
export function mapearJogo(row) {
    const emCasa = Boolean(row.em_casa);
    const mandante = {
        id: row.id_mandante,
        nome: row.mandante_nome,
        sigla: row.mandante_sigla,
        escudo: escudoDoTime(row.id_mandante),
    };
    const visitante = {
        id: row.id_visitante,
        nome: row.visitante_nome,
        sigla: row.visitante_sigla,
        escudo: escudoDoTime(row.id_visitante),
    };

    return {
        id: row.id_jogo,
        data: row.data,
        horario: row.horario ? String(row.horario).slice(0, 5) : null,
        fase: row.fase || null,
        campeonato: row.id_campeonato
            ? {
                  id: row.id_campeonato,
                  nome: row.campeonato_nome,
                  temporada: row.campeonato_temporada ?? null,
                  tipo: row.campeonato_tipo ?? null,
              }
            : null,
        estadio: !ehPlaceholder(row.estadio_nome)
            ? {
                  id: row.id_estadio,
                  nome: row.estadio_nome,
                  cidade: row.estadio_cidade ?? null,
                  pais: row.estadio_pais ?? null,
              }
            : null,
        mandante,
        visitante,
        adversario: emCasa ? visitante : mandante,
        placar: {
            mandante: row.gols_mandante,
            visitante: row.gols_visitante,
            penaltisMandante: row.penaltis_mandante ?? null,
            penaltisVisitante: row.penaltis_visitante ?? null,
        },
        emCasa,
        golsPro: row.gols_pro,
        golsContra: row.gols_contra,
        resultado: row.resultado,
        publico: row.publico ?? null,
        arbitro: row.arbitro || null,
        observacoes: row.observacoes || null,
        jogoDoTitulo: ehJogoDeTitulo(row.observacoes),
    };
}
