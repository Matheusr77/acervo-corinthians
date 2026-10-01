/**
 * Títulos conquistados, extraídos das observações dos jogos decisivos.
 */

import * as statsRepo from '../repositories/estatisticasRepository.js';
import { mapearJogo } from '../repositories/mappers.js';
import { comCache } from '../utils/cache.js';
import { montarTitulos } from '../utils/titulos.js';

/** Sala de troféus completa + índice de títulos por ano. */
export function titulos() {
    return comCache('titulos', async () => {
        const rows = await statsRepo.jogosComMencaoATitulo();
        return montarTitulos(rows.map(mapearJogo));
    });
}
