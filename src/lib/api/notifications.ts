import type { AppNotification } from "@/lib/types";
import { MOCK_NOTIFICATIONS } from "@/lib/mock/notifications";
import { delay } from "./shared";
import { isRealMode } from "./mode";
import { apiFetch } from "./httpClient";
import type { PagedResponse } from "./paged";

const KEY = "arena_notifications";

function readAll(): AppNotification[] {
  if (typeof window === "undefined") return MOCK_NOTIFICATIONS;
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return JSON.parse(raw) as AppNotification[];
    localStorage.setItem(KEY, JSON.stringify(MOCK_NOTIFICATIONS));
    return MOCK_NOTIFICATIONS;
  } catch {
    return MOCK_NOTIFICATIONS;
  }
}

function writeAll(notifications: AppNotification[]) {
  localStorage.setItem(KEY, JSON.stringify(notifications));
}

// Real mode caches the last-fetched list purely so getUnreadCount() (a synchronous helper the
// shell's bell badge calls on every render) has something to read without awaiting a network
// call mid-render; it's refreshed every time getNotifications() runs.
let realCache: AppNotification[] = [];

export async function getNotifications(): Promise<AppNotification[]> {
  if (isRealMode()) {
    const page = await apiFetch<PagedResponse<AppNotification>>("/notifications", { query: { page: 0, size: 50 } });
    realCache = page.content;
    return realCache;
  }
  return delay(readAll(), 250);
}

export function getUnreadCount(): number {
  if (isRealMode()) return realCache.filter((n) => !n.read).length;
  return readAll().filter((n) => !n.read).length;
}

export async function markNotificationRead(id: string): Promise<void> {
  if (isRealMode()) {
    await apiFetch<void>(`/notifications/${id}/read`, { method: "PUT" });
    realCache = realCache.map((n) => (n.id === id ? { ...n, read: true } : n));
    return;
  }
  writeAll(readAll().map((n) => (n.id === id ? { ...n, read: true } : n)));
  return delay(undefined, 100);
}

export async function markAllNotificationsRead(): Promise<void> {
  if (isRealMode()) {
    await apiFetch<void>("/notifications/read-all", { method: "PUT" });
    realCache = realCache.map((n) => ({ ...n, read: true }));
    return;
  }
  writeAll(readAll().map((n) => ({ ...n, read: true })));
  return delay(undefined, 150);
}
