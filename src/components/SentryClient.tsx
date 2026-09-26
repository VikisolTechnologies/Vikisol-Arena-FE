"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";

const SentryInit = dynamic(() => import("./SentryInit").then((m) => m.SentryInit), { ssr: false });

/** Mounts the Sentry SDK after idle, so it is not part of /home's first JS. */
export function SentryClient() {
  const [armed, setArmed] = useState(false);
  useEffect(() => {
    if (!process.env.NEXT_PUBLIC_SENTRY_DSN) return;
    const start = () => setArmed(true);
    const idle = window.requestIdleCallback?.(start);
    if (idle != null) return () => window.cancelIdleCallback(idle);
    const id = window.setTimeout(start, 1);
    return () => window.clearTimeout(id);
  }, []);
  return armed ? <SentryInit /> : null;
}
