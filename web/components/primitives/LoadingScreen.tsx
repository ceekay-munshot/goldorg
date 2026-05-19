"use client";

import { motion } from "framer-motion";

export function LoadingScreen() {
  return (
    <div className="min-h-[60vh] grid place-items-center">
      <div className="flex flex-col items-center gap-6">
        <motion.div
          className="relative w-14 h-14"
          animate={{ rotate: 360 }}
          transition={{ duration: 2.4, repeat: Infinity, ease: "linear" }}
        >
          <div className="absolute inset-0 rounded-full border-2 border-border-subtle" />
          <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-gold-300 border-r-gold-300/40" />
        </motion.div>
        <div className="flex flex-col items-center gap-1">
          <span className="text-[11px] uppercase tracking-[0.22em] text-gold-200">
            Loading dataset
          </span>
          <span className="text-[10px] text-fg-muted font-mono">
            230 funds · 23 years of history
          </span>
        </div>
      </div>
    </div>
  );
}
