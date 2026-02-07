// Handles streaming audio from /api/conversation
// Implements jitter buffer and gap-free playback using AudioContext

export class AudioStreamer {
  private audioContext: AudioContext | null = null;
  private audioQueue: ArrayBuffer[] = [];
  private isPlaying: boolean = false;
  private jitterBufferSize: number = 3; // Wait for 3 chunks before playing
  private nextPlayTime: number = 0;
  private onVolumeUpdate?: (volume: number) => void;

  /** Analyser in *this* context for playback volume (avatar sync). Must match context. */
  private playbackAnalyser: AnalyserNode | null = null;
  private playbackAnalyserData: Uint8Array | null = null;
  private playbackVolume: number = 0;
  private readonly smoothingFactor = 0.1;

  /** Deepgram returns raw PCM: 16-bit LE, 24kHz, mono. We must build AudioBuffer manually. */
  private static readonly PCM_SAMPLE_RATE = 24000;
  private static readonly PCM_CHANNELS = 1;

  constructor() {
    // Initialize on first use
  }

  async initialize(): Promise<void> {
    if (this.audioContext) {
      return; // Already initialized
    }

    try {
      this.audioContext = new (
        window.AudioContext || (window as any).webkitAudioContext
      )({
        sampleRate: AudioStreamer.PCM_SAMPLE_RATE, // Match Deepgram output
      });

      // Create analyser in *this* context so we can connect playback to it
      this.playbackAnalyser = this.audioContext.createAnalyser();
      this.playbackAnalyser.fftSize = 256;
      this.playbackAnalyser.smoothingTimeConstant = 0.8;
      this.playbackAnalyserData = new Uint8Array(
        new ArrayBuffer(this.playbackAnalyser.frequencyBinCount),
      );
    } catch (error) {
      console.error("Failed to initialize AudioStreamer:", error);
      throw error;
    }
  }

  /** Read current playback volume (0–1) from our analyser. */
  private getPlaybackVolume(): number {
    if (!this.playbackAnalyser || !this.playbackAnalyserData) return 0;
    this.playbackAnalyser.getByteFrequencyData(
      this.playbackAnalyserData as Uint8Array<ArrayBuffer>,
    );
    let sum = 0;
    for (let i = 0; i < this.playbackAnalyserData.length; i++) {
      sum += this.playbackAnalyserData[i];
    }
    const normalized = sum / this.playbackAnalyserData.length / 255;
    this.playbackVolume =
      this.playbackVolume * (1 - this.smoothingFactor) +
      normalized * this.smoothingFactor;
    return Math.min(1, Math.max(0, this.playbackVolume));
  }

  /**
   * Convert raw PCM (16-bit LE, mono) to an AudioBuffer.
   * API returns linear16 with no container, so decodeAudioData cannot be used.
   */
  private static rawPCMToAudioBuffer(
    context: AudioContext,
    pcmBuffer: ArrayBuffer,
  ): AudioBuffer {
    const byteLength = pcmBuffer.byteLength;
    if (byteLength < 2) {
      return context.createBuffer(1, 1, AudioStreamer.PCM_SAMPLE_RATE);
    }
    const numSamples = byteLength >> 1; // 16-bit = 2 bytes per sample
    const audioBuffer = context.createBuffer(
      AudioStreamer.PCM_CHANNELS,
      numSamples,
      AudioStreamer.PCM_SAMPLE_RATE,
    );
    const channel = audioBuffer.getChannelData(0);
    const view = new DataView(pcmBuffer);
    for (let i = 0; i < numSamples; i++) {
      const int16 = view.getInt16(i * 2, true); // little-endian
      channel[i] = int16 / 32768;
    }
    return audioBuffer;
  }

  // Set callback for volume updates (for avatar sync)
  setVolumeCallback(callback: (volume: number) => void): void {
    this.onVolumeUpdate = callback;
  }

  // Start streaming from fetch response
  async startStream(response: Response): Promise<void> {
    if (!this.audioContext) {
      await this.initialize();
    }

    if (!this.audioContext) {
      throw new Error("Failed to initialize audio context");
    }

    // Resume audio context if suspended (browser autoplay policy)
    if (this.audioContext.state === "suspended") {
      await this.audioContext.resume();
    }

    const reader = response.body?.getReader();
    if (!reader) {
      throw new Error("No response body reader available");
    }

    this.isPlaying = false;
    this.audioQueue = [];
    this.nextPlayTime = this.audioContext.currentTime;

    // Start reading chunks
    this.readChunks(reader);
  }

  private async readChunks(
    reader: ReadableStreamDefaultReader<Uint8Array>,
  ): Promise<void> {
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) {
          // Play remaining queued audio
          await this.flushQueue();
          break;
        }

        // Copy to ArrayBuffer (decodeAudioData requires ArrayBuffer, not SharedArrayBuffer)
        const buffer = new ArrayBuffer(value.byteLength);
        new Uint8Array(buffer).set(value);
        this.audioQueue.push(buffer);

