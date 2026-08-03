import type { AppNotification } from "@/lib/types";
import { MOCK_NOTIFICATIONS } from "@/lib/mock/notifications";
import { delay } from "./shared";

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

export async function getNotifications(): Promise<AppNotification[]> {
  return delay(readAll(), 250);
}

export function getUnreadCount(): number {
  return readAll().filter((n) => !n.read).length;
}

export async function markNotificationRead(id: string): Promise<void> {
  writeAll(readAll().map((n) => (n.id === id ? { ...n, read: true } : n)));
  return delay(undefined, 100);
}

export async function markAllNotificationsRead(): Promise<void> {
  writeAll(readAll().map((n) => ({ ...n, read: true })));
  return delay(undefined, 150);
}
