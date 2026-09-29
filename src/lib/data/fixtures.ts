/**
 * Preview-only fixtures for the few B+ regions that have no backend yet (docs/FE-API-GAPS.md).
 * Fictional people and places-as-geography only; in mock mode the Avatar shows the credited
 * preview photo for these names (public/fixtures/CREDITS.md). No real brands. Every region rendering these must show <PreviewPill /> and must not render
 * at all when FIXTURES_ALLOWED is false (api mode).
 */

import { person } from "@/lib/fixtures/world";

export interface PreviewPerson {
  id: string;
  name: string;
  distanceKm: number;
  interests: string[];
}

/** People near Priya, from the one preview world (src/lib/fixtures/world.ts). */
const NEAR: [key: string, km: number][] = [["ananya", 2.1], ["rohit", 0.6], ["meera", 0.9], ["kabir", 2.7], ["lakshmi", 0.4]];
export const PREVIEW_PEOPLE: PreviewPerson[] = NEAR.map(([key, distanceKm]) => {
  const p = person(key);
  return { id: p.id, name: p.name, distanceKm, interests: p.interests.slice(0, 2) };
});

export interface PreviewSkill {
  id: string;
  label: string;
  nearby: number;
  tone: "info" | "success" | "primary";
}

export const PREVIEW_SKILLS: PreviewSkill[] = [
  { id: "s-ux", label: "UI/UX Design", nearby: 3, tone: "info" },
  { id: "s-photo", label: "Photography", nearby: 1, tone: "success" },
  { id: "s-tutor", label: "Maths tutoring", nearby: 1, tone: "primary" },
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
    { icon: "distance", text: "4.3 km from you" },
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
