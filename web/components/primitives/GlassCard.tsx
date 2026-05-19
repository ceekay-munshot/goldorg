"use client";

import { motion, type HTMLMotionProps } from "framer-motion";
import { forwardRef } from "react";
import { cn } from "@/lib/cn";

type CardVariant = "default" | "elevated" | "hero";

interface GlassCardProps extends HTMLMotionProps<"div"> {
  variant?: CardVariant;
  interactive?: boolean;
  glowOnHover?: boolean;
}

export const GlassCard = forwardRef<HTMLDivElement, GlassCardProps>(function GlassCard(
  { className, variant = "default", interactive = false, glowOnHover = false, children, ...rest },
  ref,
) {
  const base =
    variant === "hero"
      ? "surface-elevated noise gold-sheen rounded-3xl"
      : variant === "elevated"
        ? "surface-elevated rounded-2xl"
        : "surface rounded-2xl";
  return (
    <motion.div
      ref={ref}
      whileHover={
        interactive
          ? { y: -2, transition: { duration: 0.18 } }
          : undefined
      }
      className={cn(
        base,
        "relative overflow-hidden",
        interactive &&
          "cursor-pointer transition-colors hover:border-border-gold/40",
        glowOnHover && "hover:shadow-[var(--shadow-gold)]",
        className,
      )}
      {...rest}
    >
      {children}
    </motion.div>
  );
});

export function CardHeader({
  eyebrow,
  title,
  subtitle,
  trailing,
  className,
}: {
  eyebrow?: React.ReactNode;
  title?: React.ReactNode;
  subtitle?: React.ReactNode;
  trailing?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex items-start justify-between gap-4 mb-4", className)}>
      <div className="min-w-0">
        {eyebrow && (
          <div className="text-[10px] uppercase tracking-[0.22em] text-fg-muted mb-1.5">
            {eyebrow}
          </div>
        )}
        {title && (
          <h3 className="font-display text-[18px] leading-tight text-fg-primary tracking-tight">
            {title}
          </h3>
        )}
        {subtitle && (
          <p className="text-[12px] text-fg-secondary mt-1 leading-snug">{subtitle}</p>
        )}
      </div>
      {trailing}
    </div>
  );
}
