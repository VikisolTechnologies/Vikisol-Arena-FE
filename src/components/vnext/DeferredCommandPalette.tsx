"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";

const CommandPalette = dynamic(
  () => import("@/components/command-palette/CommandPalette").then((m) => m.CommandPalette),
  { ssr: false },
);

/** The palette chunk loads after idle, so lucide and the dialog stay off /home's first JS. */
export function DeferredCommandPalette() {
  const [armed, setArmed] = useState(false);
  useEffect(() => {
    const start = () => setArmed(true);
    const idle = window.requestIdleCallback?.(start);
    if (idle != null) return () => window.cancelIdleCallback(idle);
    const id = window.setTimeout(start, 1);
    return () => window.clearTimeout(id);
  }, []);
  return armed ? <CommandPalette /> : null;
}
