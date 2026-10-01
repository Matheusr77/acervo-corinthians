/**
 * Quiz diário: 5 perguntas geradas a partir do acervo.
 *
 * A data é a semente do sorteio, então todo mundo recebe as mesmas perguntas
 * no mesmo dia (dá para comparar o resultado com os amigos).
 */

import { CLASSICOS } from '../config/classicos.js';
import * as jogosRepo from '../repositories/jogosRepository.js';
import { mapearJogo } from '../repositories/mappers.js';
import { criarAleatorio, hashTexto } from '../utils/aleatorio.js';
import { comCache } from '../utils/cache.js';
import * as estatisticasService from './estatisticasService.js';
import * as titulosService from './titulosService.js';

const NOMES_CLASSICOS = new Set(CLASSICOS.flatMap((c) => c.times.map((t) => t.nome)));
const MINIMO_JOGOS_TEMPORADA = 30;

const data = (iso) => iso.split('-').reverse().join('/');
const ordinal = (n) => `${n}º`;

/** Todos os jogos mapeados (base do quiz), com cache longo. */
function todosOsJogos() {
    return comCache('quiz:jogos', async () => (await jogosRepo.listarRecentes(100000)).map(mapearJogo), 60 * 60 * 1000);
}

/**
 * Monta a pergunta com as alternativas embaralhadas.
 * @param {ReturnType<typeof criarAleatorio>} rnd
 * @param {{ tipo: string, pergunta: string, correta: string, erradas: string[], explicacao: string, link: string }} p
 */
function montar(rnd, p) {
    const opcoes = rnd.embaralhar([p.correta, ...p.erradas.slice(0, 3)]);
    return {
        tipo: p.tipo,
        pergunta: p.pergunta,
        opcoes,
        correta: opcoes.indexOf(p.correta),
        explicacao: p.explicacao,
        link: p.link,
    };
}

/** Alternativas numéricas próximas da resposta (sem repetir e sem negativos). */
function numerosProximos(rnd, correto, deslocamentos) {
    const candidatos = rnd.embaralhar(deslocamentos).map((d) => correto + d);
    return [...new Set(candidatos.filter((n) => n >= 0 && n !== correto))].slice(0, 3).map(String);
}

/** 1) Placar de um clássico ou jogo de título. */
function perguntaPlacar(rnd, jogos) {
    const marcantes = jogos.filter(
        (j) => j.golsPro !== null && (j.jogoDoTitulo || NOMES_CLASSICOS.has(j.adversario.nome)),
    );
    const j = rnd.escolher(marcantes);
    const placar = (m, v) => `${j.mandante.nome} ${m} x ${v} ${j.visitante.nome}`;
    const erradas = new Set();
    for (const [dm, dv] of rnd.embaralhar([
        [1, 0],
        [0, 1],
        [-1, 0],
        [0, -1],
        [1, 1],
        [2, 0],
        [0, 2],
        [-1, 1],
        [1, -1],
    ])) {
        const m = j.placar.mandante + dm;
        const v = j.placar.visitante + dv;
        if (m >= 0 && v >= 0) erradas.add(placar(m, v));
    }
    return {
        tipo: 'placar',
        pergunta: `Quanto terminou ${j.mandante.nome} x ${j.visitante.nome} em ${data(j.data)}, pelo ${j.campeonato?.nome ?? 'jogo'}?`,
        correta: placar(j.placar.mandante, j.placar.visitante),
        erradas: [...erradas],
        explicacao: j.jogoDoTitulo
            ? `🏆 ${j.observacoes}`
            : `${j.campeonato?.nome ?? ''}${j.fase ? ` · ${j.fase}` : ''}`,
        link: `/jogos/${j.id}`,
    };
}

/** 2) Quem era o adversário de uma goleada. */
function perguntaAdversario(rnd, jogos, adversarios) {
    const goleadas = jogos.filter((j) => j.resultado === 'V' && j.golsPro - j.golsContra >= 3);
    const j = rnd.escolher(goleadas);
    const frequentes = adversarios
        .slice(0, 40)
        .map((a) => a.nome)
        .filter((n) => n !== j.adversario.nome);
    return {
        tipo: 'adversario',
        pergunta: `Em ${data(j.data)}, o Corinthians venceu por ${j.golsPro} x ${j.golsContra}. Quem era o adversário?`,
        correta: j.adversario.nome,
        erradas: rnd.embaralhar(frequentes),
        explicacao: `${j.campeonato?.nome ?? ''}${j.estadio ? ` · ${j.estadio.nome}` : ''}`,
        link: `/jogos/${j.id}`,
    };
}

