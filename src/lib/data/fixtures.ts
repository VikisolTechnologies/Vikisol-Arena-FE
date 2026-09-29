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
