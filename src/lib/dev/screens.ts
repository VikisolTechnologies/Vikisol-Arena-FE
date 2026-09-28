import data from "./screens.json";

export type ScreenStatus = "done" | "in-progress" | "not-started";
export interface DevScreen {
  id: string;
  phase: string;
  board: string;
  index: number;
  title: string;
  route: string | null;
  status: ScreenStatus;
  commit: string | null;
  /** "No board — designed in B+", or what blocks it. */
  note?: string;
}

/** Founder-facing build tracker (/dev/progress). Status and commit are updated as each screen lands. */
export const SCREENS = data as DevScreen[];

export const PHASES = [...new Set(SCREENS.map((s) => s.phase))];

export const STATUS_LABEL: Record<ScreenStatus, string> = { done: "Done", "in-progress": "In progress", "not-started": "Not started" };
