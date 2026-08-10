"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Bot, CalendarCheck2, Coins, Bell, type LucideIcon } from "lucide-react";
import { AppShell } from "@/components/app/AppShell";
import { OrbLoader } from "@/components/ui/orb-loader";
import { EmptyState } from "@/components/ui/empty-state";
import { Button } from "@/components/ui/button";
import { getMyProfile } from "@/lib/api/profile";
import { getNotifications, markNotificationRead, markAllNotificationsRead } from "@/lib/api/notifications";
import { requireOnboarded } from "@/lib/auth-guard";
import { cn } from "@/lib/utils";
import type { CandidateProfile, AppNotification, NotificationType } from "@/lib/types";

const TYPE_ICON: Record<NotificationType, LucideIcon> = {
  agent: Bot,
  interview: CalendarCheck2,
  bid: Coins,
  system: Bell,
};

function timeAgo(iso: string) {
  const mins = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (mins < 1) return "now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.round(hours / 24)}d ago`;
}

export default function NotificationsPage() {
  const router = useRouter();
  const [profile, setProfile] = useState<CandidateProfile | null>(null);
  const [notifications, setNotifications] = useState<AppNotification[] | null>(null);

  useEffect(() => {
    if (!requireOnboarded(router)) return;
    getMyProfile().then(setProfile);
    getNotifications().then(setNotifications);
  }, [router]);

  const open = async (n: AppNotification) => {
    if (!n.read) {
      await markNotificationRead(n.id);
      setNotifications((prev) => prev?.map((x) => (x.id === n.id ? { ...x, read: true } : x)) ?? prev);
    }
    if (n.link) router.push(n.link);
  };

  const markAllRead = async () => {
    await markAllNotificationsRead();
    setNotifications((prev) => prev?.map((x) => ({ ...x, read: true })) ?? prev);
  };

  const unreadCount = notifications?.filter((n) => !n.read).length ?? 0;

  if (!profile) {
    return (
      <AppShell title="Notifications">
        <OrbLoader className="h-96" />
      </AppShell>
    );
  }

  return (
    <AppShell
      title="Notifications"
      profile={profile}
      actions={
        unreadCount > 0 ? (
          <Button variant="outline" size="sm" onClick={markAllRead}>
            Mark all read
          </Button>
        ) : undefined
      }
    >
      {!notifications ? (
        <OrbLoader className="h-64" />
      ) : notifications.length === 0 ? (
        <EmptyState title="You're all caught up" description="Nothing new right now." className="py-16" />
      ) : (
        <div className="space-y-2">
          {notifications.map((n) => {
            const Icon = TYPE_ICON[n.type];
            return (
              <button
                key={n.id}
                type="button"
                onClick={() => open(n)}
                className={cn(
                  "flex w-full items-start gap-3 rounded-2xl border px-4 py-3.5 text-left transition-colors",
                  n.read ? "border-border bg-card" : "border-primary/30 bg-primary/[0.05] hover:border-primary/50",
                )}
              >
                <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary/12 text-primary-soft">
                  <Icon className="size-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <p className={cn("truncate text-sm", n.read ? "font-medium" : "font-semibold")}>{n.title}</p>
                    <span className="shrink-0 text-[11px] text-muted-foreground">{timeAgo(n.timestamp)}</span>
                  </div>
                  <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">{n.body}</p>
                </div>
                {!n.read && <span className="mt-1.5 size-2 shrink-0 rounded-full bg-primary" />}
              </button>
            );
          })}
        </div>
      )}
    </AppShell>
  );
}
