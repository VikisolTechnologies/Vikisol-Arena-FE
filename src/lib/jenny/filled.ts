/** "Jenny filled — check" markers per intake draft (kept apart from the schemas so every intake
 *  page doesn't load every schema). */
export const filledKey = (draftKey: string) => `arena_jenny_filled_${draftKey}`;

export function readJennyFilled(draftKey: string): string[] {
  try {
    const raw = localStorage.getItem(filledKey(draftKey));
    return raw ? (JSON.parse(raw) as string[]) : [];
  } catch {
    return [];
  }
}
export function writeJennyFilled(draftKey: string, ids: string[]) {
  try {
    if (ids.length) localStorage.setItem(filledKey(draftKey), JSON.stringify(ids));
    else localStorage.removeItem(filledKey(draftKey));
  } catch {
    /* storage blocked */
  }
}
