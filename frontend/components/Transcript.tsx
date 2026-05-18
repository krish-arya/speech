"use client";

import { motion, AnimatePresence } from "framer-motion";

interface TranscriptProps {
  text: string;
  isVisible: boolean;
}

export default function Transcript({ text, isVisible }: TranscriptProps) {
  return (
    <AnimatePresence>
      {isVisible && text && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -4 }}
          transition={{ duration: 0.25, ease: "easeOut" }}
          className="max-w-lg mx-auto px-4"
        >
          <p className="text-text-secondary text-sm text-center leading-relaxed italic">
            &ldquo;{text}&rdquo;
          </p>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
