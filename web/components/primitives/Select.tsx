"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Check, ChevronDown, Search } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { cn } from "@/lib/cn";

export interface SelectOption {
  value: string;
  label: string;
  meta?: {
    primary?: string;   // shown on right of the row (e.g. "$213B AUM")
    secondary?: string; // shown below primary (e.g. "+$3.6B Apr")
    dot?: string;       // color marker on the left
    tone?: "pos" | "neg" | "neu";
  };
}

export function Select({
  placeholder,
  value,
  options,
  onChange,
  width = "10rem",
  searchable = false,
  accent,
}: {
  placeholder: string;
  value: string | null;
  options: SelectOption[];
  onChange: (value: string | null) => void;
  width?: string;
  searchable?: boolean;
  accent?: string;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return options;
    return options.filter((o) => o.label.toLowerCase().includes(q));
  }, [options, query]);

  const selected = options.find((o) => o.value === value);

  return (
    <div ref={rootRef} className="relative" style={{ width }}>
      <button
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "w-full h-9 px-3 rounded-lg border bg-bg-surface text-left flex items-center gap-2 transition-all shadow-[var(--shadow-soft)]",
          open || value
            ? "border-border-gold text-fg-primary"
            : "border-border-subtle text-fg-muted hover:border-border-strong",
        )}
      >
        {accent && value && (
          <span
            className="inline-block w-1.5 h-1.5 rounded-full"
            style={{ background: accent }}
          />
        )}
        <span className="flex-1 truncate text-[12px]">
          {selected ? selected.label : placeholder}
        </span>
        <ChevronDown
          className={cn(
            "w-3.5 h-3.5 transition-transform",
            open && "rotate-180",
            value ? "text-gold-600" : "text-fg-muted",
          )}
        />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.15 }}
            className="absolute top-full mt-1.5 left-0 min-w-full w-[max(100%,280px)] max-h-80 overflow-hidden z-50 rounded-xl border border-border-strong bg-bg-surface backdrop-blur-xl shadow-[var(--shadow-elevated)]"
          >
            {searchable && (
              <div className="flex items-center gap-2 px-3 h-9 border-b border-border-subtle">
                <Search className="w-3.5 h-3.5 text-fg-muted" />
                <input
                  autoFocus
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search…"
                  className="flex-1 bg-transparent text-[12px] text-fg-primary placeholder:text-fg-muted outline-none"
                />
              </div>
            )}
            <div className="max-h-60 overflow-y-auto py-1">
              {value && (
                <button
                  onClick={() => {
                    onChange(null);
                    setOpen(false);
                    setQuery("");
                  }}
                  className="w-full px-3 py-1.5 text-[10px] uppercase tracking-[0.2em] text-fg-muted hover:bg-neg-soft hover:text-neg-text text-left transition-colors"
                >
                  Clear selection
                </button>
              )}
              {filtered.length === 0 && (
                <div className="px-3 py-3 text-[11px] text-fg-muted text-center">
                  No matches
                </div>
              )}
              {filtered.map((o) => {
                const isSel = o.value === value;
                const toneCls =
                  o.meta?.tone === "pos"
                    ? "text-pos-text"
                    : o.meta?.tone === "neg"
                      ? "text-neg-text"
                      : "text-fg-muted";
                return (
                  <button
                    key={o.value}
                    onClick={() => {
                      onChange(o.value);
                      setOpen(false);
                      setQuery("");
                    }}
                    className={cn(
                      "w-full px-3 py-2 flex items-center gap-2.5 text-[12px] text-left transition-colors",
                      isSel
                        ? "bg-gold-50/70 text-gold-700"
                        : "text-fg-secondary hover:bg-bg-tint hover:text-fg-primary",
                    )}
                  >
                    {o.meta?.dot && (
                      <span
                        className="inline-block w-1.5 h-1.5 rounded-full shrink-0"
                        style={{ background: o.meta.dot }}
                      />
                    )}
                    <span className="flex-1 min-w-0 truncate">{o.label}</span>
                    {o.meta?.primary && (
                      <span className="flex flex-col items-end leading-tight shrink-0">
                        <span className="text-[10.5px] font-mono tabular-nums text-fg-primary">
                          {o.meta.primary}
                        </span>
                        {o.meta.secondary && (
                          <span className={cn("text-[9.5px] font-mono tabular-nums mt-0.5", toneCls)}>
                            {o.meta.secondary}
                          </span>
                        )}
                      </span>
                    )}
                    {isSel && <Check className="w-3.5 h-3.5 text-gold-600 shrink-0" />}
                  </button>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
