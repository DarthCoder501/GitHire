/**
 * SpeechAudioManager
 *
 * Manages TTS audio playback for the robot speech bubble.
 * Handles:
 *  - AudioContext lifecycle (resume on user gesture, close on dispose)
 *  - Fetch from /api/speak, decode, get exact duration
 *  - Play / cancel / replay
 *  - Mute state persisted in localStorage
 *  - Protection against double-talk (hard cancel before new play)
 */

type PlaybackState = "idle" | "loading" | "playing" | "done" | "error";

export interface SpeechAudioCallbacks {
  onStateChange: (state: PlaybackState) => void;
  /** Called once the audio is decoded with the exact duration in seconds */
  onReady: (durationSec: number) => void;
  /** Called when playback finishes naturally (not cancelled) */
  onEnd: () => void;
}

const MUTE_KEY = "githire_mute";

export class SpeechAudioManager {
  private ctx: AudioContext | null = null;
  private sourceNode: AudioBufferSourceNode | null = null;
  private buffer: AudioBuffer | null = null;
  private abortController: AbortController | null = null;
  private state: PlaybackState = "idle";
  private callbacks: SpeechAudioCallbacks | null = null;
  private _muted: boolean = false;

  constructor() {
    if (typeof window !== "undefined") {
      this._muted = localStorage.getItem(MUTE_KEY) === "1";
    }
  }

  /* ── Public getters ── */

  get muted() {
    return this._muted;
  }

  get currentState() {
    return this.state;
  }

  get duration(): number {
    return this.buffer?.duration ?? 0;
  }

  /* ── Public API ── */

  /** Must be called once during a user gesture (click) to satisfy autoplay policy */
  ensureContext(): void {
    if (!this.ctx || this.ctx.state === "closed") {
      this.ctx = new (
        window.AudioContext || (window as any).webkitAudioContext
      )();
    }
    if (this.ctx.state === "suspended") {
      this.ctx.resume();
    }
  }

  setCallbacks(cb: SpeechAudioCallbacks) {
    this.callbacks = cb;
  }

  toggleMute(): boolean {
    this._muted = !this._muted;
    localStorage.setItem(MUTE_KEY, this._muted ? "1" : "0");
    return this._muted;
  }

  /**
   * Fetch TTS audio, decode it, then call onReady with the duration.
   * Does NOT start playback; call `play()` after this resolves.
   */
  async load(text: string): Promise<number> {
    // Hard-cancel any previous
    this.cancel();
    this.ensureContext();

    this.setState("loading");
    this.abortController = new AbortController();

    try {
      const res = await fetch("/api/speak", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
        signal: this.abortController.signal,
      });

      if (!res.ok) throw new Error(`TTS fetch ${res.status}`);

      const arrayBuf = await res.arrayBuffer();
      this.buffer = await this.ctx!.decodeAudioData(arrayBuf);

      const dur = this.buffer.duration;
      this.callbacks?.onReady(dur);
      return dur;
    } catch (err: any) {
      if (err.name === "AbortError") {
        this.setState("idle");
        return 0;
      }
      console.error("SpeechAudioManager.load:", err);
      this.setState("error");
      throw err;
    }
  }

  /** Start playback (assumes `load()` already completed) */
  play(): void {
    if (!this.ctx || !this.buffer) return;
    if (this._muted) {
      this.setState("done");
      this.callbacks?.onEnd();
      return;
    }

    // Cancel any prior source
    this.stopSource();

    this.sourceNode = this.ctx.createBufferSource();
    this.sourceNode.buffer = this.buffer;
    this.sourceNode.connect(this.ctx.destination);

    this.sourceNode.onended = () => {
      this.setState("done");
      this.callbacks?.onEnd();
    };

    this.sourceNode.start(0);
    this.setState("playing");
  }

  /** Replay the same buffer */
  replay(): void {
    if (!this.buffer) return;
    this.play();
    // re-trigger the text animation via callback
    this.callbacks?.onReady(this.buffer.duration);
  }

  /** Hard-cancel everything: abort fetch, stop audio, reset */
  cancel(): void {
    this.abortController?.abort();
    this.abortController = null;
    this.stopSource();
    this.buffer = null;
    this.setState("idle");
  }

  dispose(): void {
    this.cancel();
    if (this.ctx && this.ctx.state !== "closed") {
      this.ctx.close().catch(() => {});
    }
    this.ctx = null;
    this.callbacks = null;
  }

  /* ── Private helpers ── */

  private stopSource() {
    if (this.sourceNode) {
      try {
        this.sourceNode.stop();
        this.sourceNode.disconnect();
      } catch (_) {}
      this.sourceNode = null;
    }
  }

  private setState(s: PlaybackState) {
    this.state = s;
    this.callbacks?.onStateChange(s);
  }
}

/* Singleton */
let instance: SpeechAudioManager | null = null;
export function getSpeechAudioManager(): SpeechAudioManager {
  if (!instance) instance = new SpeechAudioManager();
  return instance;
}
