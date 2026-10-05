"use client";

import { useEffect, useState } from "react";
import { Building2, Check, MessageCircle, ShieldCheck, X } from "lucide-react";
import { AppShell } from "@/components/bplus/AppShell";
import { Button } from "@/components/bplus/Button";
import { Skeleton, StateCard } from "@/components/bplus/Primitives";
import { CompanyMark } from "@/components/career/CompanyMark";
import { acceptConnectRequest, declineConnectRequest, getMyConnectRequests, type ConnectView } from "@/lib/api/connect";
import { timeAgo } from "@/lib/data/time";

/**
 * MARATHON-FE-2 Step B item 4. A company reaching out through talent search sends a connect
 * request; accepting it is what opens messaging with them (declining ends it). No board — built
 * from the backend contract (ConnectController) since this had no frontend at all.
 */
export default function ConnectRequestsPage() {
  const [requests, setRequests] = useState<ConnectView[] | null>(null);
  const [error, setError] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = () => getMyConnectRequests().then(setRequests).catch(() => setError("Your requests didn't load. Refresh to try again."));
  useEffect(() => {
    load();
  }, []);

  const decide = async (id: string, accept: boolean) => {
    setBusyId(id);
    setError("");
    try {
      const updated = accept ? await acceptConnectRequest(id) : await declineConnectRequest(id);
      if (updated) setRequests((prev) => prev?.map((r) => (r.id === id ? updated : r)) ?? null);
    } catch (err) {
      setError(err instanceof Error && err.message ? err.message : "That didn't save. Try again.");
    } finally {
      setBusyId(null);
    }
  };

  return (
    <AppShell>
      <header className="pt-3">
        <h1 className="font-display-serif text-[34px] font-medium leading-tight">Connect requests</h1>
        <p className="mt-1 text-[15px] text-faint">Companies that want to reach out before you&apos;ve applied. You decide.</p>
      </header>
      {error && <p role="alert" className="mt-4 rounded-xl bg-danger/12 px-3.5 py-2.5 text-[14px]">{error}</p>}
      <div className="mt-6">
        {!requests ? (
          <div className="space-y-3" aria-busy="true" aria-label="Loading connect requests">
            {[0, 1].map((i) => <Skeleton key={i} className="h-24 w-full" />)}
          </div>
        ) : requests.length === 0 ? (
          <StateCard kind="empty" title="No connect requests yet" detail="When a company wants to reach out before you've applied, it'll show up here." />
        ) : (
          <ul className="space-y-3">
            {requests.map((r) => (
              <li key={r.id} className="rounded-tile bg-paper p-4 text-paper-ink">
                <div className="flex items-start gap-3">
                  <CompanyMark name={r.companyName} className="size-12 shrink-0 rounded-xl text-[16px]" />
                  <div className="min-w-0 flex-1">
                    <p className="flex items-center gap-1.5 text-[16px] font-semibold">
                      {r.companyName}
                      {r.companyVerified && <ShieldCheck className="size-4 shrink-0 text-success-on-dark" aria-label="Verified company" />}
                    </p>
                    <p className="text-[13px] text-paper-ink-muted">{r.jobTitle ? `About ${r.jobTitle} · ` : ""}{timeAgo(r.createdAt)}</p>
                  </div>
                </div>
                <p className="mt-3 text-[15px] leading-relaxed">{r.note}</p>
                {r.status === "pending" ? (
                  <div className="mt-4 flex flex-wrap gap-2">
                    <Button loading={busyId === r.id} onClick={() => decide(r.id, true)}><Check className="size-4" aria-hidden /> Accept</Button>
                    <Button variant="outline" disabled={busyId === r.id} onClick={() => decide(r.id, false)}><X className="size-4" aria-hidden /> Decline</Button>
                  </div>
                ) : r.status === "accepted" ? (
                  <p className="mt-4 flex items-center gap-2 text-[14px] font-semibold text-success-on-dark">
                    <Check className="size-4" aria-hidden /> Accepted
                    {/* GET /connect-requests (the "mine" list) never carries conversationId - only
                     * the accept response does, which this page doesn't see on a later visit. Link
                     * to the inbox rather than a specific thread until the backend adds it. */}
                    <a href={r.conversationId ? `/messages/${r.conversationId}` : "/messages"} className="ml-1 inline-flex items-center gap-1 font-semibold text-primary-on-paper underline underline-offset-4">
                      <MessageCircle className="size-4" aria-hidden /> Message
                    </a>
                  </p>
                ) : (
                  <p className="mt-4 flex items-center gap-2 text-[14px] text-paper-ink-muted"><Building2 className="size-4" aria-hidden /> Declined</p>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </AppShell>
  );
}
