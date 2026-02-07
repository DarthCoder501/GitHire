'use client';

import { useConversationStore } from '@/lib/store/conversation-store';
import { getVAD } from '@/lib/audio/VAD';
import { getAudioStreamer } from '@/lib/audio/AudioStreamer';
import { useEffect, useRef } from 'react';

export function Interface() {
  const {
    isRecording,
    isProcessing,
    transcript,
    error,
    setRecording,
    setProcessing,
    setTranscript,
    setError,
    setAudioVolume,
  } = useConversationStore();

  const vadRef = useRef<ReturnType<typeof getVAD> | null>(null);
  const streamerRef = useRef<ReturnType<typeof getAudioStreamer> | null>(null);

  useEffect(() => {
    // Initialize VAD and streamer
    vadRef.current = getVAD();
    streamerRef.current = getAudioStreamer();

    // Set up volume callback for avatar
    streamerRef.current.setVolumeCallback(setAudioVolume);

    return () => {
      vadRef.current?.dispose();
      streamerRef.current?.dispose();
    };
  }, [setAudioVolume]);

  const handleStartRecording = async () => {
    try {
      setError(null);
      setTranscript('');
      setRecording(true);

      await vadRef.current?.startRecording(
        async (audioBlob) => {
          setRecording(false);
          setProcessing(true);

          try {
            // Send audio to API
            const formData = new FormData();
            formData.append('audio', audioBlob, 'recording.webm');

            const response = await fetch('/api/conversation', {
              method: 'POST',
              body: formData,
            });

            if (!response.ok) {
              const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
              throw new Error(errorData.error || `HTTP ${response.status}`);
            }

            // Stream audio response
            await streamerRef.current?.initialize();
            await streamerRef.current?.startStream(response);

            setProcessing(false);
          } catch (err) {
            console.error('Error processing conversation:', err);
            setError(err instanceof Error ? err.message : 'Failed to process conversation');
            setProcessing(false);
          }
        },
        (volume) => {
          // Optional: show recording volume indicator
        }
      );
    } catch (err) {
      console.error('Error starting recording:', err);
      setError(err instanceof Error ? err.message : 'Failed to start recording');
      setRecording(false);
    }
  };

  const handleStopRecording = () => {
    vadRef.current?.stopRecording();
    setRecording(false);
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 p-6 bg-black/80 backdrop-blur-sm border-t border-white/10">
      <div className="max-w-4xl mx-auto">
        {/* Transcript Display */}
        {transcript && (
          <div className="mb-4 p-4 bg-white/5 rounded-lg border border-white/10">
            <p className="text-sm text-white/60 mb-1">Transcript:</p>
            <p className="text-white">{transcript}</p>
          </div>
        )}

        {/* Error Display */}
        {error && (
          <div className="mb-4 p-4 bg-red-500/20 border border-red-500/50 rounded-lg">
            <p className="text-red-200 text-sm">{error}</p>
          </div>
        )}

        {/* Controls */}
        <div className="flex items-center justify-center gap-4">
          {!isRecording && !isProcessing && (
            <button
              onClick={handleStartRecording}
              className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-full font-medium transition-colors shadow-lg"
            >
              Start Conversation
            </button>
          )}

          {isRecording && (
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
                <span className="text-white">Recording...</span>
              </div>
              <button
                onClick={handleStopRecording}
                className="px-6 py-3 bg-red-600 hover:bg-red-700 text-white rounded-full font-medium transition-colors"
              >
                Stop Recording
              </button>
            </div>
          )}

          {isProcessing && (
            <div className="flex items-center gap-2">
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
              <span className="text-white">Processing...</span>
            </div>
          )}
        </div>

        {/* Status Indicator */}
        <div className="mt-4 text-center">
          <p className="text-xs text-white/40">
            {isRecording
              ? 'Speak now. Recording will stop automatically after 600ms of silence.'
              : isProcessing
              ? 'AI is thinking and responding...'
              : 'Click "Start Conversation" to begin'}
          </p>
        </div>
      </div>
    </div>
  );
}

