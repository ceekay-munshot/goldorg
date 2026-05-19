"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import { cn } from "@/lib/cn";

const TABS = [
  { href: "/", label: "Snapshot", hint: "Global flow situation" },
  { href: "/regional", label: "Regional", hint: "Deep-dive by geography" },
  { href: "/ask", label: "Ask", hint: "Guided intelligence" },
];

export function TabNav() {
  const pathname = usePathname();

  return (
    <nav className="sticky top-14 z-30 bg-bg-base/85 backdrop-blur-xl border-b border-border-faint">
      <div className="mx-auto max-w-[1600px] px-6 lg:px-10 flex">
        {TABS.map((t) => {
          const active = pathname === t.href;
          return (
            <Link
              key={t.href}
              href={t.href}
              className={cn(
                "relative px-6 py-3.5 group transition-colors",
                active ? "text-fg-primary" : "text-fg-muted hover:text-fg-secondary",
              )}
            >
              <div className="flex items-baseline gap-2.5">
                <span className="font-display text-[15px] tracking-tight">
                  {t.label}
                </span>
                <span className="text-[10px] uppercase tracking-[0.18em] text-fg-faint group-hover:text-fg-muted transition-colors">
                  {t.hint}
                </span>
              </div>
              {active && (
                <motion.div
                  layoutId="tab-underline"
                  className="absolute left-3 right-3 -bottom-px h-[2px] bg-gold-gradient rounded-full"
                  transition={{ type: "spring", stiffness: 380, damping: 32 }}
                />
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
