/**
 * FE-BPLUS-BUILD §6. "api" = every screen reads the real backend only. "mixed" (the preview
 * default) = the real backend where an endpoint exists, labelled fixtures where it doesn't.
 * next.config.ts refuses to build production with anything but "api".
 */
export type DataMode = "api" | "mixed";

export const DATA_MODE: DataMode = process.env.NEXT_PUBLIC_ARENA_DATA === "api" ? "api" : "mixed";

/** True when a screen may show fixture data; such screens must render the "Preview data" pill. */
export const FIXTURES_ALLOWED = DATA_MODE === "mixed";
