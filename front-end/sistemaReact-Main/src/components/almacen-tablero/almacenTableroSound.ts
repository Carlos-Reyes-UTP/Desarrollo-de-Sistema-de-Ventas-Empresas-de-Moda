const SILENCE_KEY = "almacen_silencio_hasta_ms";

export type SoundTheme = "boutique" | "crystal" | "double" | "kiosk" | "mute";

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

export function getSoundTheme(role: "almacen" | "vendedor"): SoundTheme {
  try {
    const raw = localStorage.getItem(`dakani_sound_theme_${role}`);
    if (raw === "boutique" || raw === "crystal" || raw === "double" || raw === "kiosk" || raw === "mute") {
      return raw as SoundTheme;
    }
    return role === "almacen" ? "kiosk" : "boutique";
  } catch {
    return role === "almacen" ? "kiosk" : "boutique";
  }
}

export function setSoundTheme(role: "almacen" | "vendedor", theme: SoundTheme): void {
  try {
    localStorage.setItem(`dakani_sound_theme_${role}`, theme);
  } catch {
    /* ignore */
  }
}

export async function playSoundByTheme(theme: SoundTheme): Promise<void> {
  if (theme === "mute") return;

  try {
    const AC = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AC) return;
    const ctx = new AC();
    if (ctx.state === "suspended") {
      await ctx.resume().catch(() => undefined);
    }
    const now = ctx.currentTime;

    if (theme === "boutique") {
      // Arpegio de acorde mayor (C5, E5, G5, C6) con envolvente suave (estilo boutique de lujo)
      const playTone = (freq: number, startTime: number, duration: number) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "sine";
        osc.frequency.setValueAtTime(freq, startTime);

        // Envolvente de volumen suave ADSR
        gain.gain.setValueAtTime(0.0001, startTime);
        gain.gain.linearRampToValueAtTime(0.12, startTime + 0.08); // ataque suave
        gain.gain.exponentialRampToValueAtTime(0.06, startTime + 0.2); // decaimiento
        gain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration); // liberación suave

        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(startTime);
        osc.stop(startTime + duration + 0.05);
      };

      playTone(523.25, now + 0.02, 0.45); // C5
      playTone(659.25, now + 0.09, 0.45); // E5
      playTone(783.99, now + 0.16, 0.50); // G5
      playTone(1046.50, now + 0.23, 0.60); // C6

      setTimeout(() => {
        ctx.close().catch(() => undefined);
      }, 1000);
    } else if (theme === "crystal") {
      // Un tono agudo y cristalino con un armónico sutil para brillo de vidrio
      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      const gain2 = ctx.createGain();

      osc1.type = "sine";
      osc1.frequency.setValueAtTime(987.77, now); // B5 (cristalino principal)
      gain1.gain.setValueAtTime(0.0001, now);
      gain1.gain.linearRampToValueAtTime(0.15, now + 0.01);
      gain1.gain.exponentialRampToValueAtTime(0.0001, now + 0.5);

      osc2.type = "sine";
      osc2.frequency.setValueAtTime(1975.54, now); // B6 (armónico brillante octava superior)
      gain2.gain.setValueAtTime(0.0001, now);
      gain2.gain.linearRampToValueAtTime(0.03, now + 0.01);
      gain2.gain.exponentialRampToValueAtTime(0.0001, now + 0.25);

      osc1.connect(gain1);
      gain1.connect(ctx.destination);
      osc2.connect(gain2);
      gain2.connect(ctx.destination);

      osc1.start(now);
      osc2.start(now);
      osc1.stop(now + 0.65);
      osc2.stop(now + 0.65);

      setTimeout(() => {
        ctx.close().catch(() => undefined);
      }, 800);
    } else if (theme === "double") {
      // Dos beeps rápidos, limpios y discretos
      const beep = (startTime: number, freq: number) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "sine";
        osc.frequency.setValueAtTime(freq, startTime);

        gain.gain.setValueAtTime(0.0001, startTime);
        gain.gain.linearRampToValueAtTime(0.12, startTime + 0.01);
        gain.gain.exponentialRampToValueAtTime(0.0001, startTime + 0.09);

        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(startTime);
        osc.stop(startTime + 0.12);
      };

      beep(now + 0.02, 987.77); // B5
      beep(now + 0.12, 1318.51); // E6

      setTimeout(() => {
        ctx.close().catch(() => undefined);
      }, 400);
    } else if (theme === "kiosk") {
      // El sonido clásico original de 3 tonos
      const beep = (startTime: number, freq: number) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "sine";
        osc.frequency.setValueAtTime(freq, startTime);

        gain.gain.setValueAtTime(0.001, startTime);
        gain.gain.exponentialRampToValueAtTime(0.18, startTime + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.18);

        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(startTime);
        osc.stop(startTime + 0.20);
      };

      beep(now + 0.05, 880);
      beep(now + 0.28, 660);
      beep(now + 0.50, 880);

      setTimeout(() => {
        ctx.close().catch(() => undefined);
      }, 900);
    }
  } catch (e) {
    console.error("Error playing sound theme:", e);
  }
}

/** Tres tonos cortos (respeta silencio y tema de almacén) */
export async function playKioskChime(): Promise<void> {
  if (Date.now() < getSilenceUntilMs()) return;
  const theme = getSoundTheme("almacen");
  await playSoundByTheme(theme);
}
