"use client";

import { useReportWebVitals } from "next/web-vitals";

// ARENA-STABILIZE.md Phase 1.1 - reports TTFB/FCP/LCP/INP/CLS from real devices (including
// Syam's phone) to /api/vitals, so Phase 1's root-cause numbers aren't lab-emulation-only.
// sendBeacon so the report still fires during page unload/navigation, which is when INP/CLS
// finalize.
export function WebVitalsReporter() {
  useReportWebVitals((metric) => {
    const nav = navigator as Navigator & { connection?: { effectiveType?: string } };
    const payload = JSON.stringify({
      name: metric.name,
      value: metric.value,
      rating: metric.rating,
      path: window.location.pathname,
      deviceMemory: (navigator as Navigator & { deviceMemory?: number }).deviceMemory,
      connection: nav.connection?.effectiveType,
    });
    if (navigator.sendBeacon) {
      navigator.sendBeacon("/api/vitals", payload);
    } else {
      fetch("/api/vitals", { method: "POST", body: payload, keepalive: true }).catch(() => {});
    }
  });
  return null;
}
