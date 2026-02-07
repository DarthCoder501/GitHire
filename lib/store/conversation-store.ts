// Zustand store for conversation state management

import { create } from 'zustand';

interface ConversationState {
  isRecording: boolean;
  isProcessing: boolean;
  transcript: string;
  error: string | null;
  audioVolume: number; // 0-1 for avatar animation
  setRecording: (recording: boolean) => void;
  setProcessing: (processing: boolean) => void;
  setTranscript: (text: string) => void;
  setError: (error: string | null) => void;
  setAudioVolume: (volume: number) => void;
  reset: () => void;
}

export const useConversationStore = create<ConversationState>((set) => ({
  isRecording: false,
  isProcessing: false,
  transcript: '',
  error: null,
  audioVolume: 0,

  setRecording: (recording: boolean) => set({ isRecording: recording }),
  setProcessing: (processing: boolean) => set({ isProcessing: processing }),
  setTranscript: (text: string) => set({ transcript: text }),
  setError: (error: string | null) => set({ error }),
  setAudioVolume: (volume: number) => set({ audioVolume: volume }),
  reset: () =>
    set({
      isRecording: false,
      isProcessing: false,
      transcript: '',
      error: null,
      audioVolume: 0,
    }),
}));

