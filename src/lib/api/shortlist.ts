const KEY = "arena_shortlist";

export function getShortlistIds(): string[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(KEY) || "[]");
  } catch {
    return [];
  }
}

export function toggleShortlist(candidateId: string): string[] {
  const current = getShortlistIds();
  const next = current.includes(candidateId) ? current.filter((id) => id !== candidateId) : [...current, candidateId];
  localStorage.setItem(KEY, JSON.stringify(next));
  return next;
}
