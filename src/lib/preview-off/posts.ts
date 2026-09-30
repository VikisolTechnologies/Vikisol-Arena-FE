/** Production stand-in for src/lib/mock/posts.ts (see preview-off/world.ts). */
import type * as Real from "@/lib/mock/posts";

export const MOCK_POSTS: typeof Real.MOCK_POSTS = [];
export const MOCK_POST_JOIN_REQUESTS: typeof Real.MOCK_POST_JOIN_REQUESTS = [];
export const previewMediaForPost: typeof Real.previewMediaForPost = () => undefined as ReturnType<typeof Real.previewMediaForPost>;
