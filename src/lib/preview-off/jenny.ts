/** Production stand-in for src/lib/fixtures/jenny.ts (see preview-off/world.ts). */
import type * as Real from "@/lib/fixtures/jenny";

export const DRAFT_SENTENCE = "" as typeof Real.DRAFT_SENTENCE;
export const PREVIEW_SEND: typeof Real.PREVIEW_SEND = { itemId: "", conversationId: "", note: "" };
export const queueFixtures: typeof Real.queueFixtures = () => [];
export const RECENT_FIXTURES: typeof Real.RECENT_FIXTURES = [];
export const REMINDER_FIXTURES: typeof Real.REMINDER_FIXTURES = [];
