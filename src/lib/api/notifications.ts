import type { AppNotification } from "@/lib/types";
import { MOCK_NOTIFICATIONS } from "@/lib/mock/notifications";
import { delay } from "./shared";

export async function getNotifications(): Promise<AppNotification[]> {
  return delay(MOCK_NOTIFICATIONS, 250);
}
