"use client";

import { Search, X } from "lucide-react";
import { cn } from "@/lib/cn";

export function SearchInput({
  value,
  onChange,
  placeholder = "Search funds, countries…",
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <div
      className={cn(
        "relative h-9 w-64 rounded-lg border bg-bg-surface/60 flex items-center transition-colors",
        value
          ? "border-border-gold/45"
          : "border-border-subtle hover:border-border-strong",
      )}
    >
      <Search
        className={cn(
          "absolute left-3 w-3.5 h-3.5 pointer-events-none transition-colors",
          value ? "text-gold-300" : "text-fg-muted",
        )}
      />
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full h-full pl-9 pr-9 bg-transparent text-[12px] text-fg-primary placeholder:text-fg-muted outline-none"
      />
      {value && (
        <button
          onClick={() => onChange("")}
          className="absolute right-2 grid place-items-center w-5 h-5 rounded-full text-fg-muted hover:text-fg-primary hover:bg-bg-elevated transition-colors"
        >
          <X className="w-3 h-3" />
        </button>
      )}
    </div>
  );
}
