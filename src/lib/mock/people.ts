/**
 * The preview world's neighbours (mock mode only), read from the one world file
 * (src/lib/fixtures/world.ts). Nothing here is read in real ("api") mode.
 */
import { PEOPLE } from "@/lib/fixtures/world";

export interface PreviewNeighbour {
  key: string;
  name: string;
  photo: string;
  area: string;
  title: string;
}

/** cand-1 … cand-13 in MOCK_CANDIDATES are these people, in this order. */
export const PREVIEW_NEIGHBOURS: PreviewNeighbour[] = PEOPLE.map(({ key, name, photo, area, title }) => ({ key, name, photo, area, title }));

const BY_NAME = new Map(PREVIEW_NEIGHBOURS.map((p) => [p.name, p.photo]));

/** The preview photo for a neighbour's full name, or undefined. Never used in real mode — the
 *  caller checks. Full names only, so two different people never share a face. */
export function previewPhotoForName(name?: string | null) {
  if (!name) return undefined;
  return BY_NAME.get(name.trim());
}

/** Stable pick of `n` neighbours for a given seed (e.g. who's "going" to a preview activity). */
export function previewPeopleFor(seed: string, n: number, exclude?: string) {
  let h = 0;
  for (const ch of seed) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  const pool = PREVIEW_NEIGHBOURS.filter((p) => p.name !== exclude);
  return Array.from({ length: Math.min(n, pool.length) }, (_, i) => pool[(h + i * 5) % pool.length]);
}
