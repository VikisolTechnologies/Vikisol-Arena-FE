import { delay } from "./shared";

export type MyBidStatus = "pending" | "shortlisted" | "won" | "lost";
export interface MyBidRecord {
  bidId: string;
  projectId: string;
  amount: number;
  status: MyBidStatus;
  submittedAt: string;
}

const KEY = "arena_my_bids";

function readAll(): MyBidRecord[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(KEY) || "[]");
  } catch {
    return [];
  }
}
function writeAll(records: MyBidRecord[]) {
  localStorage.setItem(KEY, JSON.stringify(records));
}

export async function getMyBids(): Promise<MyBidRecord[]> {
  return delay(readAll(), 200);
}

export function recordMyBid(record: MyBidRecord) {
  writeAll([record, ...readAll()]);
}

export function updateMyBidStatus(bidId: string, status: MyBidStatus) {
  writeAll(readAll().map((r) => (r.bidId === bidId ? { ...r, status } : r)));
}
