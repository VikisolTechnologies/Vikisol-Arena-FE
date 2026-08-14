import { test, expect, devices } from "@playwright/test";
import { DEMO_ACCOUNTS } from "../../fixtures/accounts";

/**
 * @performance — Core Web Vitals on a throttled-mobile cold load, made into a standing,
 * re-runnable regression check instead of another one-off script. Methodology deliberately
 * matches MOBILE-ROOT-CAUSE.md / STABILIZE-REPORT.md exactly (iPhone-13 390x844, "Slow 4G":
 * 150ms RTT / 1.6Mbps down / 0.75Mbps up, 4x CPU throttle) so numbers here are directly
 * comparable to that prior investigation's baseline, not a new, incomparable measurement.
 *
 * This app's landing-page cold load is a KNOWN, already-diagnosed gap as of 2026-08-12 (FCP
 * ~5.4-5.9s, LCP ~6.7-7.1s vs. Google's "good" cutoffs of 1.8s/2.5s) - root cause is a shared
 * ~300KB-compressed JS floor (GSAP loads on every route app-wide; two genuine attempts to defer
 * it did not reduce it - see MOBILE-PERF-BASELINE.md) plus infra-level TTFB under simulated Slow
 * 4G. Per this project's own "don't hide failures" testing rule, the assertions below use the
 * REAL target thresholds and are expected to fail honestly today rather than being set loose
 * enough to pass - see TESTING.md for what that means for reading this suite's results. The soft
 * assertions report every metric even after one fails; the hard assertion is a regression
 * ceiling, catching anything that makes this measurably worse than the already-known baseline.
 */

const SLOW_4G = { latencyMs: 150, downloadMbps: 1.6, uploadMbps: 0.75 };
const CPU_THROTTLE_RATE = 4;

interface Vitals {
  ttfb: number | null;
  fcp: number | null;
  lcp: number | null;
  approxTbt: number;
  longTaskCount: number;
  jsTransferBytes: number;
}

async function measureColdLoad(
  browser: import("@playwright/test").Browser,
  path: string,
  storageState?: string,
): Promise<Vitals> {
  const context = await browser.newContext({ ...devices["iPhone 13"], ...(storageState ? { storageState } : {}) });
  const page = await context.newPage();
  const client = await context.newCDPSession(page);

  await client.send("Network.enable");
  await client.send("Network.emulateNetworkConditions", {
    offline: false,
    latency: SLOW_4G.latencyMs,
    downloadThroughput: (SLOW_4G.downloadMbps * 1024 * 1024) / 8,
    uploadThroughput: (SLOW_4G.uploadMbps * 1024 * 1024) / 8,
  });
  await client.send("Emulation.setCPUThrottlingRate", { rate: CPU_THROTTLE_RATE });

  await page.addInitScript(() => {
    (window as unknown as { __longTasks: number[] }).__longTasks = [];
    new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        (window as unknown as { __longTasks: number[] }).__longTasks.push(entry.duration);
      }
    }).observe({ type: "longtask", buffered: true });
  });

  await page.goto(path, { waitUntil: "load", timeout: 30_000 });
  // Tried polling here for an actual LCP entry before reading (`waitForFunction`) - reverted.
  // Under 4x CPU throttle, evaluate-based polling itself has to queue behind the same saturated
  // main thread it's trying to observe, and in this sandboxed environment that made total
  // measurement time balloon past 135s instead of resolving early (confirmed: reverting to a
  // plain fixed wait brought it straight back to ~8s). A fixed wait sometimes leaves LCP
  // unresolved (reported as null below) - the same limitation PERF-BASELINE.md's own Pass 1
  // documented and worked around the same way, not a new problem introduced here.
  await page.waitForTimeout(1500);

  const vitals = await page.evaluate(() => {
    const nav = performance.getEntriesByType("navigation")[0] as PerformanceNavigationTiming | undefined;
    const paint = performance.getEntriesByType("paint");
    const fcp = paint.find((p) => p.name === "first-contentful-paint")?.startTime ?? null;
    const lcpEntries = performance.getEntriesByType("largest-contentful-paint");
    const lcp = lcpEntries.length ? lcpEntries[lcpEntries.length - 1].startTime : null;
    const longTasks = (window as unknown as { __longTasks: number[] }).__longTasks ?? [];
    const approxTbt = longTasks.reduce((sum, d) => sum + Math.max(0, d - 50), 0);
    const jsTransferBytes = performance
      .getEntriesByType("resource")
      .filter((r) => (r as PerformanceResourceTiming).initiatorType === "script")
      .reduce((sum, r) => sum + ((r as PerformanceResourceTiming).transferSize || 0), 0);
    return { ttfb: nav?.responseStart ?? null, fcp, lcp, approxTbt, longTaskCount: longTasks.length, jsTransferBytes };
  });

  await context.close();
  return vitals;
}

const ms = (n: number | null) => (n === null ? "n/a" : `${n.toFixed(0)}ms`);
const fmtVitals = (v: Vitals) =>
  `TTFB=${ms(v.ttfb)} FCP=${ms(v.fcp)} LCP=${ms(v.lcp)} approxTBT=${v.approxTbt.toFixed(0)}ms longTasks=${v.longTaskCount} JS=${(v.jsTransferBytes / 1024).toFixed(0)}KB`;

