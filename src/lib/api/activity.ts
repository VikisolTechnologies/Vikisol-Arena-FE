import type { AgentActivityEvent } from "@/lib/types";
import { MOCK_ACTIVITY } from "@/lib/mock/activity";
import { delay } from "./shared";

export async function getActivityFeed(): Promise<AgentActivityEvent[]> {
  return delay(MOCK_ACTIVITY, 300);
}
