import { getProjectById } from "@/lib/mock/projects";
import { delay } from "./shared";
import { bumpMyCareerHealth } from "./profile";

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

export function recordMyBid(record: MyBidRecord) {
  writeAll([record, ...readAll()]);
}

export function updateMyBidStatus(bidId: string, status: MyBidStatus) {
  writeAll(readAll().map((r) => (r.bidId === bidId ? { ...r, status } : r)));
}

/** Bids on projects the user doesn't own were previously stuck "pending" forever - nothing
 * ever simulated the other poster resolving them. Once a project's bidding window has closed,
 * this resolves each still-pending bid deterministically: highest bid on that project wins.
 * Winning nudges Career Health, same as completing a milestone on a project you posted. */
export async function resolveMyBids(): Promise<MyBidRecord[]> {
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
  await resolveMyBids();
  return delay(readAll(), 200);
}