        // Start playing once we have enough chunks in the jitter buffer
        if (
          !this.isPlaying &&
          this.audioQueue.length >= this.jitterBufferSize
        ) {
          this.startPlayback();
        }
      }
    } catch (error) {
      console.error("Error reading audio stream:", error);
      throw error;
    } finally {
      reader.releaseLock();
    }
  }

  private async startPlayback(): Promise<void> {
    if (!this.audioContext || this.isPlaying) {
      return;
    }

    this.isPlaying = true;

    // Process queue
    while (this.audioQueue.length > 0 || this.isPlaying) {
      if (this.audioQueue.length === 0) {
        // Wait a bit for more chunks
        await new Promise((resolve) => setTimeout(resolve, 10));
        continue;
      }

      const buffer = this.audioQueue.shift();
      if (!buffer) continue;

      try {
        // API returns raw PCM (linear16), not a container — build AudioBuffer manually
        const audioBuffer = AudioStreamer.rawPCMToAudioBuffer(
          this.audioContext,
          buffer,
        );

        // Create source node
        const source = this.audioContext.createBufferSource();
        source.buffer = audioBuffer;

        // Connect through our analyser (same context) for volume extraction
        if (this.playbackAnalyser) {
          source.connect(this.playbackAnalyser);
          this.playbackAnalyser.connect(this.audioContext.destination);
        } else {
          source.connect(this.audioContext.destination);
        }

        // Schedule playback
        const currentTime = this.audioContext.currentTime;
        const startTime = Math.max(currentTime, this.nextPlayTime);
        source.start(startTime);

        // Update next play time to prevent gaps
        this.nextPlayTime = startTime + audioBuffer.duration;

        // Update volume callback for avatar sync
        if (this.onVolumeUpdate) {
          let isPlaying = true;
          const interval = setInterval(() => {
            if (isPlaying) {
              this.onVolumeUpdate?.(this.getPlaybackVolume());
            } else {
              clearInterval(interval);
            }
          }, 16); // ~60fps

          source.onended = () => {
            isPlaying = false;
            clearInterval(interval);
            this.onVolumeUpdate?.(this.getPlaybackVolume());
          };
        }
      } catch (error) {
        console.error("Error playing audio chunk:", error);
        // Continue with next chunk
      }
    }

    this.isPlaying = false;
  }

  private async flushQueue(): Promise<void> {
    // Wait a bit to ensure all chunks are received
    await new Promise((resolve) => setTimeout(resolve, 100));

    // Play remaining chunks
    while (this.audioQueue.length > 0) {
      const buffer = this.audioQueue.shift();
      if (!buffer || !this.audioContext) continue;

      try {
        const audioBuffer = AudioStreamer.rawPCMToAudioBuffer(
          this.audioContext,
          buffer,
        );
        const source = this.audioContext.createBufferSource();
        source.buffer = audioBuffer;

        // Connect through our analyser (same context)
        if (this.playbackAnalyser) {
          source.connect(this.playbackAnalyser);
          this.playbackAnalyser.connect(this.audioContext.destination);
        } else {
          source.connect(this.audioContext.destination);
        }

        const currentTime = this.audioContext.currentTime;
        const startTime = Math.max(currentTime, this.nextPlayTime);
        source.start(startTime);
        this.nextPlayTime = startTime + audioBuffer.duration;

        if (this.onVolumeUpdate) {
          let isPlaying = true;
          const interval = setInterval(() => {
            if (isPlaying) {
              this.onVolumeUpdate?.(this.getPlaybackVolume());
            } else {
              clearInterval(interval);
            }
          }, 16);

          source.onended = () => {
            isPlaying = false;
            clearInterval(interval);
            this.onVolumeUpdate?.(this.getPlaybackVolume());
          };
        }
      } catch (error) {
        console.error("Error flushing audio queue:", error);
      }
    }
  }

  // Stop playback and clear queue
  stop(): void {
    this.isPlaying = false;
    this.audioQueue = [];
    this.nextPlayTime = 0;
  }

  // Cleanup
  dispose(): void {
    this.stop();

    if (this.playbackAnalyser) {
      try {
        this.playbackAnalyser.disconnect();
      } catch (_) {}
      this.playbackAnalyser = null;
    }
    this.playbackAnalyserData = null;

    if (this.audioContext && this.audioContext.state !== "closed") {
      this.audioContext.close().catch(console.error);
    }

    this.audioContext = null;
    this.onVolumeUpdate = undefined;
  }

  // Get audio context (for external use)
  getAudioContext(): AudioContext | null {
    return this.audioContext;
  }
}

// Singleton instance
let audioStreamerInstance: AudioStreamer | null = null;

export function getAudioStreamer(): AudioStreamer {
  if (!audioStreamerInstance) {
    audioStreamerInstance = new AudioStreamer();
  }
  return audioStreamerInstance;
}
