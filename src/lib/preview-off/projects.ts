/** Production stand-in for src/lib/mock/projects.ts (see preview-off/world.ts). */
import type * as Real from "@/lib/mock/projects";

export const MOCK_PROJECTS: typeof Real.MOCK_PROJECTS = [];
export const getProjectById: typeof Real.getProjectById = () => undefined;
