import { apiFetch } from "./httpClient";
import type { PagedResponse } from "./paged";

export type MyBidStatus = "pending" | "shortlisted" | "won" | "lost";
export interface MyBidRecord {
  bidId: string;
  projectId: string;
  amount: number;
  status: MyBidStatus;
  submittedAt: string;
}

interface BidResponseWire {
  id: string;
  projectId: string;
  amount: number;
  submittedAt: string;
  status: string;
}

export function recordMyBid(record: MyBidRecord) {
  // real mode's bid record already lives server-side from placeBid()
}

export async function getMyBids(): Promise<MyBidRecord[]> {
  const page = await apiFetch<PagedResponse<BidResponseWire>>("/marketplace/my-bids", { query: { page: 0, size: 100 } });
  return page.content.map((b) => ({
    bidId: b.id,
    projectId: b.projectId,
    amount: b.amount,
    status: b.status.toLowerCase() as MyBidStatus,
    submittedAt: b.submittedAt,
  }));
}
