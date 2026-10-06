import type { BlockedUser } from "@/lib/types";
import { apiFetch } from "./httpClient";

// ARENA-V2-PRODUCT-ARCHITECTURE.md §4 (Phase B) - block, structurally the same independent
// join-entity shape as follows.ts, but one-directional and never auto-mutual.

export async function blockUser(userId: string): Promise<void> {
  await apiFetch<void>(`/blocks/${userId}`, { method: "POST" });
  return;
}

export async function unblockUser(userId: string): Promise<void> {
  await apiFetch<void>(`/blocks/${userId}`, { method: "DELETE" });
  return;
}

export async function getMyBlocks(): Promise<BlockedUser[]> {
  return apiFetch<BlockedUser[]>("/blocks/me");
}

export async function isUserBlocked(userId: string): Promise<boolean> {
  const blocks = await getMyBlocks();
  return blocks.some((b) => b.userId === userId);
}
