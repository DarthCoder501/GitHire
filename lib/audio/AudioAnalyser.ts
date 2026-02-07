// Web Audio API AnalyserNode for real-time volume extraction
// Used to drive 3D avatar mouth animation

export class AudioAnalyser {
  private audioContext: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private source: AudioBufferSourceNode | null = null;
  private dataArray: Uint8Array | null = null;
  private volume: number = 0;
  private smoothingFactor: number = 0.1; // For smooth volume transitions

  constructor() {
    // Initialize on first use (browser context required)
  }

  async initialize(): Promise<void> {
    if (this.audioContext) {
      return; // Already initialized
    }

    try {
      this.audioContext = new (
        window.AudioContext || (window as any).webkitAudioContext
      )();
      this.analyser = this.audioContext.createAnalyser();
      this.analyser.fftSize = 256; // Lower for performance
      this.analyser.smoothingTimeConstant = 0.8;
      // Use ArrayBuffer explicitly for AnalyserNode.getByteFrequencyData type compatibility
      this.dataArray = new Uint8Array(
        new ArrayBuffer(this.analyser.frequencyBinCount),
      );
    } catch (error) {
      console.error("Failed to initialize AudioAnalyser:", error);
      throw error;
    }
  }

  // Note: Sources should connect to analyser node directly via getAnalyser()
  // This method is kept for backward compatibility but not used
  connectSource(
    source: AudioBufferSourceNode | MediaElementAudioSourceNode,
  ): void {
    if (!this.analyser || !this.audioContext) {
      throw new Error("AudioAnalyser not initialized");
    }

    this.source = source as AudioBufferSourceNode;
    source.connect(this.analyser);
    this.analyser.connect(this.audioContext.destination);
  }

  // Get current volume (0-1 normalized)
  getVolume(): number {
    if (!this.analyser || !this.dataArray) {
      return 0;
    }

    this.analyser.getByteFrequencyData(
      this.dataArray as Uint8Array<ArrayBuffer>,
    );

    // Calculate average volume
    let sum = 0;
    for (let i = 0; i < this.dataArray.length; i++) {
      sum += this.dataArray[i];
    }
    const average = sum / this.dataArray.length;

    // Normalize to 0-1 range (0-255 -> 0-1)
    const normalized = average / 255;

    // Apply smoothing to avoid jittery animations
    this.volume =
      this.volume * (1 - this.smoothingFactor) +
      normalized * this.smoothingFactor;

    return Math.min(1, Math.max(0, this.volume));
  }

  // Get raw frequency data (for advanced visualizations)
  getFrequencyData(): Uint8Array | null {
    if (!this.analyser || !this.dataArray) {
      return null;
    }

    this.analyser.getByteFrequencyData(
      this.dataArray as Uint8Array<ArrayBuffer>,
    );
    return this.dataArray;
  }

  // Cleanup
  dispose(): void {
    if (this.source) {
      try {
        this.source.disconnect();
      } catch (e) {
        // Ignore errors
      }
      this.source = null;
    }

    if (this.analyser) {
      try {
        this.analyser.disconnect();
      } catch (e) {
        // Ignore errors
      }
      this.analyser = null;
    }

    if (this.audioContext && this.audioContext.state !== "closed") {
      this.audioContext.close().catch(console.error);
    }

    this.audioContext = null;
    this.dataArray = null;
    this.volume = 0;
  }

  // Get the audio context (for external connections)
  getAudioContext(): AudioContext | null {
    return this.audioContext;
  }

  // Get the analyser node (for external connections)
  getAnalyser(): AnalyserNode | null {
    return this.analyser;
  }
}

// Singleton instance
let audioAnalyserInstance: AudioAnalyser | null = null;

export function getAudioAnalyser(): AudioAnalyser {
  if (!audioAnalyserInstance) {
    audioAnalyserInstance = new AudioAnalyser();
  }
  return audioAnalyserInstance;
}
