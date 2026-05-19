"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Check, ChevronDown, Search } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { cn } from "@/lib/cn";

export interface SelectOption {
  value: string;
  label: string;
}

export function Select({
  placeholder,
  value,
  options,
  onChange,
  width = "10rem",
  searchable = false,
}: {
  placeholder: string;
  value: string | null;
  options: SelectOption[];
  onChange: (value: string | null) => void;
  width?: string;
  searchable?: boolean;
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
          "w-full h-9 px-3 rounded-lg border bg-bg-surface/60 text-left flex items-center gap-2 transition-all",
          open || value
            ? "border-border-gold/45 text-fg-primary"
            : "border-border-subtle text-fg-muted hover:border-border-strong",
        )}
      >
        <span className="flex-1 truncate text-[12px]">
          {selected ? selected.label : placeholder}
        </span>
        <ChevronDown
          className={cn(
            "w-3.5 h-3.5 transition-transform",
            open && "rotate-180",
            value ? "text-gold-300" : "text-fg-muted",
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
            className="absolute top-full mt-1.5 left-0 right-0 max-h-72 overflow-hidden z-50 rounded-xl border border-border-strong bg-bg-elevated/95 backdrop-blur-xl shadow-[var(--shadow-raised)]"
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
                  className="w-full px-3 py-1.5 text-[11px] uppercase tracking-[0.18em] text-fg-muted hover:bg-bg-glass hover:text-neg-text text-left"
                >
                  Clear selection
                </button>
              )}
              {filtered.length === 0 && (
                <div className="px-3 py-3 text-[11px] text-fg-muted text-center">
                  No matches
                </div>
              )}
              {filtered.map((o) => (
                <button
                  key={o.value}
                  onClick={() => {
                    onChange(o.value);
                    setOpen(false);
                    setQuery("");
                  }}
                  className={cn(
                    "w-full px-3 py-1.5 flex items-center gap-2 text-[12px] text-left hover:bg-bg-glass-strong transition-colors",
                    o.value === value
                      ? "text-gold-200"
                      : "text-fg-secondary hover:text-fg-primary",
                  )}
                >
                  <span className="flex-1 truncate">{o.label}</span>
                  {o.value === value && <Check className="w-3.5 h-3.5 text-gold-300" />}
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
