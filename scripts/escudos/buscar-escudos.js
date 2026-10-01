/**
 * Baixa escudos dos adversários do Corinthians a partir do Wikidata/Wikimedia Commons.
 *
 * Uso:
 *   npm run escudos                  → os 100 adversários mais enfrentados (≈85% dos jogos)
 *   npm run escudos -- --top 50      → só os 50 primeiros
 *   npm run escudos -- --todos       → todos os adversários
 *   npm run escudos -- --refazer     → baixa de novo mesmo quem já tem escudo
 *
 * Resultado:
 *   public/assets/img/escudos/{id_time}.png      escudos com correspondência confiável (já usados pelo site)
 *   public/assets/img/escudos/_revisar/...        prováveis, para conferir e mover na mão
 *   public/assets/img/escudos/creditos.json       autor e licença de cada imagem
 *   escudos-relatorio.csv                         planilha com o status de cada time (abre no Excel)
 *
 * Escudos que você salvar manualmente na pasta (ex.: 102.png) nunca são sobrescritos,
 * a não ser com --refazer.
 */

import fs from 'node:fs/promises';
import path from 'node:path';
import config from '../../server/config/index.js';
import { close, query } from '../../server/db/pool.js';
import { JOGOS_DO_CLUBE } from '../../server/repositories/sql.js';
import { PASTA_ESCUDOS } from '../../server/services/escudosService.js';
import { escolherClube } from './correspondencia.js';
import { baixarImagem, clubesDoPais, infoDoArquivo } from './wikidata.js';

const PASTA_REVISAR = path.join(PASTA_ESCUDOS, '_revisar');
const ARQUIVO_CREDITOS = path.join(PASTA_ESCUDOS, 'creditos.json');
const ARQUIVO_RELATORIO = path.join(config.paths.root, 'escudos-relatorio.csv');
const LARGURA = 256;
const PAIS_PADRAO = 'Brasil';

function lerArgumentos(argv) {
    const args = { top: 100, todos: false, refazer: false };
    for (let i = 0; i < argv.length; i += 1) {
        if (argv[i] === '--todos') args.todos = true;
        else if (argv[i] === '--refazer') args.refazer = true;
        else if (argv[i] === '--top') args.top = Math.max(1, Number.parseInt(argv[++i], 10) || 100);
    }
    return args;
}

/** Corinthians + adversários, do mais ao menos enfrentado. */
async function timesParaBuscar({ top, todos }) {
    const [clube] = await query('SELECT id_time AS id, nome, cidade, pais FROM time WHERE id_time = :id', {
        id: config.clubeIds[0],
    });
    const adversarios = await query(
        `SELECT t.id_time AS id, t.nome, t.cidade, t.pais, COUNT(*) AS jogos
         FROM (${JOGOS_DO_CLUBE}) jc
         INNER JOIN time t ON t.id_time = jc.id_adversario
         GROUP BY t.id_time, t.nome, t.cidade, t.pais
         ORDER BY jogos DESC, t.nome
         ${todos ? '' : 'LIMIT :limite'}`,
        { clube: config.clubeIds, limite: top },
    );
    return [...(clube ? [{ ...clube, jogos: null }] : []), ...adversarios];
}

async function escudoExistente(id) {
    const arquivos = await fs.readdir(PASTA_ESCUDOS).catch(() => []);
    return arquivos.find((a) => new RegExp(`^${id}\\.(png|svg|webp|jpe?g)$`, 'i').test(a)) ?? null;
}

async function lerCreditos() {
    try {
        return JSON.parse(await fs.readFile(ARQUIVO_CREDITOS, 'utf8'));
    } catch {
        return [];
    }
}

