import { CURRENT_CANDIDATE_ID, MOCK_CANDIDATES } from "@/lib/mock/candidates";

// Plain (followerId, followingId) pairs - the mock analog of the backend's arena_follows rows.
export const MOCK_FOLLOWS: { followerId: string; followingId: string; createdAt: string }[] = [
  { followerId: CURRENT_CANDIDATE_ID, followingId: MOCK_CANDIDATES[2].id, createdAt: new Date(Date.now() - 5 * 86400000).toISOString() },
  { followerId: CURRENT_CANDIDATE_ID, followingId: MOCK_CANDIDATES[7].id, createdAt: new Date(Date.now() - 3 * 86400000).toISOString() },
  { followerId: MOCK_CANDIDATES[5].id, followingId: CURRENT_CANDIDATE_ID, createdAt: new Date(Date.now() - 2 * 86400000).toISOString() },
];
