"use client";

import { useEffect, useRef } from "react";
import { animate, useReducedMotion } from "motion/react";
import { countUp } from "@/lib/motion";

/** Counts up once on mount; instant under reduced motion (flow §11: numbers count up once). */
export function CountUp({ value, format = (n) => String(n) }: { value: number; format?: (n: number) => string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const reduced = useReducedMotion();
  useEffect(() => {
    if (!ref.current) return;
    if (reduced || value === 0) {
      ref.current.textContent = format(value);
      return;
    }
    const controls = animate(0, value, { ...countUp, onUpdate: (v) => ref.current && (ref.current.textContent = format(Math.round(v))) });
    return () => controls.stop();
    // format is a formatting choice, not a trigger.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, reduced]);
  return <span ref={ref}>{format(value)}</span>;
}
