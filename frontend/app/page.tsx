"use client";

import { motion } from "framer-motion";
import { useVoiceSession } from "@/hooks/useVoiceSession";
import VoiceOrb from "@/components/VoiceOrb";
import Transcript from "@/components/Transcript";
import ResponseStream from "@/components/ResponseStream";
import SourceList from "@/components/SourceList";
import StatusIndicator from "@/components/StatusIndicator";

export default function Home() {
  const session = useVoiceSession();

  const handleOrbClick = () => {
    if (session.state === "idle") {
      session.startSession();
    } else if (session.state === "listening") {
      session.endSession();
    } else {
      session.interrupt();
    }
  };

  const showTranscript = session.transcript && session.state !== "listening" && session.state !== "idle";
  const showResponse = !!session.response;
  const showSources = session.sources.length > 0;
  const showStatus = session.status && !session.response && session.state !== "idle" && session.state !== "listening";

  return (
    <main className="h-screen flex flex-col items-center justify-center gap-8 px-4">
      {/* Top space */}
      <div className="flex-1" />

      {/* Orb */}
      <VoiceOrb
        state={session.state}
        amplitude={session.amplitude}
        onClick={handleOrbClick}
      />

      {/* Status */}
      <StatusIndicator status={session.status} isVisible={!!showStatus} />

      {/* Transcript */}
      <Transcript text={session.transcript} isVisible={!!showTranscript} />

      {/* Response */}
      <ResponseStream
        text={session.response}
        isVisible={!!showResponse}
        isStreaming={session.isStreaming}
      />

      {/* Sources */}
      <SourceList sources={session.sources} isVisible={showSources} />

      {/* Error */}
      {session.error && (
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-error text-xs text-center"
        >
          {session.error}
        </motion.p>
      )}

      {/* Instruction */}
      {session.state === "idle" && !session.response && (
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.5 }}
          className="text-text-muted text-xs text-center"
        >
          Tap the mic and ask anything
        </motion.p>
      )}

      {session.state === "listening" && (
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.6 }}
          className="text-text-muted text-xs text-center"
        >
          Listening...
        </motion.p>
      )}

      {/* Bottom space */}
      <div className="flex-1" />
    </main>
  );
}
