/**
 * Architect review shots: a full-page PNG of every screen marked "built" in
 * src/lib/dev/screens.json, opened the way the compare page opens it (through /dev/person,
 * /dev/business or /dev/admin, which sign the browser in on the preview world).
 *   ARENA_NEXT_DIST_DIR=.next-founder npm run dev -- -H 0.0.0.0 -p 3001   (or any preview server)
 *   node scripts/dev/review-shots.mjs [--out docs/reviews/shots/review4] [--only id,id]
 * 390×844 at 1x; admin screens 1280×800. Reduced motion is emulated so nothing is mid-animation.
 * Writes <id>.png plus INDEX.md (id, route, board frame). The PNGs are not committed.
 */
import { chromium } from "@playwright/test";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const BASE = process.env.BASE ?? "http://localhost:3001";
const args = process.argv.slice(2);
const arg = (name, fallback) => (args.includes(name) ? args[args.indexOf(name) + 1] : fallback);
const OUT = arg("--out", "docs/reviews/shots/review4");
const ONLY = arg("--only", "")?.split(",").filter(Boolean);

const allBuilt = JSON.parse(readFileSync("src/lib/dev/screens.json", "utf8")).filter((s) => s.status === "built" && s.route);
const screens = allBuilt.filter((s) => !ONLY.length || ONLY.includes(s.id));
mkdirSync(OUT, { recursive: true });

const isAdmin = (s) => s.route.startsWith("/dev/admin") || s.route.startsWith("/admin");
const seeded = (route) => /^\/dev\/(person|business|admin)\b/.test(route);
const finalPathOf = (route) => {
  const u = new URL(route, BASE);
  return seeded(route) ? new URL(u.searchParams.get("to") ?? "/", BASE).pathname : u.pathname;
};

const browser = await chromium.launch();
const failures = [];
let done = 0;

async function shoot(s) {
  const admin = isAdmin(s);
  const ctx = await browser.newContext({
    viewport: admin ? { width: 1280, height: 800 } : { width: 390, height: 844 },
    deviceScaleFactor: 1,
    reducedMotion: "reduce",
    isMobile: false,
  });
  // Specimens under /dev/screen/* don't go through a sign-in helper: accept cookies up front so the bar never sits across a shot.
  await ctx.addInitScript(() => localStorage.setItem("arena_cookie_consent", "accepted"));
  const page = await ctx.newPage();
  try {
    await page.goto(BASE + s.route, { waitUntil: "load", timeout: 120_000 });
    const want = finalPathOf(s.route);
    await page.waitForURL((u) => u.pathname === want || (!seeded(s.route) && u.pathname.startsWith(want)), { timeout: 120_000 });
    await page.waitForLoadState("networkidle", { timeout: 60_000 }).catch(() => {});
    // Hide the Next dev indicator so it never lands in a shot.
    await page.addStyleTag({ content: "nextjs-portal{display:none!important}" });
    // Lazy images only load when near the viewport: walk the page once so a full-page capture has them.
    await page.evaluate(async () => {
      const h = document.documentElement.scrollHeight;
      for (let y = 0; y < h; y += 500) {
        window.scrollTo(0, y);
        await new Promise((r) => setTimeout(r, 80));
      }
      window.scrollTo(0, 0);
    });
    // Bounded: an image that never loads must not stall the run (it shows as it would to a person).
    await page.evaluate(() =>
      Promise.race([
        (async () => {
          await document.fonts.ready;
          await Promise.all([...document.images].map((i) => i.decode().catch(() => {})));
        })(),
        new Promise((r) => setTimeout(r, 10_000)),
      ]),
    );
    await page.waitForLoadState("networkidle", { timeout: 30_000 }).catch(() => {});
    // Finite animations run to their end; endless ones (spinners) are left alone, never awaited.
    await page.evaluate(() =>
      Promise.race([
        Promise.all(document.getAnimations().filter((a) => a.effect?.getComputedTiming().iterations !== Infinity).map((a) => a.finished.catch(() => {}))),
        new Promise((r) => setTimeout(r, 4000)),
      ]),
    );
    await page.waitForTimeout(600);
    await page.screenshot({ path: join(OUT, `${s.id}.png`), fullPage: true });
  } finally {
    await ctx.close();
  }
}

const queue = [...screens];
const worker = async () => {
  for (let s; (s = queue.shift()); ) {
    let ok = false;
    for (let attempt = 1; attempt <= 2 && !ok; attempt++) {
      try {
        await shoot(s);
        ok = true;
      } catch (e) {
        if (attempt === 2) failures.push(`${s.id}: ${String(e).split("\n")[0]}`);
      }
    }
    console.log(`${++done}/${screens.length} ${ok ? "ok  " : "FAIL"} ${s.id}`);
  }
};
await Promise.all([worker(), worker(), worker()]);
await browser.close();

const boardFile = (s) => {
  if (s.board === "none") return "no board";
  const f = `public/dev/boards/${s.id}.webp`;
  return existsSync(f) ? f : "no board";
};
const captured = allBuilt.filter((s) => existsSync(join(OUT, `${s.id}.png`)));
const lines = [
  "# Review 3 screenshots",
  "",
  `Generated ${new Date().toISOString()} from ${BASE} by scripts/dev/review-shots.mjs. ${captured.length} of ${allBuilt.length} Built screens captured (people and business 390×844, admin 1280×800, full page, reduced motion).`,
  "",
  "`id` — route — board frame",
  "",
  ...allBuilt.map((s) => `- \`${s.id}\` — ${s.route} — ${boardFile(s)}${existsSync(join(OUT, `${s.id}.png`)) ? "" : " — **CAPTURE FAILED**"}`),
  "",
];
writeFileSync(join(OUT, "INDEX.md"), lines.join("\n"));
console.log(`\n${captured.length}/${allBuilt.length} shots in ${OUT}`);
if (failures.length) {
  console.log("Failures:\n" + failures.join("\n"));
  process.exitCode = 1;
}
