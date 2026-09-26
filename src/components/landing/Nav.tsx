"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const LINKS = [
  { href: "#overnight", label: "How it works" },
  { href: "#universe", label: "People" },
  { href: "#market", label: "Projects" },
  { href: "#cta", label: "Join" },
];

export function Nav() {
  const [scrolled, setScrolled] = useState(false);
  // Which section is currently in view, driving both the active link color and the sliding
  // pill indicator below - a static nav can't communicate "here's where you are among Arena's
  // few distinct things" nearly as well as one that visibly tracks your scroll position.
  const [activeHref, setActiveHref] = useState<string | null>(null);
  const linkRefs = useRef<Record<string, HTMLAnchorElement | null>>({});
  const [pillStyle, setPillStyle] = useState<{ left: number; width: number } | null>(null);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 10);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    const targets = LINKS.map((l) => document.querySelector(l.href)).filter((el): el is Element => el != null);
    if (targets.length === 0) return;
    // rootMargin biases the trigger band toward the vertical center of the viewport, so a
    // section is "active" while it's genuinely what's on screen, not the instant its top pixel
    // appears at the very bottom edge.
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((e) => e.isIntersecting);
        if (visible.length === 0) return;
        // Prefer whichever intersecting section is closest to true center, not just the first
        // one IntersectionObserver happens to report - matters when two sections both partially
        // satisfy the rootMargin band during a fast scroll.
        const closest = visible.reduce((best, e) => {
          const bestDist = Math.abs(best.boundingClientRect.top);
          const dist = Math.abs(e.boundingClientRect.top);
          return dist < bestDist ? e : best;
        });
        setActiveHref(`#${closest.target.id}`);
      },
      { rootMargin: "-45% 0px -45% 0px", threshold: 0 },
    );
    targets.forEach((t) => observer.observe(t));
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!activeHref) {
      setPillStyle(null);
      return;
    }
    const el = linkRefs.current[activeHref];
    if (!el) return;
    setPillStyle({ left: el.offsetLeft, width: el.offsetWidth });
  }, [activeHref]);

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

      <div className="relative hidden gap-7.5 md:flex">
        {pillStyle && (
          <span
            aria-hidden
            className="absolute top-1/2 h-7 -translate-y-1/2 rounded-full bg-white/8 transition-[left,width] duration-300 ease-out"
            style={{ left: pillStyle.left - 10, width: pillStyle.width + 20 }}
          />
        )}
        {LINKS.map((l) => (
          <a
            key={l.href}
            ref={(el) => {
              linkRefs.current[l.href] = el;
            }}
            href={l.href}
            className={cn(
              "relative text-sm font-medium transition-colors",
              activeHref === l.href ? "text-foreground" : "text-muted-foreground hover:text-foreground",
            )}
          >
            {l.label}
          </a>
        ))}
      </div>

      <div className="flex gap-2.5">
        <Button variant="ghost-glass" size="cta-sm" render={<Link href="/auth" />} nativeButton={false}>
          Sign in
        </Button>
        {/* "Enter as guest" - Home, Map, Marketplace and Companies all render fully signed-out
            now; "Get started" drops a visitor straight into the real feed instead of forcing
            signup first. Only the actual write (post, join, apply, bid) still asks for an
            account, at that specific moment, via SignInPrompt. */}
        <Button variant="primary-gradient" size="cta-sm" render={<Link href="/home" />} nativeButton={false}>
          Get started
        </Button>
      </div>
    </nav>
  );
}
