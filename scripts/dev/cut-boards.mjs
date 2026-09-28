// Cuts every phone frame out of the design boards into public/dev/boards/<screen-id>.webp for
// /dev/progress and /dev/compare. Frame geometry is measured per board layout (7 phones each).
// Run: node scripts/dev/cut-boards.mjs
import sharp from "sharp";
import { mkdirSync } from "node:fs";
import { SCREENS } from "../../src/lib/dev/screens-manifest.mjs";

const B_PLUS = { xs: [12, 276, 540, 803, 1066, 1328, 1592], y: 150, w: 256, h: 640 }; // 1855×848 boards
const VNEXT = { xs: [14, 290, 565, 841, 1116, 1392, 1668], y: 148, w: 262, h: 618 }; // 1944×809 boards
const LAYOUT = { "jenny-layer": VNEXT, "jenny-automation": VNEXT };

mkdirSync("public/dev/boards", { recursive: true });
for (const s of SCREENS) {
  const g = LAYOUT[s.board] ?? B_PLUS;
  await sharp(`docs/design/boards/${s.board}.png`)
    .extract({ left: g.xs[s.index - 1], top: g.y, width: g.w, height: g.h })
    .resize({ width: 390 * 2, kernel: "lanczos3" })
    .webp({ quality: 80 })
    .toFile(`public/dev/boards/${s.id}.webp`);
}
console.log(`cut ${SCREENS.length} frames`);
