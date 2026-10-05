/**
 * Sons da Disputa de Pênaltis, gerados na hora com Web Audio
 * (sem arquivos): apito, chute, rede, trave e torcida.
 * O áudio só começa depois de um toque (regra dos navegadores).
 */

const CHAVE = 'acervo:penaltis:som';

export function criarSom() {
    /** @type {AudioContext | null} */
    let ac = null;
    /** @type {GainNode | null} */
    let mestre = null;
    /** @type {AudioBuffer | null} */
    let ruido = null;
    /** @type {{ fonte: AudioBufferSourceNode, ganho: GainNode } | null} */
    let ambiente = null;
    let ligado = true;
    try {
        ligado = localStorage.getItem(CHAVE) !== 'off';
    } catch {
        /* sem armazenamento: começa ligado */
    }

    function preparar() {
        if (!ligado) return null;
        const Ctx = window.AudioContext || /** @type {any} */ (window).webkitAudioContext;
        if (!Ctx) return null;
        if (!ac) {
            ac = new Ctx();
            mestre = ac.createGain();
            mestre.gain.value = 0.7;
            mestre.connect(ac.destination);
            ruido = ac.createBuffer(1, ac.sampleRate * 2, ac.sampleRate);
            const d = ruido.getChannelData(0);
            for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
        }
        if (ac.state === 'suspended') ac.resume();
        return ac;
    }

    /** Ruído filtrado com envelope (base da torcida, da rede etc.). */
    function tocarRuido({ freq, q = 1, tipo = 'bandpass', volume, ataque, duracao, loop = false }) {
        const a = preparar();
        if (!a || !ruido || !mestre) return null;
        const fonte = a.createBufferSource();
        fonte.buffer = ruido;
        fonte.loop = loop;
        const filtro = a.createBiquadFilter();
        filtro.type = tipo;
        filtro.frequency.value = freq;
        filtro.Q.value = q;
        const ganho = a.createGain();
        const t = a.currentTime;
        ganho.gain.setValueAtTime(0.0001, t);
        ganho.gain.exponentialRampToValueAtTime(volume, t + ataque);
        if (!loop) ganho.gain.exponentialRampToValueAtTime(0.0001, t + duracao);
        fonte.connect(filtro).connect(ganho).connect(mestre);
        fonte.start(t);
        if (!loop) fonte.stop(t + duracao + 0.05);
        return { fonte, ganho };
    }

    function tom({ freq, freqFim = freq, tipo = 'sine', volume, duracao, inicio = 0 }) {
        const a = preparar();
        if (!a || !mestre) return;
        const t = a.currentTime + inicio;
        const osc = a.createOscillator();
        osc.type = tipo;
        osc.frequency.setValueAtTime(freq, t);
        osc.frequency.exponentialRampToValueAtTime(freqFim, t + duracao);
        const ganho = a.createGain();
        ganho.gain.setValueAtTime(volume, t);
        ganho.gain.exponentialRampToValueAtTime(0.0001, t + duracao);
        osc.connect(ganho).connect(mestre);
        osc.start(t);
        osc.stop(t + duracao + 0.05);
    }

    return {
        get ligado() {
            return ligado;
        },
        alternar() {
            ligado = !ligado;
            try {
                localStorage.setItem(CHAVE, ligado ? 'on' : 'off');
            } catch {
                /* ignora */
            }
            if (!ligado) {
                ambiente?.fonte.stop();
                ambiente = null;
            } else this.ambiente();
            return ligado;
        },
        /** Murmúrio constante da torcida. */
        ambiente() {
            if (ambiente || !ligado) return;
            ambiente = tocarRuido({ freq: 520, q: 0.6, volume: 0.06, ataque: 1.2, duracao: 0, loop: true });
        },
        apito() {
            tom({ freq: 2900, freqFim: 2700, tipo: 'square', volume: 0.05, duracao: 0.16 });
            tom({ freq: 2900, freqFim: 2600, tipo: 'square', volume: 0.05, duracao: 0.32, inicio: 0.2 });
        },
        chute() {
            tom({ freq: 140, freqFim: 45, volume: 0.9, duracao: 0.16 });
            tocarRuido({ freq: 1800, q: 0.8, volume: 0.25, ataque: 0.004, duracao: 0.06 });
        },
        rede() {
            tocarRuido({ freq: 900, q: 0.7, volume: 0.25, ataque: 0.01, duracao: 0.35 });
        },
        trave() {
            tom({ freq: 620, freqFim: 600, tipo: 'triangle', volume: 0.35, duracao: 0.7 });
            tom({ freq: 1490, freqFim: 1450, volume: 0.15, duracao: 0.5 });
        },
        defesa() {
            tom({ freq: 220, freqFim: 90, volume: 0.5, duracao: 0.12 });
        },
        /** Explosão da Fiel (gol ou defesa do Timão). */
        festa() {
            tocarRuido({ freq: 700, q: 0.5, volume: 0.55, ataque: 0.15, duracao: 2.6 });
            tocarRuido({ freq: 1600, q: 0.7, volume: 0.18, ataque: 0.2, duracao: 2.2 });
        },
        /** "Uuuh" de lamento. */
        lamento() {
            tocarRuido({ freq: 300, q: 2.5, tipo: 'bandpass', volume: 0.35, ataque: 0.25, duracao: 1.6 });
        },
        parar() {
            ambiente?.fonte.stop();
            ambiente = null;
            ac?.close();
            ac = null;
        },
    };
}
