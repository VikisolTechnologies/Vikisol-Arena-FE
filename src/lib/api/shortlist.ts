import { apiFetch } from "./httpClient";

export async function getShortlistIds(): Promise<string[]> {
  return apiFetch<string[]>("/enterprise/shortlist");
}

export async function toggleShortlist(candidateId: string): Promise<string[]> {
  return apiFetch<string[]>(`/enterprise/shortlist/${candidateId}/toggle`, { method: "POST" });
}
