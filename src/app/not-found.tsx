"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { useGSAP } from "@gsap/react";
import { AuraBackground } from "@/components/landing/AuraBackground";
import { AgentOrb } from "@/components/landing/AgentOrb";
import { Button } from "@/components/ui/button";
import { useGsap } from "@/lib/gsap";
import { useReducedMotion } from "@/hooks/use-reduced-motion";

export default function NotFound() {
  const beamRef = useRef<HTMLDivElement>(null);
  const gsap = useGsap();
  const reduced = useReducedMotion();

  useGSAP(() => {
    if (reduced || !beamRef.current) return;
    gsap.to(beamRef.current, { rotate: 360, duration: 8, repeat: -1, ease: "none", transformOrigin: "center" });
  }, [reduced]);

  useEffect(() => {
    document.title = "Lost in the universe — Arena";
  }, []);

  return (
    <div className="relative isolate flex min-h-svh w-full items-center justify-center overflow-hidden bg-background px-5 text-center text-foreground">
      <AuraBackground />
      <div className="relative z-10">
        <div className="relative mx-auto scale-75">
          <div
            ref={beamRef}
            aria-hidden
            className="pointer-events-none absolute inset-[-40%] opacity-40"
            style={{ background: "conic-gradient(from 0deg, transparent 0deg, rgba(255,138,91,0.25) 20deg, transparent 40deg)" }}
          />
          <AgentOrb />
        </div>
        <h1 className="font-display text-2xl font-bold tracking-tight sm:text-3xl">This page isn&apos;t in my database.</h1>
        <p className="mx-auto mt-2 max-w-sm text-sm text-muted-foreground">Want me to find you something better?</p>
        <div className="mt-6 flex justify-center gap-3">
          <Button variant="ghost-glass" size="cta" render={<Link href="/" />} nativeButton={false}>Home</Button>
          <Button variant="primary-gradient" size="cta" render={<Link href="/dashboard" />} nativeButton={false}>Dashboard</Button>
        </div>
      </div>
    </div>
  );
}