/** 3) Ano de um título (o N-ésimo de uma competição). */
function perguntaTitulo(rnd, titulos) {
    const competicoes = titulos.categorias.filter((c) => c.principal).flatMap((c) => c.competicoes);
    const competicao = rnd.escolher(competicoes);
    const indice = Math.floor(rnd.proximo() * competicao.conquistas.length);
    const conquista = competicao.conquistas[indice];
    const outrasEdicoes = new Set(competicao.conquistas.map((c) => c.edicao));
    const deslocamentos = [-12, -9, -7, -5, -4, -3, -2, 2, 3, 4, 5, 7, 9, 12];
    const erradas = rnd
        .embaralhar(deslocamentos)
        .map((d) => conquista.edicao + d)
        .filter((ano) => !outrasEdicoes.has(ano) && ano <= new Date().getFullYear())
        .map(String);
    const qual = competicao.conquistas.length === 1 ? 'o' : `o ${ordinal(indice + 1)}`;
    return {
        tipo: 'titulo',
        pergunta: `Em que ano o Corinthians conquistou ${qual} título de ${competicao.nome}?`,
        correta: String(conquista.edicao),
        erradas,
        explicacao: conquista.jogo.observacoes ?? '',
        link: '/titulos',
    };
}

/** 4) Quantas vitórias em uma temporada. */
function perguntaTemporada(rnd, temporadas) {
    const t = rnd.escolher(temporadas.filter((x) => x.jogos >= MINIMO_JOGOS_TEMPORADA));
    return {
        tipo: 'temporada',
        pergunta: `Em ${t.ano}, o Corinthians fez ${t.jogos} jogos. Quantos ele venceu?`,
        correta: String(t.vitorias),
        erradas: numerosProximos(rnd, t.vitorias, [-9, -6, -4, -3, 3, 4, 6, 9]),
        explicacao: `${t.vitorias}V ${t.empates}E ${t.derrotas}D em ${t.ano}.`,
        link: `/temporadas/${t.ano}`,
    };
}

/** 5) Adversário mais enfrentado em uma década. */
function perguntaDecada(rnd, jogos) {
    const porDecada = new Map();
    for (const j of jogos) {
        const d = Math.floor(Number(j.data.slice(0, 4)) / 10) * 10;
        if (!porDecada.has(d)) porDecada.set(d, new Map());
        const m = porDecada.get(d);
        m.set(j.adversario.nome, (m.get(j.adversario.nome) ?? 0) + 1);
    }
    // Só décadas com um "mais enfrentado" sem empate
    const decadas = [...porDecada.entries()]
        .map(([d, m]) => [d, [...m.entries()].sort((a, b) => b[1] - a[1])])
        .filter(([, ranking]) => ranking.length >= 4 && ranking[0][1] > ranking[1][1]);
    const [decada, ranking] = rnd.escolher(decadas);
    return {
        tipo: 'decada',
        pergunta: `Qual adversário o Corinthians mais enfrentou nos anos ${decada}?`,
        correta: ranking[0][0],
        erradas: ranking.slice(1, 4).map(([nome]) => nome),
        explicacao: `${ranking[0][0]}: ${ranking[0][1]} jogos nos anos ${decada}.`,
        link: '/adversarios',
    };
}

/**
 * Quiz de um dia.
 * @param {string} dia - 'AAAA-MM-DD'
 */
export function doDia(dia) {
    return comCache(`quiz:${dia}`, async () => {
        const [jogos, adversarios, titulos, temporadas] = await Promise.all([
            todosOsJogos(),
            estatisticasService.adversarios(null),
            titulosService.titulos(),
            estatisticasService.temporadas(),
        ]);
        const rnd = criarAleatorio(hashTexto(`acervo-corinthians:${dia}`));
        const perguntas = [
            perguntaPlacar(rnd, jogos),
            perguntaAdversario(rnd, jogos, adversarios),
            perguntaTitulo(rnd, titulos),
            perguntaTemporada(rnd, temporadas),
            perguntaDecada(rnd, jogos),
        ].map((p) => montar(rnd, p));

        return { dia, perguntas: rnd.embaralhar(perguntas) };
    });
}
