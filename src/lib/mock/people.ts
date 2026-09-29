/**
 * The preview world's neighbours (mock mode only). Fictional names; the photos are free-licence
 * portraits credited in public/fixtures/CREDITS.md — the people pictured are not these names.
 * Nothing here is read in real ("api") mode.
 */

export interface PreviewNeighbour {
  key: string;
  name: string;
  photo: string;
  area: string;
  title: string;
}

const P = (key: string, name: string, area: string, title: string): PreviewNeighbour => ({ key, name, photo: `/fixtures/people/${key}.webp`, area, title });

/** cand-1 … cand-13 in MOCK_CANDIDATES take these names, in this order. */
export const PREVIEW_NEIGHBOURS: PreviewNeighbour[] = [
  P("priya", "Priya Sharma", "Gachibowli", "Product Designer"),
  P("rohit", "Rohit Varma", "Gachibowli", "Frontend Developer"),
  P("ananya", "Ananya Rao", "Kondapur", "Photographer"),
  P("arjun", "Arjun Nair", "Nanakramguda", "Community Associate"),
  P("meera", "Meera Iyer", "Gachibowli", "Maths Teacher"),
  P("ravi", "Ravi Kumar", "Gopanpally", "Logistics Coordinator"),
  P("kavya", "Kavya Reddy", "Madhapur", "UX Researcher"),
  P("kabir", "Kabir Das", "Kondapur", "Data Engineer"),
  P("lakshmi", "Lakshmi Devi", "Gachibowli", "Home Chef"),
  P("sameer", "Sameer Joshi", "Madhapur", "Account Manager"),
  P("sunita", "Sunita Menon", "Kondapur", "Event Planner"),
  P("venkat", "Venkat Rao", "Nanakramguda", "Retired Engineer"),
  P("divya", "Divya Nair", "Gachibowli", "Clinical Coordinator"),
];

const BY_NAME = new Map(PREVIEW_NEIGHBOURS.map((p) => [p.name, p.photo]));
const BY_FIRST = new Map(PREVIEW_NEIGHBOURS.map((p) => [p.name.split(" ")[0], p.photo]));

/** The preview photo for a neighbour's name (full name, else first name — specimens vary the
 *  surname), or undefined. Never used in real mode — the caller checks. */
export function previewPhotoForName(name?: string | null) {
  if (!name) return undefined;
  const n = name.trim();
  return BY_NAME.get(n) ?? BY_FIRST.get(n.split(" ")[0]);
}

/** Stable pick of `n` neighbours for a given seed (e.g. who's "going" to a preview activity). */
export function previewPeopleFor(seed: string, n: number, exclude?: string) {
  let h = 0;
  for (const ch of seed) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  const pool = PREVIEW_NEIGHBOURS.filter((p) => p.name !== exclude);
  return Array.from({ length: Math.min(n, pool.length) }, (_, i) => pool[(h + i * 5) % pool.length]);
}
