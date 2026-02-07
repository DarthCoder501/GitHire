// Voice Activity Detection using MediaRecorder and volume threshold

export class VAD {
  private mediaRecorder: MediaRecorder | null = null;
  private audioContext: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private microphone: MediaStreamAudioSourceNode | null = null;
  private stream: MediaStream | null = null;
  private silenceThreshold: number = 25; // Volume threshold (0-255)
  private silenceDuration: number = 1500; // ms of silence *after speech* before stopping
  private maxRecordingMs: number = 30000; // Stop after 30s even if still talking
  private lastSoundTime: number = 0; // 0 = no speech detected yet
  private recordingStartTime: number = 0;
  private silenceTimer: ReturnType<typeof setTimeout> | null = null;
  private maxDurationTimer: ReturnType<typeof setTimeout> | null = null;
  private chunks: Blob[] = [];
  private onRecordingComplete?: (audioBlob: Blob) => void;
  private onVolumeUpdate?: (volume: number) => void;
  private isRecording: boolean = false;

  constructor() {
    // Initialize on first use
  }

  async startRecording(
    onComplete: (audioBlob: Blob) => void,
    onVolume?: (volume: number) => void,
  ): Promise<void> {
    try {
      // Request microphone access
      this.stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });

      // Set up audio context for volume analysis
      this.audioContext = new (
        window.AudioContext || (window as any).webkitAudioContext
      )();
      this.analyser = this.audioContext.createAnalyser();
      this.analyser.fftSize = 256;
      this.analyser.smoothingTimeConstant = 0.3;

      this.microphone = this.audioContext.createMediaStreamSource(this.stream);
      this.microphone.connect(this.analyser);

      // Set up MediaRecorder
      const options: MediaRecorderOptions = {
        mimeType: "audio/webm;codecs=opus",
      };

      // Fallback to default if webm not supported
      if (!MediaRecorder.isTypeSupported(options.mimeType!)) {
        options.mimeType = "audio/webm";
      }

      this.mediaRecorder = new MediaRecorder(this.stream, options);
      this.chunks = [];
      this.lastSoundTime = 0; // No speech detected yet — don't stop until we hear speech then silence
      this.recordingStartTime = Date.now();

      this.mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          this.chunks.push(event.data);
        }
      };

      this.mediaRecorder.onstop = () => {
        const audioBlob = new Blob(this.chunks, {
          type: options.mimeType || "audio/webm",
        });
        this.onRecordingComplete?.(audioBlob);
        this.chunks = [];
      };

      this.onRecordingComplete = onComplete;
      this.onVolumeUpdate = onVolume;

      // Start recording
      this.mediaRecorder.start(100); // Collect data every 100ms

      // Start monitoring volume
      this.isRecording = true;
      this.monitorVolume();

      // Stop after max duration (e.g. 30s) so we don't record forever
      this.maxDurationTimer = setTimeout(() => {
        if (this.isRecording) this.stopRecording();
      }, this.maxRecordingMs);
    } catch (error) {
      console.error("Error starting recording:", error);
      throw error;
    }
  }

  private monitorVolume(): void {
    if (!this.analyser || !this.isRecording) {
      return;
    }

    const dataArray = new Uint8Array(this.analyser.frequencyBinCount);
    this.analyser.getByteFrequencyData(dataArray);

    // Calculate average volume
    let sum = 0;
    for (let i = 0; i < dataArray.length; i++) {
      sum += dataArray[i];
    }
    const average = sum / dataArray.length;

    // Update volume callback
    if (this.onVolumeUpdate) {
      this.onVolumeUpdate(average / 255); // Normalize to 0-1
    }

    // Check for sound
    if (average > this.silenceThreshold) {
      this.lastSoundTime = Date.now();
      this.resetSilenceTimer(); // Only start silence timer after we've heard speech
    } else {
      // Only stop on silence *after* we've detected at least one moment of speech
      const silenceTime = Date.now() - this.lastSoundTime;
      if (this.lastSoundTime > 0 && silenceTime >= this.silenceDuration) {
        this.stopRecording();
        return;
      }
    }

    // Continue monitoring
    if (this.isRecording) {
      requestAnimationFrame(() => this.monitorVolume());
    }
  }

  private resetSilenceTimer(): void {
    if (this.silenceTimer) clearTimeout(this.silenceTimer);
    this.silenceTimer = setTimeout(() => {
      if (this.isRecording) this.stopRecording();
    }, this.silenceDuration);
  }

  stopRecording(): void {
    if (!this.isRecording) return;

    this.isRecording = false;

    if (this.silenceTimer) {
      clearTimeout(this.silenceTimer);
      this.silenceTimer = null;
    }
    if (this.maxDurationTimer) {
      clearTimeout(this.maxDurationTimer);
      this.maxDurationTimer = null;
    }

    if (this.mediaRecorder && this.mediaRecorder.state !== "inactive") {
      this.mediaRecorder.stop();
    }

    this.cleanup();
  }

  private cleanup(): void {
    if (this.microphone) {
      try {
        this.microphone.disconnect();
      } catch (e) {
        // Ignore
      }
      this.microphone = null;
    }

    if (this.analyser) {
      try {
        this.analyser.disconnect();
      } catch (e) {
        // Ignore
      }
      this.analyser = null;
    }

    if (this.audioContext && this.audioContext.state !== "closed") {
      this.audioContext.close().catch(console.error);
    }
    this.audioContext = null;

    if (this.stream) {
      this.stream.getTracks().forEach((track) => track.stop());
      this.stream = null;
    }
  }

  dispose(): void {
    this.stopRecording();
    this.onRecordingComplete = undefined;
    this.onVolumeUpdate = undefined;
  }
}

// Singleton instance
let vadInstance: VAD | null = null;

export function getVAD(): VAD {
  if (!vadInstance) {
    vadInstance = new VAD();
  }
  return vadInstance;
}
