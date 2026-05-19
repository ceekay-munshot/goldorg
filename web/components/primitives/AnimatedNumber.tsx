"use client";

import { animate, useInView, useMotionValue, useTransform } from "framer-motion";
import { motion } from "framer-motion";
import { useEffect, useRef } from "react";

export interface AnimatedNumberProps {
  value: number;
  format: (n: number) => string;
  className?: string;
  duration?: number;
}

/**
 * Tweens a numeric value from 0 (or previous) to the new value, using
 * the provided formatter for display. Only animates on first appear or
 * when the value changes.
 */
export function AnimatedNumber({
  value,
  format,
  className,
  duration = 1.2,
}: AnimatedNumberProps) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.3 });
  const mv = useMotionValue(0);
  const display = useTransform(mv, (latest) => format(latest));
  const prev = useRef(0);

  useEffect(() => {
    if (!inView) return;
    const controls = animate(mv, value, {
      duration,
      ease: [0.22, 1, 0.36, 1],
    });
    return () => controls.stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inView, value]);

  useEffect(() => {
    prev.current = value;
  }, [value]);

  return (
    <motion.span ref={ref} className={className} data-num="true">
      {display}
    </motion.span>
  );
}
