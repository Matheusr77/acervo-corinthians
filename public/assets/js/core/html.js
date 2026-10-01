/**
 * Template tag `html` com escape automático.
 *
 * Todo valor interpolado é escapado, exceto:
 *  - resultados de outro `html\`\`` (componentes aninhados)
 *  - arrays (cada item segue a mesma regra)
 *  - valores embrulhados em `raw()` (use só para conteúdo 100% confiável)
 *
 * Assim nenhum dado vindo da API (nome de time, observação etc.)
 * consegue injetar HTML/JS na página.
 */

class SafeHtml {
    /** @param {string} value */
    constructor(value) {
        this.value = value;
    }

    toString() {
        return this.value;
    }
}

const ESCAPES = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };

/**
 * Escapa caracteres especiais de HTML.
 * @param {unknown} value
 * @returns {string}
 */
export function escapeHtml(value) {
    return String(value).replace(/[&<>"']/g, (c) => ESCAPES[c]);
}

/** @param {unknown} value */
function renderValue(value) {
    if (value === null || value === undefined || value === false) return '';
    if (value instanceof SafeHtml) return value.value;
    if (Array.isArray(value)) return value.map(renderValue).join('');
    return escapeHtml(value);
}

/**
 * @param {TemplateStringsArray} strings
 * @param {...unknown} values
 * @returns {SafeHtml}
 */
export function html(strings, ...values) {
    let out = strings[0];
    for (let i = 0; i < values.length; i += 1) {
        out += renderValue(values[i]) + strings[i + 1];
    }
    return new SafeHtml(out);
}

/**
 * Marca uma string como HTML confiável (sem escape).
 * @param {string} value
 */
export function raw(value) {
    return new SafeHtml(String(value));
}
