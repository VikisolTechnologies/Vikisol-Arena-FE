// Copies MapLibre's module worker (and the shared chunk it imports) into public/, versioned, so the
// live map can load it (the bundler can't follow MapLibre's import.meta.url worker lookup).
// Run after upgrading maplibre-gl: node scripts/dev/copy-maplibre-worker.mjs
// A stale copy is safe: the worker 404s and the map falls back to the static basemap.
import fs from "node:fs";
const { version } = JSON.parse(fs.readFileSync("node_modules/maplibre-gl/package.json", "utf8"));
const out = `public/vendor/maplibre/${version}`;
fs.rmSync("public/vendor/maplibre", { recursive: true, force: true });
fs.mkdirSync(out, { recursive: true });
for (const f of ["maplibre-gl-worker.mjs", "maplibre-gl-shared.mjs"]) fs.copyFileSync(`node_modules/maplibre-gl/dist/${f}`, `${out}/${f}`);
console.log("copied to", out);
