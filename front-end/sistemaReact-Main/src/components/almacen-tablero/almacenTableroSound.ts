const SILENCE_KEY = "almacen_silencio_hasta_ms";

export function getSilenceUntilMs(): number {
  try {
    const raw = localStorage.getItem(SILENCE_KEY);
    if (!raw) return 0;
    const n = Number(raw);
    return Number.isFinite(n) ? n : 0;
  } catch {
    return 0;
  }
}

export function setSilence15Min(): void {
  const hasta = Date.now() + 15 * 60 * 1000;
  try {
    localStorage.setItem(SILENCE_KEY, String(hasta));
  } catch {
    /* ignore */
  }
}

/** Tres tonos cortos; ignora errores de autoplay */
export async function playKioskChime(): Promise<void> {
  if (Date.now() < getSilenceUntilMs()) return;
  try {
    const AC = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AC) return;
    const ctx = new AC();
    if (ctx.state === "suspended") {
      await ctx.resume().catch(() => undefined);
    }
    const now = ctx.currentTime;
    const beep = (t0: number, freq: number) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.001, t0);
      gain.gain.exponentialRampToValueAtTime(0.2, t0 + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, t0 + 0.18);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(t0);
      osc.stop(t0 + 0.2);
    };
    beep(now + 0.05, 880);
    beep(now + 0.28, 660);
    beep(now + 0.5, 880);
    setTimeout(() => {
      ctx.close().catch(() => undefined);
    }, 900);
  } catch {
    /* autoplay u otro */
  }
}
