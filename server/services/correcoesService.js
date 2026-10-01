/**
 * "Achou um erro? Avise": correções enviadas pela torcida.
 *
 * Os avisos ficam num arquivo JSON Lines (um aviso por linha) em DATA_DIR,
 * sem tabela nova no banco. Cada mudança de status é gravada como uma nova
 * linha ({ id, status, atualizadoEm }), então o arquivo só cresce por append
 * e nunca é reescrito: a leitura junta tudo e fica com o estado mais recente.
 *
 * Privacidade: o e-mail é opcional, só aparece no painel de administração
 * e o IP de quem envia nunca é gravado (só fica em memória, para o limite de envios).
 */

import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import config from '../config/index.js';
import { HttpError } from '../utils/httpError.js';

export const TIPOS = Object.freeze({
    placar: 'Placar',
    data: 'Data',
    adversario: 'Adversário',
    estadio: 'Estádio / cidade',
    campeonato: 'Campeonato',
    fase: 'Fase / rodada',
    observacao: 'Observação / título',
    outro: 'Outro',
});
export const STATUS = Object.freeze(['aberta', 'aceita', 'recusada']);

const LIMITES = Object.freeze({ descricaoMin: 10, descricao: 1000, sugestao: 300, nome: 60, email: 120, pagina: 200 });
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Texto livre: remove caracteres de controle (menos quebra de linha) e espaços nas pontas. */
function limpar(valor) {
    if (typeof valor !== 'string') return '';
    // eslint-disable-next-line no-control-regex
    return valor.replace(/[\u0000-\u0009\u000B-\u001F\u007F]/g, '').trim();
}

/**
 * Valida e normaliza o que veio do formulário.
 * @param {any} corpo
 * @returns {{ tipo: string, descricao: string, sugestao: string | null, nome: string | null, email: string | null, pagina: string, jogoId: number | null }}
 */
export function validarCorrecao(corpo) {
    const c = corpo && typeof corpo === 'object' ? corpo : {};
    const erros = {};

    const tipo = typeof c.tipo === 'string' && Object.hasOwn(TIPOS, c.tipo) ? c.tipo : null;
    if (!tipo) erros.tipo = 'Escolha o tipo do erro.';

    const descricao = limpar(c.descricao);
    if (descricao.length < LIMITES.descricaoMin) erros.descricao = 'Conte um pouco mais sobre o erro.';
    else if (descricao.length > LIMITES.descricao) erros.descricao = `Use no máximo ${LIMITES.descricao} caracteres.`;

    const sugestao = limpar(c.sugestao);
    if (sugestao.length > LIMITES.sugestao) erros.sugestao = `Use no máximo ${LIMITES.sugestao} caracteres.`;

    const nome = limpar(c.nome);
    if (nome.length > LIMITES.nome) erros.nome = `Use no máximo ${LIMITES.nome} caracteres.`;

    const email = limpar(c.email).toLowerCase();
    if (email && (email.length > LIMITES.email || !EMAIL.test(email))) erros.email = 'E-mail inválido.';

    const pagina = limpar(c.pagina);
    const paginaValida = pagina.startsWith('/') && !pagina.startsWith('//') && pagina.length <= LIMITES.pagina;

    let jogoId = null;
    if (c.jogoId !== undefined && c.jogoId !== null && c.jogoId !== '') {
        const n = Number(c.jogoId);
        if (Number.isSafeInteger(n) && n > 0) jogoId = n;
    }

    if (Object.keys(erros).length) throw HttpError.badRequest('Confira os campos do formulário.', erros);

    return {
        tipo,
        descricao,
        sugestao: sugestao || null,
        nome: nome || null,
        email: email || null,
        pagina: paginaValida ? pagina : '/',
        jogoId,
    };
}

// ---------------------------------------------------------------------------
// Limite de envios por IP (em memória; o IP nunca é gravado)
// ---------------------------------------------------------------------------

const JANELA_MS = 15 * 60 * 1000;
const MAX_POR_JANELA = 5;
const envios = new Map();

/**
 * Registra um envio e diz se ainda está dentro do limite.
 * @param {string} chave - IP de quem envia
 * @param {number} [agora]
 */
