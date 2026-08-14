import type { Page, ConsoleMessage, Request } from "@playwright/test";

/**
 * Every ignored pattern here was individually investigated and confirmed non-app-bugs in a prior
 * session - see BUGS.md ("Route sweep results") for the full writeup of each. This is a short,
 * named allowlist, not a blanket "ignore console noise" - per this project's own testing rule
 * (spec §19/§31, CLAUDE.md), anything NOT matched here fails the test it happened in.
 */
const IGNORED_CONSOLE_PATTERNS: { test: (text: string) => boolean; reason: string }[] = [
  {
    test: (t) => t.includes("THREE.Clock") && t.includes("deprecated"),
    reason:
      "Upstream: react-three-fiber 9.7.0 (latest) still instantiates THREE.Clock internally; no app-side fix exists (BUGS.md #1). Cosmetic, zero user impact.",
  },
  {
    test: (t) => t.includes("GPU stall due to ReadPixels") || t.includes("GL Driver Message"),
    reason:
      "Chrome/ANGLE driver diagnostic, not a JS error. Possibly a Playwright screenshot-capture artifact rather than something a real user's browser emits (BUGS.md #3).",
  },
];

const IGNORED_REQUEST_PATTERNS: { test: (url: string) => boolean; reason: string }[] = [
  {
    test: (url) => url.includes("_rsc="),
    reason:
      "Next.js <Link> auto-prefetches RSC payloads for links entering the viewport; a closing/navigating browser context aborts in-flight prefetches. Standard Next.js behavior, not app-specific (BUGS.md #2) - no UI surface is affected.",
  },
];

export interface PageMonitor {
  consoleErrors: string[];
  pageErrors: string[];
  failedRequests: { url: string; status?: number; failure?: string }[];
  ignoredCount: number;
  /** Unexpected console/page/network problems only - already filtered against the documented allowlist above. */
  unexpected(): string[];
}

export function attachMonitor(page: Page): PageMonitor {
  const consoleErrors: string[] = [];
  const pageErrors: string[] = [];
  const failedRequests: { url: string; status?: number; failure?: string }[] = [];
  let ignoredCount = 0;

  page.on("console", (msg: ConsoleMessage) => {
    if (msg.type() !== "error" && msg.type() !== "warning") return;
    const text = msg.text();
    if (IGNORED_CONSOLE_PATTERNS.some((p) => p.test(text))) {
      ignoredCount++;
      return;
    }
    if (msg.type() === "error") consoleErrors.push(text);
  });

  page.on("pageerror", (err: Error) => {
    pageErrors.push(err.message);
  });

  page.on("requestfailed", (req: Request) => {
    const url = req.url();
    if (IGNORED_REQUEST_PATTERNS.some((p) => p.test(url))) {
      ignoredCount++;
      return;
    }
    failedRequests.push({ url, failure: req.failure()?.errorText });
  });

  page.on("response", (res) => {
    const status = res.status();
    if (status >= 400) {
      const url = res.url();
      if (IGNORED_REQUEST_PATTERNS.some((p) => p.test(url))) {
        ignoredCount++;
        return;
      }
      failedRequests.push({ url, status });
    }
  });

  return {
    consoleErrors,
    pageErrors,
    failedRequests,
    get ignoredCount() {
      return ignoredCount;
    },
    unexpected() {
      return [
        ...consoleErrors.map((e) => `console.error: ${e}`),
        ...pageErrors.map((e) => `pageerror: ${e}`),
        ...failedRequests.map((r) => `network: ${r.status ?? r.failure} ${r.url}`),
      ];
    },
  };
}

/** Authoritative horizontal-overflow check (same method STABILIZE-REPORT.md's own mobile sweep
 * used - scrollWidth vs. clientWidth on the document root, not a visual/heuristic guess). */
export async function hasHorizontalOverflow(page: Page): Promise<boolean> {
  return page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1);
}
