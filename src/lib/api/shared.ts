/** A small artificial delay so the mock layer stays asynchronous like a real API. Capped at 60 ms
 *  (review A11): the old 150–400 ms per call chained into multi-second skeletons on phones. */
export const MOCK_DELAY_CAP_MS = 60;
export function delay<T>(value: T, ms = 60): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(value), Math.min(ms, MOCK_DELAY_CAP_MS)));
}
