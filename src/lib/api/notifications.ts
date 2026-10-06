import type { AppNotification } from "@/lib/types";
import { apiFetch } from "./httpClient";
import type { PagedResponse } from "./paged";

// Caches the last-fetched list purely so getUnreadCount() (a synchronous helper the
// shell's bell badge calls on every render) has something to read without awaiting a network
// call mid-render; it's refreshed every time getNotifications() runs.
let realCache: AppNotification[] = [];

export async function getNotifications(): Promise<AppNotification[]> {
  const page = await apiFetch<PagedResponse<AppNotification>>("/notifications", { query: { page: 0, size: 50 } });
  realCache = page.content;
  return realCache;
}

export function getUnreadCount(): number {
  return realCache.filter((n) => !n.read).length;
}

export async function markNotificationRead(id: string): Promise<void> {
  await apiFetch<void>(`/notifications/${id}/read`, { method: "PUT" });
  realCache = realCache.map((n) => (n.id === id ? { ...n, read: true } : n));
  return;
}

export async function markAllNotificationsRead(): Promise<void> {
  await apiFetch<void>("/notifications/read-all", { method: "PUT" });
  realCache = realCache.map((n) => ({ ...n, read: true }));
  return;
}

// --- M6 area 2: GET/PUT /notifications/preferences (FE-API-GAPS #18/#58), now live. ---

export interface NotificationPreferences {
  messages: boolean;
  activities: boolean;
  needs: boolean;
  jobs: boolean;
  jenny: boolean;
  marketing: boolean;
}

export async function getNotificationPreferences(): Promise<NotificationPreferences> {
  return apiFetch<NotificationPreferences>("/notifications/preferences");
}

/** Safety notices can't be turned off; the backend rejects an explicit `false` for them, and
 * this never sends that field. */
export async function setNotificationPreferences(prefs: NotificationPreferences): Promise<NotificationPreferences> {
  return apiFetch<NotificationPreferences>("/notifications/preferences", { method: "PUT", body: prefs });
}
