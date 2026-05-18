"use client";

import { motion } from "framer-motion";
import type { SessionState } from "@/hooks/useVoiceSession";

interface VoiceOrbProps {
  state: SessionState;
  amplitude: number;
  onClick: () => void;
}

function getOrbColor(state: SessionState): string {
  switch (state) {
    case "listening": return "#ef4444";
    case "thinking": return "#f59e0b";
    case "responding": return "#22c55e";
    default: return "#3b82f6";
  }
}

function getScale(state: SessionState): number {
  switch (state) {
    case "listening": return 1;
    case "thinking": return 0.85;
    case "responding": return 0.9;
    default: return 1;
  }
}

export default function VoiceOrb({ state, amplitude, onClick }: VoiceOrbProps) {
  const isActive = state !== "idle";
  const color = getOrbColor(state);
  const baseScale = getScale(state);
  const pulseScale = state === "listening" ? 1 + amplitude * 0.25 : 1;

  return (
    <div className="relative flex items-center justify-center">
      {/* Outer ring pulses */}
      {isActive && (
        <motion.div
          className="absolute rounded-full"
          style={{
            width: 144,
            height: 144,
            border: `1.5px solid ${color}40`,
          }}
          animate={{
            scale: [1, 1.3, 1],
            opacity: [0.3, 0, 0.3],
          }}
          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
        />
      )}

      {/* Secondary ring */}
      {state === "listening" && (
        <motion.div
          className="absolute rounded-full"
          style={{
            width: 128,
            height: 128,
            border: `1px solid ${color}30`,
          }}
          animate={{
            scale: [1, 1.2, 1],
            opacity: [0.2, 0, 0.2],
          }}
          transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut", delay: 0.3 }}
        />
      )}

      {/* Main orb */}
      <motion.button
        onClick={onClick}
        className="relative z-10 rounded-full cursor-pointer flex items-center justify-center select-none outline-none"
        style={{
          width: 120,
          height: 120,
          background: `radial-gradient(circle at 30% 30%, ${color}60, ${color}20, ${color}08)`,
          boxShadow: isActive
            ? `0 0 60px ${color}25, 0 0 120px ${color}10, inset 0 0 30px ${color}15`
            : `0 0 30px ${color}10`,
          border: `1px solid ${color}30`,
        }}
        animate={{
          scale: baseScale * pulseScale,
          ...(state === "thinking"
            ? {
                rotate: [0, 360],
              }
            : state === "responding"
            ? {
                boxShadow: [
                  `0 0 40px ${color}15`,
                  `0 0 80px ${color}25`,
                  `0 0 40px ${color}15`,
                ],
              }
            : {}),
        }}
        transition={{
          scale: { duration: 0.15, ease: "easeOut" },
          rotate: state === "thinking"
            ? { duration: 8, repeat: Infinity, ease: "linear" }
            : {},
          boxShadow: state === "responding"
            ? { duration: 2, repeat: Infinity, ease: "easeInOut" }
            : {},
        }}
        whileHover={!isActive ? { scale: 1.05 } : {}}
        whileTap={!isActive ? { scale: 0.97 } : {}}
      >
        {/* Inner icon */}
        <motion.div
          animate={{
            scale: isActive ? 0.85 : 1,
          }}
          transition={{ duration: 0.2 }}
        >
          {state === "idle" && <MicIcon />}
          {state === "listening" && <ListeningIcon />}
          {state === "thinking" && <ThinkingIcon />}
          {state === "responding" && <SpeakingIcon />}
        </motion.div>
      </motion.button>
    </div>
  );
}

function MicIcon() {
  return (
    <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.8)" strokeWidth="1.5" strokeLinecap="round">
      <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
      <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
      <line x1="12" x2="12" y1="19" y2="22" />
    </svg>
  );
}

function ListeningIcon() {
  return (
    <svg width="36" height="36" viewBox="0 0 24 24" fill="rgba(255,255,255,0.9)" stroke="none">
      <motion.rect
        x="7" y="5" width="3" height="14" rx="1.5"
        animate={{ height: [14, 8, 16, 6, 14] }}
        transition={{ duration: 1.2, repeat: Infinity }}
      />
      <motion.rect
        x="11.5" y="3" width="3" height="18" rx="1.5"
        animate={{ height: [18, 10, 14, 8, 18] }}
        transition={{ duration: 1.2, repeat: Infinity, delay: 0.2 }}
      />
      <motion.rect
        x="16" y="4" width="3" height="16" rx="1.5"
        animate={{ height: [16, 7, 13, 9, 16] }}
        transition={{ duration: 1.2, repeat: Infinity, delay: 0.4 }}
      />
    </svg>
  );
}

function ThinkingIcon() {
  return (
    <motion.svg
      width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.8)" strokeWidth="1.5" strokeLinecap="round"
      animate={{ rotate: 360 }}
      transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
    >
      <circle cx="12" cy="12" r="9" strokeDasharray="4 8" />
      <circle cx="12" cy="12" r="5" />
    </motion.svg>
  );
}

function SpeakingIcon() {
  return (
    <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.8)" strokeWidth="1.5" strokeLinecap="round">
      <motion.path
        d="M2 10v4a2 2 0 002 2h2l4 4V4L6 8H4a2 2 0 00-2 2z"
        fill="rgba(255,255,255,0.15)"
        animate={{ strokeOpacity: [0.8, 1, 0.8] }}
        transition={{ duration: 1, repeat: Infinity }}
      />
      <motion.path
        d="M18 8a6 6 0 010 8"
        animate={{ pathLength: [0, 1] }}
        transition={{ duration: 2, repeat: Infinity }}
      />
      <motion.path
        d="M21 5a10 10 0 010 14"
        animate={{ pathLength: [0, 1] }}
        transition={{ duration: 2, repeat: Infinity, delay: 0.3 }}
      />
    </svg>
  );
}
