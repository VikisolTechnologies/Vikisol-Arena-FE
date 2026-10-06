"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";

const MissingDobMount = dynamic(() => import("./MissingDobMount").then((m) => m.MissingDobMount), { ssr: false });

/** Same idle-deferred-chunk pattern as DeferredSessionExpired: rarely needed, so its JS stays
 *  off every route's first load. */
export function DeferredMissingDob() {
  const [armed, setArmed] = useState(false);
  useEffect(() => {
    const start = () => setArmed(true);
    const idle = window.requestIdleCallback?.(start);
    if (idle != null) return () => window.cancelIdleCallback(idle);
    const id = window.setTimeout(start, 1);
    return () => window.clearTimeout(id);
  }, []);
  return armed ? <MissingDobMount /> : null;
}
