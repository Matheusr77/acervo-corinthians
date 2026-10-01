/**
 * Funções puras de cálculo estatístico (sem acesso ao banco).
 */

/**
 * Aproveitamento em pontos: (V×3 + E) / (jogos×3), em porcentagem com 1 casa.
 * @param {{ vitorias: number, empates: number, derrotas: number }} r
 * @returns {number | null} null quando não há jogos com resultado
 */
export function calcularAproveitamento({ vitorias, empates, derrotas }) {
    const jogos = vitorias + empates + derrotas;
    if (jogos === 0) return null;
    return Math.round(((vitorias * 3 + empates) / (jogos * 3)) * 1000) / 10;
}

/**
 * Normaliza uma linha agregada vinda do SQL para o formato da API.
 * @param {Record<string, any>} row
 */
export function montarResumo(row) {
    const vitorias = Number(row?.vitorias ?? 0);
    const empates = Number(row?.empates ?? 0);
    const derrotas = Number(row?.derrotas ?? 0);
    const golsPro = Number(row?.gols_pro ?? 0);
    const golsContra = Number(row?.gols_contra ?? 0);

    return {
        jogos: Number(row?.jogos ?? 0),
        vitorias,
        empates,
        derrotas,
        golsPro,
        golsContra,
        saldo: golsPro - golsContra,
        aproveitamento: calcularAproveitamento({ vitorias, empates, derrotas }),
    };
}

/**
 * Calcula as maiores sequências a partir de jogos em ordem cronológica.
 *
 * @param {{ id: number, data: string, resultado: 'V'|'E'|'D'|null }[]} jogos
 * @returns {{
 *   vitorias: Sequencia | null,
 *   invencibilidade: Sequencia | null,
 *   semVencer: Sequencia | null
 * }}
 *
 * @typedef {{ tamanho: number, inicio: string, fim: string }} Sequencia
 */
export function calcularSequencias(jogos) {
    const regras = {
        vitorias: (r) => r === 'V',
        invencibilidade: (r) => r === 'V' || r === 'E',
        semVencer: (r) => r === 'E' || r === 'D',
    };

    const resultado = {};

    for (const [nome, condicao] of Object.entries(regras)) {
        let melhor = null;
        let atual = null;

        for (const jogo of jogos) {
            if (!jogo.resultado) continue; // jogos sem placar não quebram nem estendem

            if (condicao(jogo.resultado)) {
                atual = atual
                    ? { ...atual, tamanho: atual.tamanho + 1, fim: jogo.data }
                    : { tamanho: 1, inicio: jogo.data, fim: jogo.data };

                if (!melhor || atual.tamanho > melhor.tamanho) melhor = atual;
            } else {
                atual = null;
            }
        }

        resultado[nome] = melhor;
    }

    return resultado;
}

/**
 * Sequência em andamento: quantos jogos seguidos, contando do mais recente para
 * trás, atendem à condição. Jogos sem placar são ignorados.
 *
 * @param {{ data: string, resultado: 'V'|'E'|'D'|null }[]} jogos - ordem cronológica
 * @param {(r: 'V'|'E'|'D') => boolean} condicao
 * @returns {{ tamanho: number, inicio: string | null, fim: string | null }}
 */
export function sequenciaAtual(jogos, condicao) {
    let tamanho = 0;
    let inicio = null;
    let fim = null;
    for (let i = jogos.length - 1; i >= 0; i -= 1) {
        const r = jogos[i].resultado;
        if (!r) continue;
        if (!condicao(r)) break;
        tamanho += 1;
        inicio = jogos[i].data;
        fim ??= jogos[i].data;
    }
    return { tamanho, inicio, fim };
}

export const CONDICOES = Object.freeze({
    invicto: (r) => r !== 'D',
    vitorias: (r) => r === 'V',
    semVencer: (r) => r !== 'V',
    derrotas: (r) => r === 'D',
});
