import type { AgentActivityEvent } from "@/lib/types";
import { MOCK_ACTIVITY } from "@/lib/mock/activity";
import { delay } from "./shared";
import { isRealMode } from "./mode";
import { apiFetch } from "./httpClient";
import type { PagedResponse } from "./paged";

export async function getActivityFeed(): Promise<AgentActivityEvent[]> {
  if (isRealMode()) {
    const page = await apiFetch<PagedResponse<AgentActivityEvent>>("/activity", { query: { page: 0, size: 50 } });
    return page.content;
  }
  return delay(MOCK_ACTIVITY, 300);
}
