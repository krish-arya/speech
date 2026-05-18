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

  const prepareAudio = useCallback(async () => {
    if (!audioRef.current || audioRef.current.state === "closed") {
      audioRef.current = new AudioContext();
    }
    if (audioRef.current.state === "suspended") {
      await audioRef.current.resume();
    }
    return audioRef.current;
  }, []);

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

      const audioContext = await prepareAudio();
      const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
      sourceRef.current = audioContext.createBufferSource();
      sourceRef.current.buffer = audioBuffer;
      sourceRef.current.connect(audioContext.destination);
      sourceRef.current.start(0);
    } catch {
      // TTS is non-critical
    }
  }, [prepareAudio]);

  const startSession = useCallback(async () => {
    stopSpeaking();
    await prepareAudio().catch(() => {});
    streamer.reset();
    setState("listening");
    await recorder.startRecording();
  }, [recorder, streamer, stopSpeaking, prepareAudio]);

  const endSession = useCallback(async () => {
    if (recorder.isRecording) {
      const blob = await recorder.stopRecording();
      if (blob && blob.size > 0) {
        setState("thinking");
        try {
          const res = await sendAudioForQuery(blob);
          const responseText = await streamer.processStream(res);
          setState("responding");
          if (responseText) {
            await speakResponse(responseText);
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
