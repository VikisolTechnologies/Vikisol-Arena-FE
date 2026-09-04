import type { Project } from "@/lib/types";
import { isRealMode } from "./mode";
import { apiFetch } from "./httpClient";

export interface IndustryStat {
  label: string;
  count: number;
}

export interface LandingStats {
  openToWorkCount: number;
  byIndustry: IndustryStat[];
  openProjectCount: number;
}

interface ProjectResponseWire extends Omit<Project, "status"> {
  status: string;
}

function toProject(res: ProjectResponseWire): Project {
  return { ...res, status: res.status.toLowerCase() as Project["status"] };
}

/** Feeds the logged-out landing page (Home). Real mode only - mock mode (local dev with no
 * backend running) leaves the landing page on its static copy rather than faking these too, since
 * there's no mock store these numbers could meaningfully come from. Every call swallows its own
 * errors: a slow/unreachable backend should degrade the landing page to its static fallback
 * copy, never show a broken/loading marketing page. */
export async function getLandingStats(): Promise<LandingStats | null> {
  if (!isRealMode()) return null;
  try {
    return await apiFetch<LandingStats>("/public/landing-stats", { auth: false });
  } catch {
    return null;
  }
}

export async function getFeaturedProject(): Promise<Project | null> {
  if (!isRealMode()) return null;
  try {
    const res = await apiFetch<ProjectResponseWire | null>("/public/landing-featured-project", { auth: false });
    return res ? toProject(res) : null;
  } catch {
    return null;
  }
}
