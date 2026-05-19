"use client";

import { motion, type HTMLMotionProps } from "framer-motion";
import { forwardRef } from "react";
import { cn } from "@/lib/cn";

type CardVariant =
  | "default"
  | "elevated"
  | "hero"
  | "tinted-gold"
  | "tinted-sage"
  | "tinted-coral"
  | "tinted-purple";

interface GlassCardProps extends HTMLMotionProps<"div"> {
  variant?: CardVariant;
  interactive?: boolean;
  glowOnHover?: boolean;
}

const VARIANT_CLASSES: Record<CardVariant, string> = {
  default: "surface rounded-2xl",
  elevated: "surface-elevated rounded-2xl",
  hero: "surface-elevated hero-texture rounded-3xl",
  "tinted-gold": "surface-tinted-gold rounded-2xl",
  "tinted-sage": "surface-tinted-sage rounded-2xl",
  "tinted-coral": "surface-tinted-coral rounded-2xl",
  "tinted-purple": "surface-tinted-purple rounded-2xl",
};

export const GlassCard = forwardRef<HTMLDivElement, GlassCardProps>(function GlassCard(
  {
    className,
    variant = "default",
    interactive = false,
    glowOnHover = false,
    children,
    ...rest
  },
  ref,
) {
  return (
    <motion.div
      ref={ref}
      whileHover={
        interactive
          ? { y: -2, transition: { duration: 0.18 } }
          : undefined
      }
      className={cn(
        VARIANT_CLASSES[variant],
        "relative overflow-hidden",
        interactive &&
          "cursor-pointer transition-colors hover:border-border-gold",
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
          <h3 className="font-display text-[20px] leading-tight text-fg-primary tracking-tight">
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
