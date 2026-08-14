import { test, devices } from "@playwright/test";
import { DEMO_ACCOUNTS } from "../../fixtures/accounts";

/**
 * P0.4 follow-up (COMPLETION-REPORT.md): two single before/after samples weren't enough to
 * separate a real signal from ordinary network jitter. This isolates ONE variable - the
 * SFO<->Hyderabad round-trip distance itself (P0.1's documented ~230-280ms range, applied here
 * as its 250ms midpoint) - with decent bandwidth and no CPU throttle so device/bandwidth don't
 * confound the number, and repeats it enough times to report a median/p95 instead of a single
 * noisy sample.
 *
 * Honest limit of this method, same one P0.1 already flagged: this is a CDP-emulated flat
 * latency tax added on top of wherever this environment's real connection already is - it
 * correctly models "an India user hitting the current single-origin SFO backend" (what's live
 * today), but it CANNOT correctly model Vercel's actual edge-network benefit once that migration
 * is live, because a flat added-latency parameter has no notion of "nearest edge PoP" - it would
 * show the same inflated numbers regardless of which backend answered. A true Railway-vs-Vercel
 * comparison needs a real India-based vantage point (e.g. WebPageTest's Mumbai location), not
 * this harness. This is a reporting tool, not a regression gate - no hard pass/fail thresholds,
 * read the printed table instead.
 */

const INDIA_SFO_RTT_MS = 250;
const RUNS = 8;

interface Sample {
  ttfb: number | null;
  fcp: number | null;
}

interface Stats {
  n: number;
  min: number | null;
  median: number | null;
  p95: number | null;
  max: number | null;
  mean: number | null;
}

async function measureOnce(
  browser: import("@playwright/test").Browser,
  path: string,
  storageState?: string,
): Promise<Sample> {
  const context = await browser.newContext({
    ...devices["Pixel 7"],
    ...(storageState ? { storageState } : {}),
  });
  const page = await context.newPage();
  const client = await context.newCDPSession(page);

  await client.send("Network.enable");
  await client.send("Network.emulateNetworkConditions", {
    offline: false,
    latency: INDIA_SFO_RTT_MS,
    downloadThroughput: (10 * 1024 * 1024) / 8,
    uploadThroughput: (5 * 1024 * 1024) / 8,
  });

  await page.goto(path, { waitUntil: "load", timeout: 30_000 });
  await page.waitForTimeout(500);

  const sample = await page.evaluate(() => {
    const nav = performance.getEntriesByType("navigation")[0] as PerformanceNavigationTiming | undefined;
    const paint = performance.getEntriesByType("paint");
    const fcp = paint.find((p) => p.name === "first-contentful-paint")?.startTime ?? null;
    return { ttfb: nav?.responseStart ?? null, fcp };
  });

  await context.close();
  return sample;
}

function stats(values: (number | null)[]): Stats {
  const clean = values.filter((v): v is number => v !== null).sort((a, b) => a - b);
  const n = clean.length;
  if (n === 0) return { n: 0, min: null, median: null, p95: null, max: null, mean: null };
  const pick = (p: number) => clean[Math.min(n - 1, Math.floor(p * n))];
  const mean = clean.reduce((s, v) => s + v, 0) / n;
  return { n, min: clean[0], median: pick(0.5), p95: pick(0.95), max: clean[n - 1], mean: Math.round(mean) };
}

const fmtStats = (label: string, s: Stats) =>
  s.n === 0
    ? `${label}: no samples captured`
    : `${label}: n=${s.n} min=${s.min}ms median=${s.median}ms p95=${s.p95}ms max=${s.max}ms mean=${s.mean}ms`;

test.describe(`India-latency sample (${INDIA_SFO_RTT_MS}ms emulated RTT, unthrottled CPU/bandwidth-realistic, ${RUNS} runs)`, () => {
  test.setTimeout(600_000);

  test("landing page (/) — logged out, first visit", async ({ browser }, testInfo) => {
    const samples: Sample[] = [];
    for (let i = 0; i < RUNS; i++) {
      samples.push(await measureOnce(browser, "/"));
    }
    const ttfb = stats(samples.map((s) => s.ttfb));
    const fcp = stats(samples.map((s) => s.fcp));
    const report = `${fmtStats("TTFB", ttfb)}\n${fmtStats("FCP", fcp)}\nraw=${JSON.stringify(samples)}`;
    testInfo.annotations.push({ type: "india-latency-sample", description: report });
    console.log(`\n[/ landing, ${RUNS} runs]\n${report}\n`);
  });

  test("/home — fresh load with a valid session", async ({ browser }, testInfo) => {
    const samples: Sample[] = [];
    for (let i = 0; i < RUNS; i++) {
      samples.push(await measureOnce(browser, "/home", DEMO_ACCOUNTS.talent.storageStatePath));
    }
    const ttfb = stats(samples.map((s) => s.ttfb));
    const fcp = stats(samples.map((s) => s.fcp));
    const report = `${fmtStats("TTFB", ttfb)}\n${fmtStats("FCP", fcp)}\nraw=${JSON.stringify(samples)}`;
    testInfo.annotations.push({ type: "india-latency-sample", description: report });
    console.log(`\n[/home, ${RUNS} runs]\n${report}\n`);
  });
});
