"use client";

import { ArrowDown, ArrowUp, Minus } from "lucide-react";
import { cn } from "@/lib/cn";

type Tone = "pos" | "neg" | "neu";

export function FlowBadge({
  tone,
  label,
  size = "sm",
  className,
}: {
  tone: Tone;
  label: string;
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  const Icon = tone === "pos" ? ArrowUp : tone === "neg" ? ArrowDown : Minus;
  const sizing =
    size === "lg"
      ? "h-9 px-3.5 text-[11px] gap-1.5"
      : size === "md"
        ? "h-7 px-2.5 text-[10px] gap-1"
        : "h-6 px-2 text-[9px] gap-1";
  const tones = {
    pos: "bg-[var(--pos-bg)] text-pos-text border-[var(--pos-border)]",
    neg: "bg-[var(--neg-bg)] text-neg-text border-[var(--neg-border)]",
    neu: "bg-[var(--neu-bg)] text-neu-text border-[var(--neu-border)]",
  } as const;
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border font-medium uppercase tracking-[0.18em]",
        sizing,
        tones[tone],
        className,
      )}
    >
      <Icon className={cn(size === "lg" ? "w-3.5 h-3.5" : "w-3 h-3")} />
      {label}
    </span>
  );
}
