/**
 * HyperBeam Aerospace Audio Synthesizer
 * Uses Web Audio API oscillator synthesis for futuristic cyber UI cues.
 */

class AudioSynthesizer {
  private ctx: AudioContext | null = null;
  private enabled: boolean = true;

  constructor() {
    const saved = localStorage.getItem('hyperbeam_audio_enabled');
    if (saved !== null) {
      this.enabled = saved === 'true';
    }
  }

  private initCtx(): AudioContext | null {
    if (!this.ctx && typeof window !== 'undefined') {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
    return this.ctx;
  }

  public isEnabled(): boolean {
    return this.enabled;
  }

  public toggle(): boolean {
    this.enabled = !this.enabled;
    localStorage.setItem('hyperbeam_audio_enabled', String(this.enabled));
    if (this.enabled) {
      this.playLock();
    }
    return this.enabled;
  }

  public playBeep(freq = 880, duration = 0.08, type: OscillatorType = 'sine'): void {
    if (!this.enabled) return;
    try {
      const ctx = this.initCtx();
      if (!ctx) return;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, ctx.currentTime);
      gain.gain.setValueAtTime(0.04, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + duration);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + duration);
    } catch {
      // Audio context may be restricted before user gesture
    }
  }

  public playLock(): void {
    if (!this.enabled) return;
    this.playBeep(1200, 0.05, 'triangle');
    setTimeout(() => this.playBeep(1800, 0.08, 'sine'), 60);
  }

  public playChunk(): void {
    if (!this.enabled) return;
    this.playBeep(940, 0.03, 'sine');
  }

  public playComplete(): void {
    if (!this.enabled) return;
    this.playBeep(523.25, 0.1, 'sine');
    setTimeout(() => this.playBeep(659.25, 0.1, 'sine'), 100);
    setTimeout(() => this.playBeep(783.99, 0.12, 'sine'), 200);
    setTimeout(() => this.playBeep(1046.5, 0.25, 'triangle'), 300);
  }

  public playAlert(): void {
    if (!this.enabled) return;
    this.playBeep(350, 0.15, 'sawtooth');
    setTimeout(() => this.playBeep(280, 0.2, 'sawtooth'), 150);
  }
}

export const soundEffects = new AudioSynthesizer();