/** Nome de arquivo seguro para a pasta _revisar ("102 - Palmeiras.png"). */
function nomeSeguro(texto) {
    return String(texto)
        .replace(/[\\/:*?"<>|]/g, '')
        .slice(0, 60);
}

/** CSV com ";" e BOM, para abrir certinho no Excel em português. */
function montarCsv(linhas) {
    const cabecalho = [
        'id',
        'time',
        'cidade',
        'jogos',
        'status',
        'motivo',
        'wikidata',
        'arquivo_commons',
        'licenca',
        'pagina_no_site',
    ];
    const celula = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
    return '﻿' + [cabecalho, ...linhas].map((l) => l.map(celula).join(';')).join('\r\n') + '\r\n';
}

async function main() {
    const args = lerArgumentos(process.argv.slice(2));
    if (!process.env.ESCUDOS_CONTATO) {
        console.warn(
            '⚠️  Defina ESCUDOS_CONTATO no .env (ex.: seu e-mail): a Wikimedia pede um contato no User-Agent.\n',
        );
    }

    await fs.mkdir(PASTA_REVISAR, { recursive: true });
    const times = await timesParaBuscar(args);
    console.log(`🔎 ${times.length} times para verificar\n`);

    // Uma consulta ao Wikidata por país (e não por time)
    const clubesPorPais = new Map();
    for (const pais of new Set(times.map((t) => t.pais || PAIS_PADRAO))) {
        try {
            const clubes = await clubesDoPais(pais);
            clubesPorPais.set(pais, clubes);
            console.log(`🌎 ${pais}: ${clubes.length} clubes com escudo no Wikidata`);
        } catch (err) {
            clubesPorPais.set(pais, []);
            console.warn(`⚠️  ${pais}: falha na consulta ao Wikidata (${err.message})`);
        }
    }
    console.log('');

    const creditos = new Map((await lerCreditos()).map((c) => [Number(c.id), c]));
    const relatorio = [];
    const contagem = { ok: 0, revisar: 0, faltando: 0, existente: 0, erro: 0 };

    for (const time of times) {
        const paginaNoSite = config.clubeIds.includes(time.id) ? '' : `/adversarios/${time.id}`;
        const existente = await escudoExistente(time.id);
        if (existente && !args.refazer) {
            contagem.existente += 1;
            relatorio.push([
                time.id,
                time.nome,
                time.cidade,
                time.jogos,
                'já existe',
                existente,
                '',
                '',
                '',
                paginaNoSite,
            ]);
            continue;
        }

        const resultado = escolherClube(time, clubesPorPais.get(time.pais || PAIS_PADRAO) ?? []);
        const linha = [time.id, time.nome, time.cidade, time.jogos, resultado.status, resultado.motivo];

        if (resultado.status === 'faltando') {
            contagem.faltando += 1;
            relatorio.push([...linha, '', '', '', paginaNoSite]);
            console.log(`   ✗ ${time.nome}`);
            continue;
        }

        const { clube } = resultado;
        try {
            const [{ dados, extensao }, info] = await Promise.all([
                baixarImagem(clube.arquivo, LARGURA),
                infoDoArquivo(clube.arquivo),
            ]);
            const destino =
                resultado.status === 'ok'
                    ? path.join(PASTA_ESCUDOS, `${time.id}.${extensao}`)
                    : path.join(PASTA_REVISAR, `${time.id} - ${nomeSeguro(time.nome)}.${extensao}`);
            await fs.writeFile(destino, dados);

            creditos.set(time.id, {
                id: time.id,
                time: time.nome,
                arquivo: clube.arquivo,
                wikidata: `https://www.wikidata.org/wiki/${clube.qid}`,
                ...info,
            });
            contagem[resultado.status] += 1;
            relatorio.push([...linha, clube.qid, clube.arquivo, info.licenca, paginaNoSite]);
            console.log(`   ${resultado.status === 'ok' ? '✓' : '?'} ${time.nome} → ${clube.arquivo}`);
        } catch (err) {
            contagem.erro += 1;
            relatorio.push([
                time.id,
                time.nome,
                time.cidade,
                time.jogos,
                'erro',
                err.message,
                clube.qid,
                clube.arquivo,
                '',
                paginaNoSite,
            ]);
            console.warn(`   ! ${time.nome}: ${err.message}`);
        }
    }

    await fs.writeFile(ARQUIVO_CREDITOS, JSON.stringify([...creditos.values()], null, 2) + '\n');
    await fs.writeFile(ARQUIVO_RELATORIO, montarCsv(relatorio));

    console.log(`
✅ Pronto!
   ${contagem.ok} baixados direto para o site
   ${contagem.revisar} para revisar em public/assets/img/escudos/_revisar/
   ${contagem.faltando} não encontrados
   ${contagem.existente} já tinham escudo${contagem.erro ? `\n   ${contagem.erro} com erro de download` : ''}

📄 Relatório: escudos-relatorio.csv (abra no Excel)`);
}

main()
    .catch((err) => {
        console.error('❌', err.message);
        process.exitCode = 1;
    })
    .finally(() => close());
