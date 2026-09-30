/**
 * Performance pass (docs/reviews/performance.md). Against a PRODUCTION build in production data
 * mode, served next to the stand-in API (scripts/dev/perf-api.mjs):
 *   node scripts/dev/perf-api.mjs &
 *   NEXT_PUBLIC_API_MODE=real NEXT_PUBLIC_ARENA_DATA=api NEXT_PUBLIC_API_BASE_URL=http://localhost:3199/api/v1 \
 *     ARENA_NEXT_DIST_DIR=.next-perf VERCEL=1 npx next build
 *   ARENA_NEXT_DIST_DIR=.next-perf npx next start -p 3200 &
 *   node scripts/dev/perf.mjs [--lighthouse] [--out file.json]
 *
 * 1. First-load JS per route: scripts requested before the page's load event, gzipped
 *    (idle-time extras like the command palette are reported separately).
 * 2. Interaction latency (INP proxy): a real tap on each screen with 4× CPU slowdown, longest
 *    Event Timing entry.
 * 3. --lighthouse: mobile Lighthouse (simulated 4G, 4× CPU) per screen, signed in; the median of
 *    RUNS runs (default 3) — single simulated runs swing by a second or more.
 */
import { chromium } from "@playwright/test";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { gzipSync } from "node:zlib";

const BASE = process.env.BASE ?? "http://localhost:3200";
const args = process.argv.slice(2);
const LH = args.includes("--lighthouse");
const OUT = args.includes("--out") ? args[args.indexOf("--out") + 1] : null;

const SCREENS = [
  { id: "feed", who: "person", path: "/home", tap: 'role=radio[name="This week"]' },
  { id: "discover", who: "person", path: "/discover", tap: 'role=radio[name="Activities"]' },
  { id: "activity", who: "person", path: "/feed/p1", tap: null },
  { id: "work", who: "person", path: "/work", tap: 'role=radio[name="Upcoming"]' },
  { id: "you", who: "person", path: "/identity", tap: 'role=radio[name="About"]' },
  { id: "map", who: "person", path: "/discover?view=map", tap: null },
  { id: "pipeline", who: "business", path: "/enterprise/postings/job-1?tab=candidates", tap: null },
];

async function seeded(who) {
  const dir = mkdtempSync(join(tmpdir(), `arena-perf-${who}-`));
  const ctx = await chromium.launchPersistentContext(dir, { viewport: { width: 412, height: 823 } });
  const page = await ctx.newPage();
  await seed(page, who);
  return { ctx, page, dir };
}

/** Signs the browser in (localStorage session, as the app keeps it) on BASE's origin. */
async function seed(page, who) {
  await page.goto(`${BASE}/privacy`);
  await page.evaluate((who) => {
    const set = (k, v) => localStorage.setItem(k, typeof v === "string" ? v : JSON.stringify(v));
    set("arena_cookie_consent", "accepted");
    set("arena_onboarded", "true");
    if (who === "business") {
      set("arena_session", { role: "company_admin", name: "Alex Rao", email: "alex@example.com" });
      set("arena_enterprise_onboarded", "true");
    } else {
      set("arena_session", { role: "talent", name: "Priya Sharma", email: "priya@example.com" });
      set("arena_entry_draft", { intents: ["activities"], area: "Gachibowli / Gopanapally", useCurrentLocation: false, interests: ["Running", "Volunteering"], displayName: "Priya Sharma", title: "Product Designer", intro: "", availability: ["Weekends"] });
    }
  }, who);
}

const results = {};
const profiles = {};
for (const who of ["person", "business"]) profiles[who] = await seeded(who);