test.describe("Cold load, throttled mobile (iPhone 13, Slow 4G, 4x CPU)", () => {
  // Generous per-test budget, deliberately: a real 4x-CPU + Slow-4G-throttled load, plus polling
  // for LCP to actually finalize, plus this test file's own two-context measurement helper, is
  // legitimately slow - the default 45s is tuned for normal interaction tests, not throttled perf
  // measurement, and running several of these throttled contexts in parallel workers compounds
  // real resource contention. See package.json's test:e2e:perf script (--workers=1) for the other
  // half of this fix.
  test.slow();

  test("landing page (/) — logged out, first visit", async ({ browser }, testInfo) => {
    const v = await measureColdLoad(browser, "/");
    testInfo.annotations.push({
      type: "vitals",
      description: fmtVitals(v),
    });

    // Regression ceiling (hard fail) - well above the known-bad baseline (~5.9s/7.1s as of
    // 2026-08-12), so this only trips on a genuinely NEW regression, not the known gap itself.
    expect(v.fcp, "FCP regressed far past the known baseline").toBeLessThan(10_000);

    // Real targets (Google's Core Web Vitals "good" cutoffs). Expected to fail today - see this
    // file's own header comment and TESTING.md. Soft so every metric still gets reported even
    // after the first miss, matching spec §31's "don't hide failures" instruction: this is
    // supposed to show red until the bundle-splitting/TTFB follow-up in MOBILE-PERF-BASELINE.md
    // actually ships, not be quietly loosened to green.
    expect.soft(v.fcp, "FCP not under the 1.8s 'good' threshold (KNOWN GAP, see MOBILE-ROOT-CAUSE.md)").toBeLessThan(
      1800,
    );
    // LCP assertions only run when actually captured - this harness doesn't always resolve an
    // LCP entry under heavy CPU throttle (PERF-BASELINE.md's own Pass 1 hit the identical wall;
    // a robust wait-for-LCP fix was attempted here and reverted because it made total measurement
    // time balloon past two minutes in this sandboxed environment - see the comment above
    // `measureColdLoad`). Asserting on a `null` value would report a tooling gap as if it were a
    // real timing failure, which is its own kind of dishonest result - skipped with a clear
    // annotation instead, not silently.
    if (v.lcp !== null) {
      expect(v.lcp, "LCP regressed far past the known baseline").toBeLessThan(13_000);
      expect.soft(v.lcp, "LCP not under the 2.5s 'good' threshold (KNOWN GAP, see MOBILE-ROOT-CAUSE.md)").toBeLessThan(
        2500,
      );
    } else {
      testInfo.annotations.push({ type: "lcp-not-captured", description: "See comment above measureColdLoad." });
    }
  });

  test("/home — fresh direct load with a valid session (NOT the same scenario as MOBILE-ROOT-CAUSE.md's 492ms figure)", async ({
    browser,
  }, testInfo) => {
    // Reuses the already-authenticated storageState tests/setup/auth.setup.ts produced (real
    // sign-in, unthrottled, done once) in a brand-new browser context - i.e. "open a fresh
    // browser/private window with a valid token and go straight to /home", NOT "click through
    // from login in an already-loaded tab". This turned out to matter a lot, empirically: a
    // first run of this test asserted the same <1800ms target MOBILE-ROOT-CAUSE.md measured for
    // /home and got FCP~2.7s, which looked like a regression until checked against that prior
    // doc's own methodology note - its 492ms number is a CLIENT-SIDE ROUTE TRANSITION measured
    // right after an unthrottled login in the SAME page (framework/vendor JS already parsed);
    // this test does a genuine fresh top-level navigation (nothing warm). MOBILE-PERF-BASELINE.md
    // §3 already established /home and /auth share ~97% of the same ~1MB JS payload - so a fresh
    // /home load costing nearly what the landing page costs is consistent with that finding, not
    // a new defect. Kept as its own test (real, distinct, previously-uncleanly-isolated signal)
    // rather than deleted or silently reframed to pass.
    const v = await measureColdLoad(browser, "/home", DEMO_ACCOUNTS.talent.storageStatePath);
    testInfo.annotations.push({
      type: "vitals",
      description: fmtVitals(v),
    });

    // Regression ceiling only (hard) - same reasoning as the landing-page test above, not the
    // tight "good" target, since that target was never valid for THIS scenario to begin with.
    expect(v.fcp, "/home fresh-load FCP regressed far past a reasonable ceiling").toBeLessThan(10_000);

    // The tight target IS still meaningful for the warm-transition scenario MOBILE-ROOT-CAUSE.md
    // actually measured - soft here as a reminder that this test does NOT re-verify that number
    // (a real gap: nothing in this suite yet replicates the exact warm-transition methodology -
    // see TESTING.md backlog).
    expect
      .soft(v.fcp, "fresh-load FCP (expected to be well above the WARM-TRANSITION 492ms figure - see comment above, not a same-scenario regression)")
      .toBeLessThan(1800);
  });
});
