"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Check, ChevronDown, Search, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import type { SelectOption } from "./Select";
import { cn } from "@/lib/cn";

/**
 * Multi-select dropdown. Trigger shows count + label summary.
 * Each row is a tickable checkbox; click toggles. Selected rows
 * stay highlighted in gold. "All" link clears the selection.
 */
export function MultiSelect({
  placeholder,
  values,
  options,
  onChange,
  width = "12rem",
  searchable = false,
}: {
  placeholder: string;
  values: string[];
  options: SelectOption[];
  onChange: (next: string[]) => void;
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

  const triggerLabel =
    values.length === 0
      ? placeholder
      : values.length === 1
        ? options.find((o) => o.value === values[0])?.label ?? values[0]
        : `${values.length} selected`;

  const accent = values.length === 1
    ? options.find((o) => o.value === values[0])?.meta?.dot
    : undefined;

  function toggle(v: string) {
    const next = values.includes(v) ? values.filter((x) => x !== v) : [...values, v];
    onChange(next);
  }

  return (
    <div ref={rootRef} className="relative" style={{ width }}>
      <button
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "w-full h-9 px-3 rounded-lg border bg-bg-surface text-left flex items-center gap-2 transition-all shadow-[var(--shadow-soft)]",
          open || values.length > 0
            ? "border-border-gold text-fg-primary"
            : "border-border-subtle text-fg-muted hover:border-border-strong",
        )}
      >
        {accent && (
          <span
            className="inline-block w-1.5 h-1.5 rounded-full"
            style={{ background: accent }}
          />
        )}
        <span className="flex-1 truncate text-[12px]">{triggerLabel}</span>
        {values.length > 1 && (
          <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-gold-50 text-gold-700">
            {values.length}
          </span>
        )}
        <ChevronDown
          className={cn(
            "w-3.5 h-3.5 transition-transform",
            open && "rotate-180",
            values.length > 0 ? "text-gold-600" : "text-fg-muted",
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
            <div className="px-3 h-9 border-b border-border-subtle flex items-center gap-2">
              {searchable ? (
                <>
                  <Search className="w-3.5 h-3.5 text-fg-muted" />
                  <input
                    autoFocus
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Search…"
                    className="flex-1 bg-transparent text-[12px] text-fg-primary placeholder:text-fg-muted outline-none"
                  />
                </>
              ) : (
                <span className="text-[10px] uppercase tracking-[0.2em] text-fg-muted">
                  Pick one or more
                </span>
              )}
              {values.length > 0 && (
                <button
                  onClick={() => onChange([])}
                  className="text-[10px] uppercase tracking-[0.2em] text-fg-muted hover:text-neg-text inline-flex items-center gap-1"
                >
                  <X className="w-3 h-3" />
                  Clear
                </button>
              )}
            </div>

            <div className="max-h-60 overflow-y-auto py-1">
              {filtered.length === 0 && (
                <div className="px-3 py-3 text-[11px] text-fg-muted text-center">
                  No matches
                </div>
              )}
              {filtered.map((o) => {
                const isSel = values.includes(o.value);
                const toneCls =
                  o.meta?.tone === "pos"
                    ? "text-pos-text"
                    : o.meta?.tone === "neg"
                      ? "text-neg-text"
                      : "text-fg-muted";
                return (
                  <button
                    key={o.value}
                    onClick={() => toggle(o.value)}
                    className={cn(
                      "w-full px-3 py-2 flex items-center gap-2.5 text-[12px] text-left transition-colors",
                      isSel
                        ? "bg-gold-50/70 text-gold-700"
                        : "text-fg-secondary hover:bg-bg-tint hover:text-fg-primary",
                    )}
                  >
                    <span
                      className={cn(
                        "shrink-0 w-3.5 h-3.5 rounded border grid place-items-center transition-colors",
                        isSel
                          ? "bg-gold-gradient border-gold-600"
                          : "border-border-strong bg-bg-surface",
                      )}
                    >
                      {isSel && <Check className="w-2.5 h-2.5 text-white" strokeWidth={3} />}
                    </span>
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
