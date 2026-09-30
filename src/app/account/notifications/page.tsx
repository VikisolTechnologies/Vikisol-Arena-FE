"use client";

import { useEffect, useState } from "react";
import { AccountPage } from "@/components/account/AccountPage";
import { getDefaultNotifPrefs, readNotifPrefs, writeNotifPrefs, type NotifPref } from "@/components/account/fixtures";
import { Toggle } from "@/components/bplus/Controls";
import { StateCard } from "@/components/bplus/Primitives";
import { isRealMode } from "@/lib/api/mode";

export default function NotificationPrefsPage() {
  const [prefs, setPrefs] = useState<NotifPref[] | null>(null);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setPrefs(isRealMode() ? getDefaultNotifPrefs() : readNotifPrefs());
  }, []);

  const toggle = (id: string, enabled: boolean) => {
    setPrefs((cur) => {
      if (!cur) return cur;
      const next = cur.map((p) => (p.id === id ? { ...p, enabled } : p));
      if (!isRealMode()) writeNotifPrefs(next);
      return next;
    });
  };

  return (
    <AccountPage title="Notification preferences" lede="Choose what Arena can nudge you about. You can change this anytime.">
      {isRealMode() && (
        <div className="mb-5">
          <StateCard
            kind="empty"
            title="Preferences aren't saved yet"
            detail="GET/PUT /notifications/preferences isn't live (gap #18 / #52). Toggles show the planned set; they don't persist in real mode."
          />
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
