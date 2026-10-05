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
  return apiFetch<string[]>("/enterprise/shortlist");
}

export async function toggleShortlist(candidateId: string): Promise<string[]> {
  return apiFetch<string[]>(`/enterprise/shortlist/${candidateId}/toggle`, { method: "POST" });
}
