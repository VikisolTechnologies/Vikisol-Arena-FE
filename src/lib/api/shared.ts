/** Artificial network delay so the mock layer feels like a real API — swap-friendly later. */
export function delay<T>(value: T, ms = 350): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(value), ms));
}
