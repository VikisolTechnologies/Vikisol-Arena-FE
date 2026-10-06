"use client";

import { useEffect, useState } from "react";
import { AccountPage } from "@/components/account/AccountPage";
import { Avatar } from "@/components/bplus/Avatar";
import { StateCard } from "@/components/bplus/Primitives";
import { getMyBlocks, unblockUser } from "@/lib/api/blocks";
import { formatDate } from "@/lib/format";
import type { BlockedUser } from "@/lib/types";

export default function BlockedAccountsPage() {
  const [blocks, setBlocks] = useState<BlockedUser[] | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState<string | null>(null);

  useEffect(() => {
    getMyBlocks()
      .then((b) => setBlocks(Array.isArray(b) ? b : []))
      .catch(() => {
        setBlocks([]);
        setError("Blocked accounts didn't load.");
      });
  }, []);

  return (
    <AccountPage title="Blocked accounts" lede="People you've blocked can't message you or see your exact activity.">
      {error && <StateCard kind="error" title="Couldn't load" detail={error} />}
      {blocks === null && !error && <StateCard kind="empty" title="Loading…" />}
      {blocks?.length === 0 && !error && (
        <StateCard kind="empty" title="No one blocked" detail="When you block someone, they'll appear here." />
      )}
      {blocks && blocks.length > 0 && (
        <ul className="divide-y divide-paper-ink/10 overflow-hidden rounded-tile bg-paper text-paper-ink">
          {blocks.map((b) => (
            <li key={b.userId} className="flex items-center gap-3 px-4 py-3">
              <Avatar name={b.name} className="size-11 text-[15px]" />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[16px] font-semibold">{b.name}</span>
                <span className="block text-[13px] text-paper-ink-muted">Blocked {formatDate(b.blockedAt)}</span>
              </span>
              <button
                type="button"
                disabled={busy === b.userId}
                onClick={async () => {
                  setBusy(b.userId);
                  try {
                    await unblockUser(b.userId);
                    setBlocks((cur) => cur?.filter((x) => x.userId !== b.userId) ?? cur);
                  } catch {
                    setError(`Couldn't unblock ${b.name}.`);
                  } finally {
                    setBusy(null);
                  }
                }}
                className="min-h-11 rounded-full border border-paper-ink/40 px-4 text-[14px] font-semibold text-paper-ink outline-none focus-visible:outline-2 focus-visible:outline-primary disabled:opacity-50"
              >
                Unblock
              </button>
            </li>
          ))}
        </ul>
      )}
    </AccountPage>
  );
}
