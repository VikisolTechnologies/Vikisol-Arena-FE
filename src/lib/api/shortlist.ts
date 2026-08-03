import { delay } from "./shared";
import { isRealMode } from "./mode";
import { apiFetch } from "./httpClient";

const KEY = "arena_shortlist";

function readLocal(): string[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(KEY) || "[]");
  } catch {
    return [];
  }
}

export async function getShortlistIds(): Promise<string[]> {
  if (isRealMode()) return apiFetch<string[]>("/enterprise/shortlist");
  return delay(readLocal(), 100);
}

export async function toggleShortlist(candidateId: string): Promise<string[]> {
  if (isRealMode()) return apiFetch<string[]>(`/enterprise/shortlist/${candidateId}/toggle`, { method: "POST" });
  const current = readLocal();
  const next = current.includes(candidateId) ? current.filter((id) => id !== candidateId) : [...current, candidateId];
  localStorage.setItem(KEY, JSON.stringify(next));
  return delay(next, 150);
}
