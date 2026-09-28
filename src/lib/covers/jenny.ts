import { apiFetch } from "@/lib/api/httpClient";

/** AI covers (flow §5) — off unless NEXT_PUBLIC_JENNY_COVERS=on. The contract is PROPOSED
 *  (FE-API-GAPS #24): nothing calls it by default, and any failure falls back to the free card. */
export const JENNY_COVERS_ON = process.env.NEXT_PUBLIC_JENNY_COVERS === "on";

export interface CoverRequest {
  kind: "activity" | "project" | "community";
  category: string;
  subtype: string;
  answers: Record<string, string>;
  placeType?: "lake" | "stadium" | "park" | "trail" | "indoor" | "street" | "other";
  timeOfDay: "morning" | "day" | "evening" | "night";
  seed: string;
}
export interface CoverResult {
  imageUrl: string;
  blurhash?: string;
  aiGenerated: true;
}

export function requestJennyCover(req: CoverRequest): Promise<CoverResult> {
  return apiFetch<CoverResult>("/agent/gateway/v2/cover-image", { method: "POST", body: req });
}
