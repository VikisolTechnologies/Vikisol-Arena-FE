import type { Post } from "@/lib/types";
import { apiFetch } from "./httpClient";
import type { PagedResponse } from "./paged";

// ARENA-V2-PRODUCT-ARCHITECTURE.md §3.5/§6 "Company posts appear in the feed" - post-spec
// reconciliation addition (see DECISIONS.md). RECRUITER/COMPANY_ADMIN only, separate module
// from lib/api/posts.ts since it's the opposite role/workspace entirely (enterprise, not
// talent).

export interface CreateCompanyPostInput {
  body: string;
  tags?: string[];
}

export async function createCompanyPost(input: CreateCompanyPostInput): Promise<Post> {
  return apiFetch<Post>("/companies/me/posts", { method: "POST", body: { body: input.body, tags: input.tags ?? [] } });
}

export async function getMyCompanyPosts(page = 0, size = 20): Promise<PagedResponse<Post>> {
  return apiFetch<PagedResponse<Post>>("/companies/me/posts", { query: { page, size } });
}

export async function deleteCompanyPost(postId: string): Promise<void> {
  await apiFetch<void>(`/companies/me/posts/${postId}`, { method: "DELETE" });
  return;
}
