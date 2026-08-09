import type { BlockedUser } from "@/lib/types";
import { getCandidateById } from "@/lib/mock/candidates";
import { delay } from "./shared";
import { isRealMode } from "./mode";
import { apiFetch } from "./httpClient";

// ARENA-V2-PRODUCT-ARCHITECTURE.md §4 (Phase B) - block, structurally the same independent
// join-entity shape as follows.ts, but one-directional and never auto-mutual.

const KEY = "arena_blocks";

interface MockBlock {
  userId: string;
  blockedAt: string;
}

function readBlocks(): MockBlock[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as MockBlock[]) : [];
  } catch {
    return [];
  }
}
function writeBlocks(blocks: MockBlock[]) {
  localStorage.setItem(KEY, JSON.stringify(blocks));
}

export async function blockUser(userId: string): Promise<void> {
  if (isRealMode()) {
    await apiFetch<void>(`/blocks/${userId}`, { method: "POST" });
    return;
  }
  const blocks = readBlocks();
  if (blocks.some((b) => b.userId === userId)) return;
  writeBlocks([...blocks, { userId, blockedAt: new Date().toISOString() }]);
  await delay(undefined, 200);
}

export async function unblockUser(userId: string): Promise<void> {
  if (isRealMode()) {
    await apiFetch<void>(`/blocks/${userId}`, { method: "DELETE" });
    return;
  }
  writeBlocks(readBlocks().filter((b) => b.userId !== userId));
  await delay(undefined, 200);
}

export async function getMyBlocks(): Promise<BlockedUser[]> {
  if (isRealMode()) return apiFetch<BlockedUser[]>("/blocks/me");
  return delay(
    readBlocks().map((b) => {
      const c = getCandidateById(b.userId);
      return { userId: b.userId, name: c?.name ?? "Arena member", emoji: c?.avatarEmoji ?? "🧑🏽", blockedAt: b.blockedAt };
    }),
    200,
  );
}

export async function isUserBlocked(userId: string): Promise<boolean> {
  const blocks = await getMyBlocks();
  return blocks.some((b) => b.userId === userId);
}
