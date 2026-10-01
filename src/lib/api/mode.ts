/** Single switch between the mock/localStorage layer this app was built against and the real
 * arena-api backend. Defaults to mock so local dev and demos never need a running backend —
 * set NEXT_PUBLIC_ARENA_DATA=api in .env.local to hit arena-api instead.
 *
 * M6 area 2 (architect note, 1 Oct 2026): this used to be its own flag, NEXT_PUBLIC_API_MODE,
 * separate from NEXT_PUBLIC_ARENA_DATA (src/lib/data/mode.ts's fixtures-allowed / production
 * build guard). One flag now drives both — "api" means real everywhere — so production and
 * local setup only ever need to set one variable. */
export function isRealMode(): boolean {
  return process.env.NEXT_PUBLIC_ARENA_DATA === "api";
}

export const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8081/api/v1";
