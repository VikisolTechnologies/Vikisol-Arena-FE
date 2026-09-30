/** Production stand-in for src/lib/mock/activity.ts (see preview-off/world.ts). */
import type * as Real from "@/lib/mock/activity";

export const MOCK_ACTIVITY: typeof Real.MOCK_ACTIVITY = [];
export const generateLiveEvent: typeof Real.generateLiveEvent = () => {
  throw new Error("No preview activity in production.");
};
