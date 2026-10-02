import type { ComponentType } from "react";
import { BasketballGlyph, CricketGlyph, FootballGlyph, PaddleGlyph, PickleballGlyph, ShuttleGlyph, TennisGlyph } from "@/components/covers/Glyphs";
import {
  Bike, BookOpen, Brain, Brush, Camera, CookingPot, Crown, Dices, Drama, Dumbbell, Flag, Footprints, Gift, Guitar,
  HandHeart, Languages, Leaf, Library, Lightbulb, Mountain, Palette, PersonStanding, Recycle, Salad, Sparkles, Sprout, Tent,
  Trophy, Utensils, Volleyball, Waves, Bird, Cpu, Sun,
} from "lucide-react";

export type Icon = ComponentType<{ className?: string; strokeWidth?: number; "aria-hidden"?: boolean; x?: number; y?: number; width?: number; height?: number; color?: string; opacity?: number }>;

export interface Subtype {
  id: string;
  label: string;
  icon: Icon;
}
export interface Category {
  id: string;
  label: string;
  icon: Icon;
  /** Two colours for covers and tiles (dark → light), hex. */
  palette: [string, string];
  subtypes: Subtype[];
}

/** ARENA-APP-FLOW §3 A1 — the activity types. Adding a type = a line here + a schema entry. */
export const CATEGORIES: Category[] = [
  {
    id: "sports", label: "Sports", icon: Trophy, palette: ["#1f5b3a", "#7fb45a"],
    subtypes: [
      { id: "cricket", label: "Cricket", icon: CricketGlyph },
      { id: "badminton", label: "Badminton", icon: ShuttleGlyph },
      { id: "football", label: "Football", icon: FootballGlyph },
      { id: "volleyball", label: "Volleyball", icon: Volleyball },
      { id: "basketball", label: "Basketball", icon: BasketballGlyph },
      { id: "tennis", label: "Tennis", icon: TennisGlyph },
      { id: "table-tennis", label: "Table tennis", icon: PaddleGlyph },
      { id: "pickleball", label: "Pickleball", icon: PickleballGlyph },
      { id: "swimming", label: "Swimming", icon: Waves },
    ],
  },
  {
    id: "fitness", label: "Fitness", icon: Dumbbell, palette: ["#8a2d12", "#ff7a3d"],
    subtypes: [
      { id: "running", label: "Running", icon: Footprints },
      { id: "walking", label: "Walking", icon: PersonStanding },
      { id: "cycling", label: "Cycling", icon: Bike },
      { id: "yoga", label: "Yoga", icon: Sun },
      { id: "gym-buddy", label: "Gym buddy", icon: Dumbbell },
    ],
  },
  {
    id: "outdoors", label: "Outdoors", icon: Mountain, palette: ["#123f47", "#4f9d8c"],
    subtypes: [
      { id: "trekking", label: "Trekking", icon: Mountain },
      { id: "hiking", label: "Hiking", icon: Footprints },
      { id: "camping", label: "Camping", icon: Tent },
      { id: "birdwatching", label: "Birdwatching", icon: Bird },
      { id: "photo-walk", label: "Photo walk", icon: Camera },
    ],
  },
  {
    id: "learning", label: "Learning", icon: BookOpen, palette: ["#1d2f6b", "#5b86d6"],
    subtypes: [
      { id: "workshop", label: "Workshop", icon: Lightbulb },
      { id: "study-group", label: "Study group", icon: Library },
      { id: "language-exchange", label: "Language exchange", icon: Languages },
      { id: "book-club", label: "Book club", icon: BookOpen },
      { id: "tech-meetup", label: "Tech meetup", icon: Cpu },
    ],
  },
  {
    id: "arts", label: "Arts & culture", icon: Palette, palette: ["#4a1d5c", "#c46aa8"],
    subtypes: [
      { id: "music-jam", label: "Music jam", icon: Guitar },
      { id: "pottery", label: "Pottery", icon: Brush },
      { id: "painting", label: "Painting", icon: Palette },
      { id: "dance", label: "Dance", icon: Sparkles },
      { id: "theatre", label: "Theatre", icon: Drama },
    ],
  },
  {
    id: "games", label: "Games", icon: Dices, palette: ["#4d3312", "#c9923a"],
    subtypes: [
      { id: "board-games", label: "Board games", icon: Dices },
      { id: "chess", label: "Chess", icon: Crown },
      { id: "quiz-night", label: "Quiz night", icon: Brain },
    ],
  },
  {
    id: "food", label: "Food", icon: Utensils, palette: ["#7a1f1a", "#e0673a"],
    subtypes: [
      { id: "potluck", label: "Potluck", icon: Salad },
      { id: "cook-together", label: "Cook together", icon: CookingPot },
      { id: "food-walk", label: "Food walk", icon: Utensils },
    ],
  },
  {
    id: "community", label: "Community", icon: HandHeart, palette: ["#2b4a1f", "#8aa84a"],
    subtypes: [
      { id: "clean-up", label: "Clean-up", icon: Recycle },
      { id: "tree-planting", label: "Tree planting", icon: Sprout },
      { id: "volunteering", label: "Volunteering", icon: HandHeart },
      { id: "donation-drive", label: "Donation drive", icon: Gift },
    ],
  },
  {
    id: "other", label: "Other", icon: Flag, palette: ["#6b2a10", "#ff5a1f"],
    subtypes: [{ id: "other", label: "Something else", icon: Leaf }],
  },
];

export const ALL_SUBTYPES = CATEGORIES.flatMap((c) => c.subtypes.map((s) => ({ ...s, category: c })));

/** M6 area 3b: GET /activities/kinds is the real source of which categories/subtypes are
 * currently offered (`ActivityCatalogue.catalogue()`) — this file keeps the design (icons,
 * colours, labels) locally since the backend only returns plain category→subtype-id strings,
 * nothing visual. "other" always stays available as the catch-all, same as the backend's own
 * handling of an unrecognised subtype. Falls back to the full local list if `kinds` is
 * undefined (mock mode, or the endpoint unreachable) — never a hard failure on this screen. */
export function liveCategories(kinds: Record<string, string[]> | undefined): Category[] {
  if (!kinds) return CATEGORIES;
  return CATEGORIES.map((c) => {
    if (c.id === "other") return c;
    const allowed = new Set(kinds[c.id] ?? []);
    return { ...c, subtypes: c.subtypes.filter((s) => allowed.has(s.id)) };
  }).filter((c) => c.id === "other" || c.subtypes.length > 0);
}

export function findSubtype(id: string | undefined) {
  return ALL_SUBTYPES.find((s) => s.id === id);
}

/** Best guess of category/subtype for an existing post from its tags and words (for covers on
 *  posts that predate the intake). Honest fallback: "other". */
export function guessType(post: { tags?: string[]; title?: string; body?: string }) {
  const hay = [...(post.tags ?? []), post.title ?? "", post.body ?? ""].join(" ").toLowerCase();
  const sub = ALL_SUBTYPES.find((s) => s.id !== "other" && (hay.includes(s.id.replace(/-/g, " ")) || hay.includes(s.label.toLowerCase())));
  if (sub) return { category: sub.category, subtype: sub };
  const cat = CATEGORIES.find((c) => c.id !== "other" && hay.includes(c.label.toLowerCase().split(" ")[0]));
  const category = cat ?? CATEGORIES[CATEGORIES.length - 1];
  return { category, subtype: category.subtypes[0] };
}

