/** The sound effects the game can play. */
export type SoundEffect = 'place' | 'win' | 'lose' | 'draw';

interface Note {
  /** Frequency in Hz. */
  readonly freq: number;
  /** Start offset in seconds. */
  readonly at: number;
  /** Length in seconds. */
  readonly length: number;
}

const VOLUME = 0.12;

const EFFECTS: Record<SoundEffect, { readonly type: OscillatorType; readonly notes: readonly Note[] }> = {
  place: { type: 'triangle', notes: [{ freq: 660, at: 0, length: 0.07 }] },
  win: {
    type: 'triangle',
    notes: [
      { freq: 523.25, at: 0, length: 0.12 },
      { freq: 659.25, at: 0.1, length: 0.12 },
      { freq: 783.99, at: 0.2, length: 0.12 },
      { freq: 1046.5, at: 0.3, length: 0.28 },
    ],
  },
  lose: {
    type: 'sine',
    notes: [
      { freq: 392, at: 0, length: 0.16 },
      { freq: 311.13, at: 0.15, length: 0.16 },
      { freq: 233.08, at: 0.3, length: 0.32 },
    ],
  },
  draw: {
    type: 'sine',
    notes: [
      { freq: 440, at: 0, length: 0.12 },
      { freq: 440, at: 0.16, length: 0.16 },
    ],
  },
};

/**
 * Tiny synthesizer built on the Web Audio API — no audio files needed.
 * The audio context is created lazily on the first sound, which always follows a
 * user gesture, so browsers allow it to play.
 */
export class Sound {
  private context: AudioContext | null = null;

  constructor(public enabled = false) {}

  /** Plays an effect if sound is enabled and the browser supports Web Audio. */
  play(effect: SoundEffect): void {
    if (!this.enabled) return;
    const ctx = this.getContext();
    if (!ctx) return;
    const { type, notes } = EFFECTS[effect];
    const now = ctx.currentTime;
    for (const note of notes) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = type;
      osc.frequency.value = note.freq;
      const start = now + note.at;
      gain.gain.setValueAtTime(0.0001, start);
      gain.gain.exponentialRampToValueAtTime(VOLUME, start + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + note.length);
      osc.connect(gain).connect(ctx.destination);
      osc.start(start);
      osc.stop(start + note.length + 0.02);
    }
  }

  private getContext(): AudioContext | null {
    if (this.context === null) {
      try {
        this.context = new AudioContext();
      } catch {
        return null;
      }
    }
    if (this.context.state === 'suspended') void this.context.resume();
    return this.context;
  }
}
