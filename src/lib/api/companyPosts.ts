import type { Post } from "@/lib/types";
import { delay } from "./shared";
import { isRealMode } from "./mode";
import { apiFetch } from "./httpClient";
import type { PagedResponse } from "./paged";

// ARENA-V2-PRODUCT-ARCHITECTURE.md §3.5/§6 "Company posts appear in the feed" - post-spec
// reconciliation addition (see DECISIONS.md). RECRUITER/COMPANY_ADMIN only, separate module
// from lib/api/posts.ts since it's the opposite role/workspace entirely (enterprise, not
// talent). Mock mode reuses the same localStorage-backed post store as posts.ts's own mock
// createPost so a company-authored post shows up in the same mock feed a talent account sees.
const COMPANY_POSTS_KEY = "arena_posts";
const MOCK_COMPANY_NAME = "Techolution";
const MOCK_COMPANY_EMOJI = "🟢";
const MOCK_COMPANY_ID = "mock-company-1";

function readPosts(): Post[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(COMPANY_POSTS_KEY);
    return raw ? (JSON.parse(raw) as Post[]) : [];
  } catch {
    return [];
  }
}
function writePosts(posts: Post[]) {
  localStorage.setItem(COMPANY_POSTS_KEY, JSON.stringify(posts));
}

export interface CreateCompanyPostInput {
  body: string;
  tags?: string[];
}

export async function createCompanyPost(input: CreateCompanyPostInput): Promise<Post> {
  if (isRealMode()) {
    return apiFetch<Post>("/companies/me/posts", { method: "POST", body: { body: input.body, tags: input.tags ?? [] } });
  }
  const post: Post = {
    id: `post-${Date.now()}`,
    authorUserId: MOCK_COMPANY_ID,
    authorName: MOCK_COMPANY_NAME,
    authorEmoji: MOCK_COMPANY_EMOJI,
    authorCompanyId: MOCK_COMPANY_ID,
    intentType: "company",
    body: input.body,
    audience: "global",
    visibility: "public",
    spotsFilled: 0,
    status: "open",
    tags: input.tags ?? [],
    mediaUrls: [],
    joinable: false,
    mine: false,
    createdAt: new Date().toISOString(),
    commentCount: 0,
    reactionCount: 0,
    myReacted: false,
    authorJoinCount: 0,
    authorAccountAgeDays: 400,
  };
  writePosts([post, ...readPosts()]);
  return delay(post, 300);
}

export async function getMyCompanyPosts(page = 0, size = 20): Promise<PagedResponse<Post>> {
  if (isRealMode()) return apiFetch<PagedResponse<Post>>("/companies/me/posts", { query: { page, size } });
  const mine = readPosts().filter((p) => p.authorCompanyId === MOCK_COMPANY_ID)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  const content = mine.slice(page * size, page * size + size);
  return delay({
    content, page, size, totalElements: mine.length,
    totalPages: Math.ceil(mine.length / size), last: (page + 1) * size >= mine.length,
  }, 200);
}

export async function deleteCompanyPost(postId: string): Promise<void> {
  if (isRealMode()) {
    await apiFetch<void>(`/companies/me/posts/${postId}`, { method: "DELETE" });
    return;
  }
  writePosts(readPosts().map((p) => (p.id === postId ? { ...p, status: "cancelled" as const } : p)));
  await delay(undefined, 200);
}