for (const s of SCREENS) {
  const { ctx } = profiles[s.who];
  const page = await ctx.newPage();
  const scripts = new Map();
  let loaded = Infinity;
  page.on("load", () => (loaded = Date.now()));
  page.on("response", async (r) => {
    const url = r.url();
    if (r.request().resourceType() !== "script" || !url.startsWith(BASE)) return;
    const at = Date.now();
    try {
      scripts.set(url, { kb: gzipSync(await r.body()).length / 1024, at });
    } catch {
      /* redirected or aborted */
    }
  });
  const cdp = await ctx.newCDPSession(page);
  await cdp.send("Network.setCacheDisabled", { cacheDisabled: true });
  await page.goto(`${BASE}${s.path}`, { waitUntil: "networkidle" });
  await page.waitForTimeout(800);
  const all = [...scripts.values()];
  const first = all.filter((x) => x.at <= loaded);
  const sum = (xs) => Math.round(xs.reduce((a, x) => a + x.kb, 0));
  const r = { firstLoadJsGzKb: sum(first), scripts: first.length, afterLoadGzKb: sum(all) - sum(first) };
  if (s.tap) {
    await cdp.send("Emulation.setCPUThrottlingRate", { rate: 4 });
    await page.evaluate(() => {
      window.__inp = 0;
      new PerformanceObserver((l) => l.getEntries().forEach((e) => (window.__inp = Math.max(window.__inp, e.duration)))).observe({ type: "event", durationThreshold: 16, buffered: true });
    });
    try {
      await page.locator(s.tap).first().click({ timeout: 5000 });
      await page.waitForTimeout(1200);
      r.tapMs = Math.round(await page.evaluate(() => window.__inp));
    } catch {
      r.tapMs = null;
    }
    await cdp.send("Emulation.setCPUThrottlingRate", { rate: 1 });
  }
  results[s.id] = r;
  console.log(s.id, JSON.stringify(r));
  await page.close();
}

for (const who of Object.keys(profiles)) await profiles[who].ctx.close();

if (LH) {
  // Lighthouse's Node API with a Chrome that uses the seeded profile, so signed-in screens are
  // measured signed in. Lighthouse isn't a repo dependency: install it anywhere and point
  // LH_MODULES at that node_modules (e.g. `npm i --prefix /tmp/lh lighthouse@13 chrome-launcher@1`).
  const mods = process.env.LH_MODULES;
  if (!mods) throw new Error("Set LH_MODULES to a node_modules containing lighthouse@13 and chrome-launcher@1.");
  const { default: lighthouse } = await import(join(mods, "lighthouse/core/index.js"));
  const chromeLauncher = await import(join(mods, "chrome-launcher/dist/index.js"));
  const RUNS = Number(process.env.RUNS ?? 3);
  const median = (xs) => [...xs].sort((a, b) => a - b)[Math.floor(xs.length / 2)];
  for (const s of SCREENS) {
    const runs = [];
    for (let i = 0; i < RUNS; i++) {
      const chrome = await chromeLauncher.launch({ chromePath: chromium.executablePath(), chromeFlags: ["--headless=new"] });
      try {
        const cdp = await chromium.connectOverCDP(`http://127.0.0.1:${chrome.port}`);
        const page = await cdp.contexts()[0].newPage();
        await seed(page, s.who);
        await page.close();
        const run = await lighthouse(`${BASE}${s.path}`, { port: chrome.port, output: "json", onlyCategories: ["performance"], formFactor: "mobile", throttlingMethod: "simulate", disableStorageReset: true, logLevel: "error" });
        const lh = run.lhr;
        const a = lh.audits;
        runs.push({
          score: Math.round(lh.categories.performance.score * 100),
          lcpMs: Math.round(a["largest-contentful-paint"].numericValue),
          cls: Number(a["cumulative-layout-shift"].numericValue.toFixed(3)),
          tbtMs: Math.round(a["total-blocking-time"].numericValue),
          fcpMs: Math.round(a["first-contentful-paint"].numericValue),
          lcpElement: a["lcp-breakdown-insight"]?.details?.items?.find((i) => i.type === "node")?.nodeLabel?.slice(0, 80),
          lcpBreakdown: Object.fromEntries((a["lcp-breakdown-insight"]?.details?.items?.[0]?.items ?? []).map((i) => [i.subpart, Math.round(i.duration)])),
          url: lh.finalDisplayedUrl.replace(BASE, ""),
        });
      } finally {
        await chrome.kill();
      }
    }
    const pick = (k) => median(runs.map((r) => r[k]));
    const mid = runs.find((r) => r.lcpMs === pick("lcpMs")) ?? runs[0];
    results[s.id] = { ...results[s.id], ...mid, score: pick("score"), lcpMs: pick("lcpMs"), cls: pick("cls"), tbtMs: pick("tbtMs"), fcpMs: pick("fcpMs"), runs: runs.map((r) => [r.score, r.lcpMs]) };
    console.log(s.id, JSON.stringify(results[s.id]));
  }
}

if (OUT) writeFileSync(OUT, JSON.stringify(results, null, 2));
