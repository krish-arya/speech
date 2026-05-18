"use client";

import { useRef, useState, useCallback, useEffect } from "react";

interface UseAudioRecorderReturn {
  isRecording: boolean;
  amplitude: number;
  startRecording: () => Promise<void>;
  stopRecording: () => Promise<Blob | null>;
  error: string | null;
}

export function useAudioRecorder(): UseAudioRecorderReturn {
  const mediaRecorder = useRef<MediaRecorder | null>(null);
  const audioContext = useRef<AudioContext | null>(null);
  const analyser = useRef<AnalyserNode | null>(null);
  const animationFrame = useRef<number>(0);
  const chunks = useRef<Blob[]>([]);
  const stream = useRef<MediaStream | null>(null);

  const [isRecording, setIsRecording] = useState(false);
  const [amplitude, setAmplitude] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const [resolveStop, setResolveStop] = useState<((blob: Blob | null) => void) | null>(null);

  const cleanup = useCallback(() => {
    if (animationFrame.current) {
      cancelAnimationFrame(animationFrame.current);
      animationFrame.current = 0;
    }
    if (stream.current) {
      stream.current.getTracks().forEach((t) => t.stop());
      stream.current = null;
    }
    if (audioContext.current && audioContext.current.state !== "closed") {
      audioContext.current.close().catch(() => {});
    }
    audioContext.current = null;
    analyser.current = null;
    mediaRecorder.current = null;
  }, []);

  const updateAmplitude = useCallback(() => {
    if (!analyser.current) return;
    const dataArray = new Uint8Array(analyser.current.frequencyBinCount);
    analyser.current.getByteTimeDomainData(dataArray);

    let sum = 0;
    for (let i = 0; i < dataArray.length; i++) {
      const v = (dataArray[i] - 128) / 128;
      sum += v * v;
    }
    const rms = Math.sqrt(sum / dataArray.length);
    const normalizedAmplitude = Math.min(rms * 3, 1);
    setAmplitude(normalizedAmplitude);

    animationFrame.current = requestAnimationFrame(updateAmplitude);
  }, []);

  const startRecording = useCallback(async () => {
    try {
      setError(null);
      chunks.current = [];

      const mediaStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          channelCount: 1,
          sampleRate: 16000,
        },
      });
      stream.current = mediaStream;

      audioContext.current = new AudioContext();
      const source = audioContext.current.createMediaStreamSource(mediaStream);
      analyser.current = audioContext.current.createAnalyser();
      analyser.current.fftSize = 256;
      source.connect(analyser.current);

      const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
        ? "audio/webm;codecs=opus"
        : "audio/webm";

      mediaRecorder.current = new MediaRecorder(mediaStream, {
        mimeType,
        audioBitsPerSecond: 16000,
      });

      mediaRecorder.current.ondataavailable = (e) => {
        if (e.data.size > 0) chunks.current.push(e.data);
      };

      mediaRecorder.current.start(100);
      setIsRecording(true);
      updateAmplitude();
    } catch (err: any) {
      setError(err.message || "Microphone access denied");
      cleanup();
    }
  }, [cleanup, updateAmplitude]);

  const stopRecording = useCallback((): Promise<Blob | null> => {
    return new Promise((resolve) => {
      if (!mediaRecorder.current || mediaRecorder.current.state === "inactive") {
        setIsRecording(false);
        resolve(null);
        return;
      }

      mediaRecorder.current.onstop = () => {
        const blob = new Blob(chunks.current, { type: "audio/webm" });
        chunks.current = [];
        setIsRecording(false);
        cleanup();
        resolve(blob.size > 0 ? blob : null);
      };

      mediaRecorder.current.stop();
    });
  }, [cleanup]);

  useEffect(() => {
    return cleanup;
  }, [cleanup]);

  return { isRecording, amplitude, startRecording, stopRecording, error };
}
