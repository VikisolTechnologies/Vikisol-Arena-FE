import type { Job } from "@/lib/types";
import { JOBS } from "@/lib/fixtures/world";

/** Jobs near the preview neighbourhood (src/lib/fixtures/world.ts). */
export const MOCK_JOBS: Job[] = JOBS;

export function getJobById(id: string) {
  return MOCK_JOBS.find((j) => j.id === id);
}
