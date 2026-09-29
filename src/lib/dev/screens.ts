import data from "./screens.json";

/** Built = the builder says it's finished. Approved = the architect checked it against the board.
 *  Only the architect sets "approved" (review 29 Sep); the builder never does. */
export type ScreenStatus = "approved" | "built" | "in-progress" | "not-started";
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

export const STATUS_LABEL: Record<ScreenStatus, string> = { approved: "Approved", built: "Built", "in-progress": "In progress", "not-started": "Not started" };
