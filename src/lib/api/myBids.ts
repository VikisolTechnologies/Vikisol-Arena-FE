import { getProjectById } from "@/lib/mock/projects";
import { delay } from "./shared";
import { bumpMyCareerHealth } from "./profile";
import { isRealMode } from "./mode";
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

export function recordMyBid(record: MyBidRecord) {
  if (isRealMode()) return; // real mode's bid record already lives server-side from placeBid()
  writeAll([record, ...readAll()]);
}

/** Mock-only: bids on projects the user doesn't own were previously stuck "pending" forever -
 * nothing ever simulated the other poster resolving them. Once a project's bidding window has
 * closed, this resolves each still-pending bid deterministically: highest bid on that project
 * wins. Real mode doesn't need this - arena-api resolves every other bid the moment a project
 * gets awarded, server-side, so `status` on GET /marketplace/my-bids is already current. */
async function resolveMyBids(): Promise<MyBidRecord[]> {
  if (isRealMode()) return [];
  const all = readAll();
  let changed = false;
  let wonAny = false;
  const resolved = all.map((r) => {
    if (r.status !== "pending") return r;
    const project = getProjectById(r.projectId);
    if (!project || new Date(project.endsAt).getTime() > Date.now()) return r;
    const topBid = [...project.bids].sort((a, b) => b.amount - a.amount)[0];
    changed = true;
    if (topBid?.id === r.bidId) {
      wonAny = true;
      return { ...r, status: "won" as const };
    }
    return { ...r, status: "lost" as const };
  });
  if (changed) writeAll(resolved);
  if (wonAny) await bumpMyCareerHealth(2);
  return delay(resolved, 150);
}

export async function getMyBids(): Promise<MyBidRecord[]> {
  if (isRealMode()) {
    const page = await apiFetch<PagedResponse<BidResponseWire>>("/marketplace/my-bids", { query: { page: 0, size: 100 } });
    return page.content.map((b) => ({
      bidId: b.id,
      projectId: b.projectId,
      amount: b.amount,
      status: b.status.toLowerCase() as MyBidStatus,
      submittedAt: b.submittedAt,
    }));
  }
  await resolveMyBids();
  return delay(readAll(), 200);
}
