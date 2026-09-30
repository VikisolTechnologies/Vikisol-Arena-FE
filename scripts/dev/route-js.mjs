/**
 * First-load JS per route from a production build (Next 16 no longer prints sizes): the shared
 * runtime files plus every entry chunk the route's HTML asks for (layout, page, not-found,
 * global-error, metadata), gzipped. Lazy chunks (next/dynamic, import()) are not counted.
 *   node scripts/dev/route-js.mjs [.next-perf] [--json out.json]
 */
import { existsSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { join, relative } from "node:path";
import { createRequire } from "node:module";
import { gzipSync } from "node:zlib";

const args = process.argv.slice(2);
const dist = args.find((a) => !a.startsWith("--") && !a.endsWith(".json")) ?? ".next-perf";
const jsonOut = args.includes("--json") ? args[args.indexOf("--json") + 1] : null;
const require = createRequire(import.meta.url);
const gz = new Map();
const size = (f) => {
  if (!gz.has(f)) gz.set(f, gzipSync(readFileSync(join(dist, f))).length);
  return gz.get(f);
};

const appDir = join(dist, "server/app");
const manifests = [];
(function walk(dir) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p);
    else if (name === "page_client-reference-manifest.js") manifests.push(p);
  }
})(appDir);

const rows = [];
for (const file of manifests) {
  const route = "/" + relative(appDir, file).replace(/\/?page_client-reference-manifest\.js$/, "");
  if (route.startsWith("/dev") || route.startsWith("/_")) continue;
  globalThis.__RSC_MANIFEST = {};
  require(file.startsWith("/") ? file : join(process.cwd(), file));
  const m = Object.values(globalThis.__RSC_MANIFEST)[0];
  const buildManifest = join(file.replace(/page_client-reference-manifest\.js$/, ""), "page/build-manifest.json");
  const root = existsSync(buildManifest) ? JSON.parse(readFileSync(buildManifest, "utf8")).rootMainFiles : [];
  const files = new Set([...root, ...Object.values(m.entryJSFiles ?? {}).flat()]);
  const total = [...files].reduce((a, f) => a + size(f), 0);
  const shared = root.reduce((a, f) => a + size(f), 0);
  rows.push({ route: route === "/" ? "/" : route.replace(/\/$/, ""), kb: Math.round(total / 1024), sharedKb: Math.round(shared / 1024) });
}
rows.sort((a, b) => b.kb - a.kb);
for (const r of rows) console.log(`${String(r.kb).padStart(4)} KB  ${r.route}`);
console.log(`shared runtime (in every route): ${rows[0]?.sharedKb ?? 0} KB`);
if (jsonOut) writeFileSync(jsonOut, JSON.stringify(rows, null, 2));
