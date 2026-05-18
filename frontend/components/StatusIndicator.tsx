"use client";

import { motion, AnimatePresence } from "framer-motion";

interface StatusIndicatorProps {
  status: string;
  isVisible: boolean;
}

export default function StatusIndicator({ status, isVisible }: StatusIndicatorProps) {
  return (
    <AnimatePresence>
      {isVisible && status && (
        <motion.div
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
          className="flex items-center justify-center gap-2"
        >
          <span className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse" />
          <span className="text-text-muted text-xs">{status}</span>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