export function dentroDoLimite(chave, agora = Date.now()) {
    const recentes = (envios.get(chave) ?? []).filter((t) => agora - t < JANELA_MS);
    if (recentes.length >= MAX_POR_JANELA) {
        envios.set(chave, recentes);
        return false;
    }
    recentes.push(agora);
    envios.set(chave, recentes);
    // Limpeza ocasional para o Map não crescer sem limite
    if (envios.size > 5000) {
        for (const [k, tempos] of envios) if (!tempos.some((t) => agora - t < JANELA_MS)) envios.delete(k);
    }
    return true;
}

/** Só para os testes. */
export function _zerarLimites() {
    envios.clear();
}

// ---------------------------------------------------------------------------
// Armazenamento (JSON Lines)
// ---------------------------------------------------------------------------

const arquivo = () => path.join(config.paths.dados, 'correcoes.jsonl');

/** Gravações em fila: duas requisições ao mesmo tempo nunca intercalam linhas. */
let fila = Promise.resolve();
function anexar(registro) {
    const tarefa = fila.then(async () => {
        await fs.mkdir(config.paths.dados, { recursive: true });
        await fs.appendFile(arquivo(), `${JSON.stringify(registro)}\n`, 'utf8');
    });
    fila = tarefa.catch(() => {});
    return tarefa;
}

/**
 * Junta as linhas do arquivo: avisos novos + atualizações de status.
 * @param {string} conteudo
 */
export function lerLinhas(conteudo) {
    const porId = new Map();
    for (const linha of conteudo.split('\n')) {
        if (!linha.trim()) continue;
        let r;
        try {
            r = JSON.parse(linha);
        } catch {
            continue; // linha corrompida (ex.: gravação interrompida): ignora
        }
        if (!r?.id) continue;
        if (r.descricao) porId.set(r.id, { status: 'aberta', ...r });
        else if (porId.has(r.id) && STATUS.includes(r.status)) {
            Object.assign(porId.get(r.id), { status: r.status, atualizadoEm: r.atualizadoEm });
        }
    }
    return [...porId.values()].sort((a, b) => b.criadoEm.localeCompare(a.criadoEm));
}

async function todas() {
    await fila;
    try {
        return lerLinhas(await fs.readFile(arquivo(), 'utf8'));
    } catch (err) {
        if (err.code === 'ENOENT') return [];
        throw err;
    }
}

/**
 * Grava um aviso novo.
 * @param {unknown} corpo - dados do formulário
 */
export async function registrar(corpo) {
    const dados = validarCorrecao(corpo);
    const registro = { id: crypto.randomUUID(), criadoEm: new Date().toISOString(), status: 'aberta', ...dados };
    await anexar(registro);
    return { id: registro.id };
}

/**
 * Lista os avisos (mais recentes primeiro).
 * @param {string} [status]
 */
export async function listar(status) {
    if (status !== undefined && status !== '' && !STATUS.includes(status)) {
        throw HttpError.badRequest('Status inválido.');
    }
    const lista = await todas();
    const contagem = Object.fromEntries(STATUS.map((s) => [s, lista.filter((c) => c.status === s).length]));
    return {
        tipos: TIPOS,
        contagem,
        correcoes: status ? lista.filter((c) => c.status === status) : lista,
    };
}

/**
 * Muda o status de um aviso.
 * @param {string} id
 * @param {unknown} status
 */
export async function atualizarStatus(id, status) {
    if (typeof status !== 'string' || !STATUS.includes(status)) throw HttpError.badRequest('Status inválido.');
    const atual = (await todas()).find((c) => c.id === id);
    if (!atual) throw HttpError.notFound('Correção não encontrada.');
    const atualizadoEm = new Date().toISOString();
    await anexar({ id, status, atualizadoEm });
    return { ...atual, status, atualizadoEm };
}

// ---------------------------------------------------------------------------
// Acesso ao painel
// ---------------------------------------------------------------------------

/**
 * Compara o token recebido com ADMIN_TOKEN em tempo constante.
 * @param {string | undefined} recebido
 * @param {string | null} esperado
 */
export function tokenValido(recebido, esperado) {
    if (!esperado || typeof recebido !== 'string') return false;
    const a = crypto.createHash('sha256').update(recebido).digest();
    const b = crypto.createHash('sha256').update(esperado).digest();
    return crypto.timingSafeEqual(a, b);
}
