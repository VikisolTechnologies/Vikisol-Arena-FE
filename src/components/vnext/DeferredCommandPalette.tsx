"use client";

import dynamic from "next/dynamic";

const CommandPalette = dynamic(
  () => import("@/components/command-palette/CommandPalette").then((m) => m.CommandPalette),
  { ssr: false },
);

/** Loaded after first paint so lucide and the command dialog stay off /home's first JS. */
export function DeferredCommandPalette() {
  return <CommandPalette />;
}
