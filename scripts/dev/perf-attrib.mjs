/**
 * Which sources the first load of a route actually ships (needs a production-mode build with
 * ARENA_SOURCEMAPS=1 into .next-perf, served on :3200 — see perf.mjs).
 *   node scripts/dev/perf-attrib.mjs /home [person|business] [path-substring-to-detail]
 */
import { chromium } from "@playwright/test";
import { readFileSync, existsSync } from "node:fs";
import { gzipSync } from "node:zlib";
import sm from "source-map-js";

const argv = process.argv.slice(2);
// --static <app route dir, e.g. enterprise/postings/[id]>: the route's first-load files from the
// build manifests (route-js.mjs), instead of whatever the browser fetched before `load`.
const staticRoute = argv.includes("--static") ? argv.splice(argv.indexOf("--static"), 2)[1] : null;
const [path = "/home", who = "person", detail] = argv;
const urls = new Set();
if (staticRoute) {
  const { createRequire } = await import("node:module");
  const dir = `.next-perf/server/app/${staticRoute}`;
  globalThis.__RSC_MANIFEST = {};
  createRequire(import.meta.url)(`${process.cwd()}/${dir}/page_client-reference-manifest.js`);
  const m = Object.values(globalThis.__RSC_MANIFEST)[0];
  const root = JSON.parse(readFileSync(`${dir}/page/build-manifest.json`, "utf8")).rootMainFiles;
  for (const f of [...root, ...Object.values(m.entryJSFiles).flat()]) urls.add(`http://x/_next/${f}`);
}
const b = await chromium.launch();
const page = await (await b.newContext()).newPage();
await page.goto("http://localhost:3200/privacy");
await page.evaluate((who) => {
  localStorage.setItem("arena_cookie_consent", "accepted");
  localStorage.setItem("arena_onboarded", "true");
  localStorage.setItem("arena_enterprise_onboarded", "true");
  localStorage.setItem("arena_session", JSON.stringify(who === "business" ? { role: "company_admin", name: "Alex Rao", email: "a@e.com" } : { role: "talent", name: "Priya Sharma", email: "p@e.com" }));
}, who);
let loaded = !!staticRoute;
page.on("load", () => (loaded = true));
page.on("request", (r) => !loaded && r.resourceType() === "script" && r.url().includes("/_next/static/chunks/") && urls.add(r.url()));
await page.goto(`http://localhost:3200${path}`, { waitUntil: "networkidle" });
await page.waitForTimeout(800);
await b.close();

const agg = new Map();
let total = 0;
for (const u of urls) {
  const name = u.split("/_next/static/chunks/")[1].split("?")[0];
  const file = `.next-perf/static/chunks/${name}`;
  const code = readFileSync(file, "utf8");
  const gz = gzipSync(code).length;
  total += gz;
  const lines = code.split("\n");
  const per = new Map();
  const mapName = code.match(/sourceMappingURL=(\S+)\s*$/)?.[1];
  const mapFile = mapName ? `.next-perf/static/chunks/${mapName}` : `${file}.map`;
  if (existsSync(mapFile)) {
    const c = new sm.SourceMapConsumer(JSON.parse(readFileSync(mapFile, "utf8")));
    const maps = [];
    c.eachMapping((m) => maps.push(m));
    for (let i = 0; i < maps.length; i++) {
      const m = maps[i], n = maps[i + 1];
      const end = n && n.generatedLine === m.generatedLine ? n.generatedColumn : lines[m.generatedLine - 1]?.length ?? m.generatedColumn;
      const key = m.source ?? "(unmapped)";
      per.set(key, (per.get(key) ?? 0) + Math.max(0, end - m.generatedColumn));
    }
  }
  const raw = [...per.values()].reduce((a, v) => a + v, 0) || 1;
  if (!per.size) per.set(`(no map) ${name}`, raw);
  for (const [src, bytes] of per) {
    const s = src.replace(/\/\/+/g, "/");
    const mod = s.match(/node_modules\/((?:@[^/]+\/)?[^/]+)/);
    const key = detail && s.includes(detail) ? s.slice(s.indexOf(detail)) : mod ? `npm:${mod[1]}` : (s.match(/src\/[^/]+\/[^/]+/)?.[0] ?? s.slice(-60));
    agg.set(key, (agg.get(key) ?? 0) + (bytes / raw) * gz);
  }
}
console.log(path, "scripts", urls.size, "gzip KB", Math.round(total / 1024));
const rows = [...agg].sort((a, b) => b[1] - a[1]);
if (detail) {
  const mine = rows.filter(([k]) => k.includes(detail));
  console.log(detail, "total KB", (mine.reduce((a, [, v]) => a + v, 0) / 1024).toFixed(1), "files", mine.length);
  for (const [k, v] of mine.slice(0, 40)) console.log((v / 1024).toFixed(1).padStart(6), k);
} else for (const [k, v] of rows.slice(0, 30)) console.log((v / 1024).toFixed(1).padStart(6), k);
