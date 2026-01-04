import { useState, useRef, useEffect, useCallback } from 'react';

export interface AudioData {
  analyser: AnalyserNode | null;
  isListening: boolean;
  error: string | null;
  startListening: () => Promise<void>;
  stopListening: () => void;
}

export const useAudio = (): AudioData => {
  const [isListening, setIsListening] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);

  const stopListening = useCallback(() => {
    if (sourceRef.current) {
      sourceRef.current.disconnect();
      sourceRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
    analyserRef.current = null;
    setIsListening(false);
  }, []);

  const startListening = useCallback(async () => {
    try {
      setError(null);
      
      // 1. Get User Media with noise suppression
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        }
      });
      streamRef.current = stream;

      // 2. Create Audio Context
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      audioContextRef.current = audioContext;

      // 3. Create Analyser
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 2048; // Good balance for frequency resolution
      analyser.smoothingTimeConstant = 0.8; // Smooth out the jitter
      analyserRef.current = analyser;

      // 4. Create Source
      const source = audioContext.createMediaStreamSource(stream);
      sourceRef.current = source;

      // 5. Create Filter (High-pass to remove low rumble/noise)
      const filter = audioContext.createBiquadFilter();
      filter.type = 'highpass';
      filter.frequency.value = 80; // Cut off below 80Hz
      filter.Q.value = 0.5;

      // 6. Connect: Source -> Filter -> Analyser
      // Note: We do NOT connect to destination (speakers) to prevent feedback
      source.connect(filter);
      filter.connect(analyser);

      setIsListening(true);
    } catch (err: any) {
      console.error("Error accessing microphone:", err);
      setError(err.message || "Could not access microphone");
      stopListening();
    }
  }, [stopListening]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopListening();
    };
  }, [stopListening]);

  return {
    analyser: analyserRef.current,
    isListening,
    error,
    startListening,
    stopListening
  };
};
