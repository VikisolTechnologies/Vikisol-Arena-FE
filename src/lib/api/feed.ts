import type { FeedItem, FeedTab } from "@/lib/types";
import { apiFetch } from "./httpClient";

// ARENA-MASTER-ARCHITECTURE.md PART 6/7.5 - the unified Home feed. Real mode hits arena-api's
// GET /feed (FeedAggregationService - see DECISIONS.md).
export async function getFeedItems(tab: FeedTab = "for-you", page = 0, size = 20): Promise<FeedItem[]> {
  return apiFetch<FeedItem[]>("/feed", { query: { tab, page, size } });
}
