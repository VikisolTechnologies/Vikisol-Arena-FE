"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { m } from "motion/react";
import { Bell, Briefcase, CalendarCheck2, Coins, MessageCircle, Settings, Sparkles, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { rise } from "@/lib/motion";
import { AppShell } from "@/components/bplus/AppShell";
import { Button } from "@/components/bplus/Button";
import { Pills, Skeleton, StateCard } from "@/components/bplus/Primitives";
import { getNotifications, markAllNotificationsRead, markNotificationRead } from "@/lib/api/notifications";
import { requireOnboarded } from "@/lib/auth-guard";
import { timeAgo } from "@/lib/data/time";
import type { AppNotification } from "@/lib/types";

const FILTERS = [
  { id: "all", label: "All" },
  { id: "unread", label: "Unread" },
  { id: "jobs", label: "Jobs" },
  { id: "messages", label: "Messages" },
  { id: "jenny", label: "Jenny" },
] as const;
type Filter = (typeof FILTERS)[number]["id"];

/** A notification's category comes from its real type and link — nothing is guessed. */
export function notificationKind(n: AppNotification): "jobs" | "messages" | "jenny" | "other" {
  if (n.type === "agent") return "jenny";
  if (n.type === "interview" || n.type === "bid" || /^\/(jobs|applications|interviews|marketplace)/.test(n.link ?? "")) return "jobs";
  if (/^\/(rooms|messages)/.test(n.link ?? "")) return "messages";
  return "other";
}

const ICON: Record<ReturnType<typeof notificationKind>, LucideIcon> = { jobs: Briefcase, messages: MessageCircle, jenny: Sparkles, other: Bell };
const TYPE_ICON: Partial<Record<AppNotification["type"], LucideIcon>> = { interview: CalendarCheck2, bid: Coins };

const isToday = (iso: string) => new Date(iso).toDateString() === new Date().toDateString();

/** Board "Messages, trust…" #3 — Today / Earlier, one clear action each. */
export function NotificationsScreen() {
  const router = useRouter();
  const [items, setItems] = useState<AppNotification[] | null>(null);
  const [error, setError] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [filter, setFilter] = useState<Filter>("all");

  useEffect(() => {
    if (!requireOnboarded(router)) return;
    let cancelled = false;
    getNotifications()
      .then((n) => {
        if (cancelled) return;
        setItems(Array.isArray(n) ? n : []);
        setError(false);
      })
      .catch(() => !cancelled && setError(true));
    return () => {
      cancelled = true;
    };
  }, [router, attempt]);

  const markRead = async (n: AppNotification) => {
    if (n.read) return;
    setItems((cur) => cur?.map((x) => (x.id === n.id ? { ...x, read: true } : x)) ?? cur);
    try {
      await markNotificationRead(n.id);
    } catch {
      setItems((cur) => cur?.map((x) => (x.id === n.id ? { ...x, read: false } : x)) ?? cur);
    }
  };
  const open = async (n: AppNotification) => {
    void markRead(n);
    if (n.link) router.push(n.link);
  };
  const markAll = async () => {
    const before = items;
    setItems((cur) => cur?.map((x) => ({ ...x, read: true })) ?? cur);
    try {
      await markAllNotificationsRead();
    } catch {
      setItems(before);
    }
  };

  const shown = (items ?? []).filter((n) => filter === "all" || (filter === "unread" ? !n.read : notificationKind(n) === filter));
  const groups = [
    { id: "today", label: "Today", rows: shown.filter((n) => isToday(n.timestamp)) },
    { id: "earlier", label: "Earlier", rows: shown.filter((n) => !isToday(n.timestamp)) },
  ].filter((g) => g.rows.length > 0);
  const unread = (items ?? []).some((n) => !n.read);

  return (
    <AppShell>
      <header className="flex items-center justify-between pt-3">
        <h1 className="font-display-serif text-[34px] font-medium leading-tight">Notifications</h1>
        <Link href="/settings" aria-label="Notification settings" className="-mr-2 grid size-11 place-items-center rounded-full outline-none hover:bg-foreground/5 focus-visible:outline-2 focus-visible:outline-primary">
          <Settings className="size-6" strokeWidth={1.75} aria-hidden />
        </Link>
      </header>
      <div className="mt-4">
        <Pills label="Show" options={FILTERS} value={filter} onChange={setFilter} compact />
      </div>
      {unread && (
        <div className="mt-3 flex justify-end">
          <button type="button" onClick={markAll} className="min-h-11 px-1 text-[15px] font-semibold text-primary underline-offset-4 hover:underline">Mark all read</button>
        </div>
      )}

      <div className="mt-3 flex-1">
        {error ? (
          <StateCard kind="error" title="Notifications didn't load" detail="Check your connection and try again." action={<Button variant="outline" onClick={() => setAttempt((n) => n + 1)}>Try again</Button>} />
        ) : !items ? (
          <div className="space-y-3" aria-busy="true" aria-label="Loading notifications">
            {[0, 1, 2].map((i) => <Skeleton key={i} className="h-24 w-full" />)}
          </div>
        ) : groups.length === 0 ? (
          <StateCard kind="empty" title={filter === "all" ? "You're all caught up" : "Nothing here"} detail={filter === "all" ? "Nothing new right now." : "No notifications of this kind."} />
        ) : (
          <m.div key={filter} initial="hidden" animate="shown" className="space-y-6">
            {groups.map((g, gi) => (
              <m.section key={g.id} variants={rise} custom={gi} aria-label={g.label}>
                <h2 className="mb-2 text-[17px] font-semibold">{g.label}</h2>
                <ul className="space-y-2.5">
                  {g.rows.map((n) => {
                    const kind = notificationKind(n);
                    const IconCmp = TYPE_ICON[n.type] ?? ICON[kind];
                    return (
                      <li key={n.id} className={cn("rounded-tile p-3.5", n.read ? "bg-surface" : "bg-paper text-paper-ink")}>
                        <div className="flex gap-3">
                          <span className={cn("grid size-11 shrink-0 place-items-center rounded-full", n.read ? "bg-foreground/10" : "bg-primary text-white")}>
                            <IconCmp className="size-5" strokeWidth={1.9} aria-hidden />
                          </span>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-start justify-between gap-2">
                              <p className={cn("text-[15px]", n.read ? "font-medium" : "font-bold")}>
                                {n.title}
                                {!n.read && <span className="sr-only"> (unread)</span>}
                              </p>
                              <span className={cn("shrink-0 text-[12px]", n.read ? "text-faint" : "text-paper-ink-muted")}>{timeAgo(n.timestamp)}</span>
                            </div>
                            <p className={cn("mt-0.5 text-[14px]", n.read ? "text-faint" : "text-paper-ink-muted")}>{n.body}</p>
                            <div className="mt-2.5 flex gap-2">
                              {n.link && (
                                <button type="button" onClick={() => open(n)} className="min-h-11 rounded-full bg-primary px-5 text-[15px] font-bold text-paper-ink">View</button>
                              )}
                              {!n.read && (
                                <button type="button" onClick={() => markRead(n)} className="min-h-11 rounded-full border border-paper-ink/50 px-4 text-[14px] font-semibold">Mark read</button>
                              )}
                            </div>
                          </div>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </m.section>
            ))}
          </m.div>
        )}
      </div>
    </AppShell>
  );
}
