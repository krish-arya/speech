"use client";

import { motion } from "framer-motion";

interface AudioVisualizerProps {
  amplitude: number;
  isActive: boolean;
}

const BAR_COUNT = 20;

export default function AudioVisualizer({ amplitude, isActive }: AudioVisualizerProps) {
  if (!isActive) return null;

  return (
    <div className="flex items-center justify-center gap-0.5" style={{ height: 40 }}>
      {Array.from({ length: BAR_COUNT }).map((_, i) => {
        const centerOffset = Math.abs(i - BAR_COUNT / 2) / (BAR_COUNT / 2);
        const baseHeight = 0.2 + (1 - centerOffset) * 0.5;
        const variation = Math.sin(Date.now() * 0.005 + i * 0.4) * 0.3;
        const height = Math.max(0.1, baseHeight + amplitude * variation * 0.8);

        return (
          <motion.div
            key={i}
            className="w-0.5 rounded-full bg-accent/60"
            animate={{ height: `${height * 100}%` }}
            transition={{ duration: 0.08, ease: "easeOut" }}
          />
        );
      })}
    </div>
  );
}
