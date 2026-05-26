"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import { cn } from "@/lib/cn";

const TABS = [
  { href: "/", label: "Snapshot", hint: "Global flow" },
  { href: "/regional", label: "Regional", hint: "Region vs region" },
  { href: "/demand", label: "Demand", hint: "Jewellery & coin" },
  { href: "/countries", label: "Countries", hint: "Country drilldown" },
  { href: "/signals", label: "Signals", hint: "Forward outlook" },
];

export function TabNav() {
  const pathname = usePathname();

  return (
    <nav className="sticky top-16 z-30 bg-bg-base/85 backdrop-blur-xl border-b border-border-faint">
      <div className="mx-auto max-w-[1600px] px-6 lg:px-10 flex">
        {TABS.map((t) => {
          const active = pathname === t.href;
          return (
            <Link
              key={t.href}
              href={t.href}
              className={cn(
                "relative px-5 py-3 group transition-colors",
                active ? "text-fg-primary" : "text-fg-muted hover:text-fg-secondary",
              )}
            >
              <div className="flex flex-col gap-0.5 leading-tight">
                <span
                  className={cn(
                    "font-display text-[16px] tracking-tight whitespace-nowrap",
                    active && "text-gold-gradient",
                  )}
                >
                  {t.label}
                </span>
                <span className="hidden sm:block text-[9.5px] uppercase tracking-[0.2em] text-fg-faint group-hover:text-fg-muted transition-colors whitespace-nowrap">
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
