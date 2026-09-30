"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";

const SessionExpiredMount = dynamic(() => import("./SessionExpiredMount").then((m) => m.SessionExpiredMount), { ssr: false });

/** Same idle-deferred-chunk pattern as DeferredCommandPalette: this sheet is rarely needed, so
 *  its JS (and motion/react's AnimatePresence usage) stays off every route's first load. */
export function DeferredSessionExpired() {
  const [armed, setArmed] = useState(false);
  useEffect(() => {
    const start = () => setArmed(true);
    const idle = window.requestIdleCallback?.(start);
    if (idle != null) return () => window.cancelIdleCallback(idle);
    const id = window.setTimeout(start, 1);
    return () => window.clearTimeout(id);
  }, []);
  return armed ? <SessionExpiredMount /> : null;
}
