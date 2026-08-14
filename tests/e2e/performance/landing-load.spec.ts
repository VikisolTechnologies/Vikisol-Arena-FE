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
  await page.waitForTimeout(1000); // let LCP/long-task observers finish reporting

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

test.describe("Cold load, throttled mobile (iPhone 13, Slow 4G, 4x CPU)", () => {
  test("landing page (/) — logged out, first visit", async ({ browser }, testInfo) => {
    const v = await measureColdLoad(browser, "/");
    testInfo.annotations.push({
      type: "vitals",
      description: `TTFB=${v.ttfb?.toFixed(0)}ms FCP=${v.fcp?.toFixed(0)}ms LCP=${v.lcp?.toFixed(0)}ms approxTBT=${v.approxTbt.toFixed(0)}ms longTasks=${v.longTaskCount} JS=${(v.jsTransferBytes / 1024).toFixed(0)}KB`,
    });

    // Regression ceiling (hard fail) - well above the known-bad baseline (~5.9s/7.1s as of
    // 2026-08-12), so this only trips on a genuinely NEW regression, not the known gap itself.
    expect(v.fcp, "FCP regressed far past the known baseline").toBeLessThan(10_000);
    expect(v.lcp, "LCP regressed far past the known baseline").toBeLessThan(13_000);

    // Real targets (Google's Core Web Vitals "good" cutoffs). Expected to fail today - see this
    // file's own header comment and TESTING.md. Soft so every metric still gets reported even
    // after the first miss, matching spec §31's "don't hide failures" instruction: this is
    // supposed to show red until the bundle-splitting/TTFB follow-up in MOBILE-PERF-BASELINE.md
    // actually ships, not be quietly loosened to green.
    expect.soft(v.fcp, "FCP not under the 1.8s 'good' threshold (KNOWN GAP, see MOBILE-ROOT-CAUSE.md)").toBeLessThan(
      1800,
    );
    expect
      .soft(v.lcp, "LCP not under the 2.5s 'good' threshold (KNOWN GAP, see MOBILE-ROOT-CAUSE.md)")
      .toBeLessThan(2500);
  });

  test("/home — authenticated, fresh cache (this route is documented FAST, guards against a regression)", async ({
    browser,
  }, testInfo) => {
    // Reuses the already-authenticated storageState tests/setup/auth.setup.ts produced (real
    // sign-in, unthrottled, done once) rather than logging in inside the throttled context -
    // isolates "cost of loading /home with a valid session" from "cost of the login round trip
    // itself". Cache is genuinely empty here (a fresh context), so this is a slightly harder
    // scenario than MOBILE-ROOT-CAUSE.md's own "same warm context right after login" number -
    // described accurately rather than claimed as an identical re-run of that methodology.
    const v = await measureColdLoad(browser, "/home", DEMO_ACCOUNTS.talent.storageStatePath);
    testInfo.annotations.push({
      type: "vitals",
      description: `TTFB=${v.ttfb?.toFixed(0)}ms FCP=${v.fcp?.toFixed(0)}ms LCP=${v.lcp?.toFixed(0)}ms approxTBT=${v.approxTbt.toFixed(0)}ms longTasks=${v.longTaskCount} JS=${(v.jsTransferBytes / 1024).toFixed(0)}KB`,
    });

    // /home is documented as already meeting "good" targets even under this exact throttle
    // profile (MOBILE-ROOT-CAUSE.md: FCP 492ms, LCP 704ms) - unlike the landing-page test above,
    // these are hard assertions. A failure here is a genuine regression on the one path that was
    // previously confirmed fast, not a restatement of a known gap.
    expect(v.fcp, "/home FCP regressed past the documented-good baseline").toBeLessThan(1800);
    expect(v.lcp, "/home LCP regressed past the documented-good baseline").toBeLessThan(2500);
  });
});
