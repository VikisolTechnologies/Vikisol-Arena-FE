import type { AppNotification, NotificationType } from "@/lib/types";
import { rand, pick, intBetween } from "./seed";

const TEMPLATES: Record<NotificationType, () => { title: string; body: string }> = {
  agent: () => ({ title: "Your agent found 3 new matches", body: "Above your 90% threshold — worth a look." }),
  interview: () => ({ title: "Interview reminder", body: "Your interview is tomorrow at 3:00 PM." }),
  bid: () => ({ title: "New bid received", body: "A new bid landed on your open project." }),
  system: () => ({ title: "Weekly summary ready", body: "See how your Career Health score changed this week." }),
};

function buildNotification(hoursAgo: number): AppNotification {
  const type = pick(Object.keys(TEMPLATES) as NotificationType[]);
  const { title, body } = TEMPLATES[type]();
  return {
    id: `notif-${Math.floor(rand() * 1e6)}`,
    type,
    title,
    body,
    timestamp: new Date(Date.now() - hoursAgo * 3600 * 1000).toISOString(),
    read: hoursAgo > 20,
  };
}

export const MOCK_NOTIFICATIONS: AppNotification[] = Array.from({ length: 10 }, () =>
  buildNotification(intBetween(0, 96)),
).sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
