/** Single switch between the mock/localStorage layer this app was built against and the
 * real arena-api backend. Defaults to mock so local dev and demos never need a running
 * backend — set NEXT_PUBLIC_API_MODE=real in .env.local to hit arena-api instead. */
export function isRealMode(): boolean {
  return process.env.NEXT_PUBLIC_API_MODE === "real";
}

export const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8081/api/v1";
