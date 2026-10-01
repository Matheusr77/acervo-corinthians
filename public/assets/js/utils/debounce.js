/**
 * Atrasa a execução de `fn` até `delay` ms após a última chamada.
 * @template {(...args: any[]) => void} F
 * @param {F} fn
 * @param {number} delay
 * @returns {F & { cancel: () => void }}
 */
export function debounce(fn, delay) {
    let timer;
    const wrapped = (...args) => {
        clearTimeout(timer);
        timer = setTimeout(() => fn(...args), delay);
    };
    wrapped.cancel = () => clearTimeout(timer);
    return /** @type {any} */ (wrapped);
}
