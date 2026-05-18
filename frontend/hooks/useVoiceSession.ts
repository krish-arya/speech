"use client";

import { useState, useCallback, useRef } from "react";
import { useAudioRecorder } from "./useAudioRecorder";
import { useStreamingResponse } from "./useStreamingResponse";
import { sendAudioForQuery, fetchTTS } from "@/lib/api";

export type SessionState = "idle" | "listening" | "thinking" | "responding";

export function useVoiceSession() {
  const recorder = useAudioRecorder();
  const streamer = useStreamingResponse();
  const [state, setState] = useState<SessionState>("idle");
  const audioRef = useRef<AudioContext | null>(null);
  const sourceRef = useRef<AudioBufferSourceNode | null>(null);

  const stopSpeaking = useCallback(() => {
    if (sourceRef.current) {
      try { sourceRef.current.stop(); } catch {}
      sourceRef.current = null;
    }
    if (audioRef.current && audioRef.current.state !== "closed") {
      audioRef.current.close().catch(() => {});
      audioRef.current = null;
    }
  }, []);

  const speakResponse = useCallback(async (text: string) => {
    if (!text.trim()) return;
    try {
      const res = await fetchTTS(text);
      if (!res.ok) return;

      const arrayBuffer = await res.arrayBuffer();
      if (arrayBuffer.byteLength === 0) return;

      audioRef.current = new AudioContext();
      const audioBuffer = await audioRef.current.decodeAudioData(arrayBuffer);
      sourceRef.current = audioRef.current.createBufferSource();
      sourceRef.current.buffer = audioBuffer;
      sourceRef.current.connect(audioRef.current.destination);
      sourceRef.current.start(0);
    } catch {
      // TTS is non-critical
    }
  }, []);

  const startSession = useCallback(async () => {
    stopSpeaking();
    streamer.reset();
    setState("listening");
    await recorder.startRecording();
  }, [recorder, streamer, stopSpeaking]);

  const endSession = useCallback(async () => {
    if (recorder.isRecording) {
      const blob = await recorder.stopRecording();
      if (blob && blob.size > 0) {
        setState("thinking");
        try {
          const res = await sendAudioForQuery(blob);
          await streamer.processStream(res);
          setState("responding");
          if (streamer.response) {
            await speakResponse(streamer.response);
          }
        } catch {
          setState("idle");
        }
      } else {
        setState("idle");
      }
    }
    setState("idle");
  }, [recorder, streamer, speakResponse]);

  const interrupt = useCallback(() => {
    stopSpeaking();
    streamer.reset();
    recorder.stopRecording();
    setState("idle");
  }, [stopSpeaking, streamer, recorder]);

  return {
    state,
    amplitude: recorder.amplitude,
    transcript: streamer.transcript,
    response: streamer.response,
    sources: streamer.sources,
    status: streamer.status,
    isStreaming: streamer.isStreaming,
    isRecording: recorder.isRecording,
    error: recorder.error,
    startSession,
    endSession,
    interrupt,
    stopSpeaking,
  };
}
