"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const LINKS = [
  { href: "#agent", label: "Agent" },
  { href: "#universe", label: "Talent Universe" },
  { href: "#market", label: "Projects" },
  { href: "#cta", label: "Enterprise" },
];

export function Nav() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 10);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <nav
      className={cn(
        "fixed inset-x-4 top-4 z-50 mx-auto flex max-w-[1240px] items-center justify-between rounded-full border border-border bg-background/55 px-5 py-3 backdrop-blur-xl transition-shadow sm:px-6",
        scrolled && "shadow-[0_12px_40px_rgba(0,0,0,0.6)]",
      )}
    >
      <a href="#" className="font-display text-xl font-bold tracking-wide">
        ARENA<span className="text-primary">.</span>
      </a>

      <div className="hidden gap-7.5 md:flex">
        {LINKS.map((l) => (
          <a
            key={l.href}
            href={l.href}
            className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            {l.label}
          </a>
        ))}
      </div>

      <div className="flex gap-2.5">
        <Button variant="ghost-glass" size="cta-sm" render={<Link href="/auth" />}>
          Sign in
        </Button>
        <Button variant="primary-gradient" size="cta-sm" render={<Link href="/auth" />}>
          Get started
        </Button>
      </div>
    </nav>
  );
}
