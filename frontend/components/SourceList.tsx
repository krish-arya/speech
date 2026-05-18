"use client";

import { motion, AnimatePresence } from "framer-motion";

interface Source {
  title: string;
  url: string;
  snippet?: string;
}

interface SourceListProps {
  sources: Source[];
  isVisible: boolean;
}

export default function SourceList({ sources, isVisible }: SourceListProps) {
  if (!sources.length) return null;

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="max-w-2xl mx-auto px-6"
        >
          <p className="text-text-muted text-xs uppercase tracking-wider mb-2">Sources</p>
          <div className="flex flex-wrap gap-2">
            {sources.map((source, i) => (
              <motion.a
                key={source.url}
                href={source.url}
                target="_blank"
                rel="noopener noreferrer"
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className="group flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-bg-tertiary border border-border text-xs text-text-secondary hover:text-text-primary hover:border-border-light transition-colors"
              >
                <span className="w-3.5 h-3.5 rounded-full bg-accent/20 flex items-center justify-center flex-shrink-0">
                  <span className="w-1 h-1 rounded-full bg-accent" />
                </span>
                <span className="truncate max-w-[160px]">{source.title}</span>
              </motion.a>
            ))}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
