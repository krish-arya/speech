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
  const playbackIdRef = useRef(0);
  const runIdRef = useRef(0);

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
    playbackIdRef.current += 1;
    if (sourceRef.current) {
      try { sourceRef.current.stop(); } catch {}
      sourceRef.current = null;
    }
    if (audioRef.current && audioRef.current.state !== "closed") {
      audioRef.current.close().catch(() => {});
      audioRef.current = null;
    }
  }, []);

  const speakResponse = useCallback(async (text: string, onStart?: () => void) => {
    if (!text.trim()) return false;
    const playbackId = ++playbackIdRef.current;
    try {
      const res = await fetchTTS(text);
      if (!res.ok || playbackId !== playbackIdRef.current) return false;

      const arrayBuffer = await res.arrayBuffer();
      if (arrayBuffer.byteLength === 0 || playbackId !== playbackIdRef.current) return false;

      const audioContext = await prepareAudio();
      const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
      if (playbackId !== playbackIdRef.current) return false;

      const source = audioContext.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(audioContext.destination);
      sourceRef.current = source;

      await new Promise<void>((resolve, reject) => {
        source.onended = () => {
          if (sourceRef.current === source) {
            sourceRef.current = null;
          }
          resolve();
        };

        try {
          source.start(0);
          onStart?.();
        } catch (error) {
          reject(error);
        }
      });

      return true;
    } catch {
      // TTS is non-critical
      return false;
    }
  }, [prepareAudio]);

  const startSession = useCallback(async () => {
    runIdRef.current += 1;
    stopSpeaking();
    await prepareAudio().catch(() => {});
    streamer.reset();
    setState("listening");
    await recorder.startRecording();
  }, [recorder, streamer, stopSpeaking, prepareAudio]);

  const endSession = useCallback(async () => {
    const runId = runIdRef.current;
    if (recorder.isRecording) {
      const blob = await recorder.stopRecording();
      if (runId !== runIdRef.current) return;
      if (blob && blob.size > 0) {
        setState("thinking");
        try {
          const res = await sendAudioForQuery(blob);
          const responseText = await streamer.processStream(res, { streamToUi: false });
          if (runId !== runIdRef.current) return;

          if (responseText) {
            streamer.setStatusMessage("Preparing voice...");
            const didSpeak = await speakResponse(responseText, () => {
              if (runId !== runIdRef.current) return;
              streamer.setStatusMessage("");
              setState("responding");
              streamer.showResponse(responseText);
            });

            if (!didSpeak && runId === runIdRef.current) {
              streamer.setStatusMessage("");
              setState("responding");
              streamer.showResponse(responseText);
            }
          }
        } catch {
          if (runId === runIdRef.current) {
            setState("idle");
          }
        }
      } else {
        setState("idle");
      }
    }
    if (runId === runIdRef.current) {
      setState("idle");
    }
  }, [recorder, streamer, speakResponse]);

  const interrupt = useCallback(() => {
    runIdRef.current += 1;
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
