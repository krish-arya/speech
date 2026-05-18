"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useRef, useEffect } from "react";

interface ResponseStreamProps {
  text: string;
  isVisible: boolean;
  isStreaming: boolean;
}

export default function ResponseStream({ text, isVisible, isStreaming }: ResponseStreamProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [text]);

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          ref={containerRef}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -4 }}
          transition={{ duration: 0.3, ease: "easeOut" }}
          className="max-w-2xl mx-auto px-6 max-h-72 overflow-y-auto"
        >
          <p className="text-text-primary text-sm leading-relaxed whitespace-pre-wrap">
            {text}
            {isStreaming && (
              <span className="inline-block w-1.5 h-4 bg-accent ml-0.5 animate-pulse align-middle" />
            )}
          </p>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
