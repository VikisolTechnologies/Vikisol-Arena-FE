/**
 * Preview-only fixtures for the few B+ regions that have no backend yet (docs/FE-API-GAPS.md).
 * Fictional people and places-as-geography only; in mock mode the Avatar shows the credited
 * preview photo for these names (public/fixtures/CREDITS.md). No real brands. Every region rendering these must show <PreviewPill /> and must not render
 * at all when FIXTURES_ALLOWED is false (api mode).
 */

export interface PreviewPerson {
  id: string;
  name: string;
  distanceKm: number;
  interests: string[];
}

export const PREVIEW_PEOPLE: PreviewPerson[] = [
  { id: "p-ananya", name: "Ananya Rao", distanceKm: 2.1, interests: ["Urban gardening"] },
  { id: "p-rohit", name: "Rohit Varma", distanceKm: 1.8, interests: ["Running", "Sustainability"] },
  { id: "p-meera", name: "Meera Iyer", distanceKm: 3.4, interests: ["Photography", "Local events"] },
  { id: "p-kabir", name: "Kabir Das", distanceKm: 2.7, interests: ["Cycling"] },
  { id: "p-lakshmi", name: "Lakshmi Devi", distanceKm: 0.9, interests: ["Cooking", "Gardening"] },
];

export interface PreviewSkill {
  id: string;
  label: string;
  nearby: number;
  tone: "info" | "success" | "primary";
}

export const PREVIEW_SKILLS: PreviewSkill[] = [
  { id: "s-ux", label: "UI/UX Design", nearby: 3, tone: "info" },
  { id: "s-cycle", label: "Cycles & Repairs", nearby: 5, tone: "success" },
  { id: "s-tutor", label: "Maths tutoring", nearby: 2, tone: "primary" },
];

export interface PreviewSuggestion {
  headline: string;
  detail: string;
  why: { icon: "interest" | "distance" | "people" | "trend"; text: string }[];
  source: string;
}

/** Jenny's "For you" card until the v2 contract exists (P8). Evidence lines, never a score. */
export const PREVIEW_JENNY_SUGGESTION: PreviewSuggestion = {
  headline: "You might enjoy the Sunrise Run tomorrow at Durgam Lake.",
  detail: "It matches your interest in running, happens nearby, and people you know are going.",
  why: [
    { icon: "interest", text: "Matches your interests" },
    { icon: "distance", text: "1.2 km from you" },
    { icon: "people", text: "People you know are going" },
    { icon: "trend", text: "Popular in your area this month" },
  ],
  source: "Source: your activity, interests and nearby trends.",
};

export const PREVIEW_JENNY_IDEAS: { title: string; detail: string }[] = [
  { title: "Find a weekend badminton group", detail: "Beginner-friendly games near Gachibowli" },
  { title: "Offer a skill you already have", detail: "Neighbours often ask for tutoring and repairs" },
  { title: "Start a lake clean-up", detail: "Jenny drafts the post; you approve before it's shared" },
];
