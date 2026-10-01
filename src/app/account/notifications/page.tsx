"use client";

import { useEffect, useState } from "react";
import { AccountPage } from "@/components/account/AccountPage";
import { getDefaultNotifPrefs, readNotifPrefs, writeNotifPrefs, type NotifPref } from "@/components/account/fixtures";
import { getNotificationPreferences, setNotificationPreferences } from "@/lib/api/notifications";
import { Toggle } from "@/components/bplus/Controls";
import { StateCard } from "@/components/bplus/Primitives";
import { isRealMode } from "@/lib/api/mode";

function toPrefs(server: { messages: boolean; activities: boolean; needs: boolean; jobs: boolean; jenny: boolean; marketing: boolean }): NotifPref[] {
  return getDefaultNotifPrefs().map((p) => ({ ...p, enabled: server[p.id as keyof typeof server] ?? p.enabled }));
}

export default function NotificationPrefsPage() {
  const [prefs, setPrefs] = useState<NotifPref[] | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!isRealMode()) {
      setPrefs(readNotifPrefs());
      return;
    }
    getNotificationPreferences()
      .then((p) => setPrefs(toPrefs(p)))
      .catch(() => setError("Couldn't load your preferences. Showing the defaults."));
  }, []);

  const toggle = (id: string, enabled: boolean) => {
    setPrefs((cur) => {
      if (!cur) return cur;
      const next = cur.map((p) => (p.id === id ? { ...p, enabled } : p));
      if (isRealMode()) {
        const server = Object.fromEntries(next.map((p) => [p.id, p.enabled])) as Record<string, boolean>;
        setNotificationPreferences(server as never).catch(() => setError("Couldn't save that change — try again."));
      } else {
        writeNotifPrefs(next);
      }
      return next;
    });
  };

  return (
    <AccountPage title="Notification preferences" lede="Choose what Arena can nudge you about. You can change this anytime.">
      {error && (
        <div className="mb-5">
          <StateCard kind="empty" title={error} />
        </div>
      )}
      {!prefs ? (
        <StateCard kind="empty" title="Loading…" />
      ) : (
        <ul className="divide-y divide-paper-ink/10 overflow-hidden rounded-tile bg-paper text-paper-ink">
          {prefs.map((p) => (
            <li key={p.id} className="px-4 py-3">
              <Toggle
                label={p.label}
                description={<span className="text-[13px] text-paper-ink-muted">{p.detail}{p.deviceOnly && !isRealMode() ? " · on this device" : ""}</span>}
                checked={p.enabled}
                onChange={(v) => toggle(p.id, v)}
              />
            </li>
          ))}
        </ul>
      )}
    </AccountPage>
  );
}
