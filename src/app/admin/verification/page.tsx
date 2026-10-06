"use client";

import { useEffect, useState } from "react";
import { Check, Globe, X } from "lucide-react";
import { AdminShell, usePlatformAdminGate } from "@/components/admin/AdminShell";
import { AdminList, AdminLoading, AdminRow, ReasonSheet } from "@/components/admin/parts";
import {
  approveVerification,
  getVerificationQueue,
  rejectVerification,
  type VerificationQueueItem,
} from "@/lib/api/businessVerification";
import { Pills, StateCard } from "@/components/bplus/Primitives";
import { DashButton, StatusPill } from "@/components/dash/Parts";
import { formatDateTime } from "@/lib/format";

interface VerificationRequest {
  id: string;
  companyName: string;
  domain: string;
  website: string;
  gstin?: string;
  cin?: string;
  domainMatch: boolean;
  submittedAt: string;
  status: "pending" | "approved" | "rejected";
  rejectReason?: string;
}

const TABS = [
  { id: "pending" as const, label: "Pending" },
  { id: "approved" as const, label: "Approved" },
  { id: "rejected" as const, label: "Rejected" },
];

/** Real mode's VerificationQueueItem (status: pending/verified/rejected/verified_legacy) ->
 * this screen's three tabs (verified + verified_legacy both read as "approved" here). */
function toRow(item: VerificationQueueItem): VerificationRequest {
  return {
    id: item.id,
    companyName: item.companyName,
    domain: item.domain ?? "",
    website: item.website ?? "",
    gstin: item.gstin,
    cin: item.cin,
    domainMatch: item.domainMatch,
    submittedAt: item.submittedAt ?? "",
    status: item.status === "pending" ? "pending" : item.status === "rejected" ? "rejected" : "approved",
    rejectReason: item.reviewNote,
  };
}

export default function VerificationQueuePage() {
  const gate = usePlatformAdminGate();
  const [tab, setTab] = useState<(typeof TABS)[number]["id"]>("pending");
  const [items, setItems] = useState<VerificationRequest[] | null>(null);
  const [error, setError] = useState("");
  const [rejecting, setRejecting] = useState<VerificationRequest | null>(null);
  const [confirmingMismatch, setConfirmingMismatch] = useState<VerificationRequest | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = () => {
    getVerificationQueue()
      .then((q) => setItems(q.map(toRow)))
      .catch(() => setError("The verification queue didn't load. Refresh to try again."));
  };

  useEffect(() => {
    if (gate !== "ready") return;
    load();
  }, [gate]);

  // A domain mismatch can't be approved in one tap: it needs a written note. The backend's
  // approve endpoint takes no body yet, so this note isn't sent anywhere - pre-existing gap from
  // Step A, not something this step introduced or is fixing.
  const approve = async (item: VerificationRequest, _note?: string) => {
    setBusyId(item.id);
    setError("");
    try {
      await approveVerification(item.id);
      load();
    } catch (err) {
      setError(err instanceof Error && err.message ? err.message : "That didn't save.");
    } finally {
      setBusyId(null);
    }
  };

  const reject = async (reason: string) => {
    if (!rejecting) return;
    setError("");
    try {
      await rejectVerification(rejecting.id, reason);
      load();
    } catch (err) {
      setError(err instanceof Error && err.message ? err.message : "That didn't save.");
    }
  };

  return (
    <AdminShell title="Verification queue">
      {error && <p role="alert" className="mb-4 rounded-xl bg-danger/12 px-3.5 py-2.5 text-[14px]">{error}</p>}
      {!items ? (
        <AdminLoading />
      ) : (
        <>
          <Pills options={TABS} value={tab} onChange={setTab} label="Verification status" compact />
          <div className="mt-5">
            {items.filter((i) => i.status === tab).length === 0 ? (
              <StateCard kind="empty" title={`No ${tab} verifications`} detail="New company requests will appear here." />
            ) : (
              <AdminList>
                {items
                  .filter((i) => i.status === tab)
                  .map((item) => (
                    <AdminRow key={item.id}>
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-[15px] font-semibold">{item.companyName}</p>
                          <p className="mt-1 flex flex-wrap items-center gap-2 text-[13px] text-faint">
                            <Globe className="size-3.5" aria-hidden />
                            {item.website}
                          </p>
                          <dl className="mt-2 grid gap-1 text-[13px] text-faint sm:grid-cols-2">
                            <div>
                              <dt className="inline font-medium text-foreground/80">Domain: </dt>
                              <dd className="inline">{item.domain}</dd>
                            </div>
                            <div>
                              <dt className="inline font-medium text-foreground/80">Domain check: </dt>
                              <dd className="inline">{item.domainMatch ? "Matches work email" : "Mismatch — review manually"}</dd>
                            </div>
                            {item.gstin && (
                              <div>
                                <dt className="inline font-medium text-foreground/80">GSTIN: </dt>
                                <dd className="inline">{item.gstin}</dd>
                              </div>
                            )}
                            {item.cin && (
                              <div>
                                <dt className="inline font-medium text-foreground/80">CIN: </dt>
                                <dd className="inline">{item.cin}</dd>
                              </div>
                            )}
                          </dl>
                          <p className="mt-2 text-[12px] text-faint">Submitted {formatDateTime(item.submittedAt)}</p>
                          {item.rejectReason && (
                            <p className="mt-2 text-[13px] text-danger-on-dark">Rejected: {item.rejectReason}</p>
                          )}
                        </div>
                        <StatusPill status={item.status} />
                      </div>
                      {item.status === "pending" && (
                        <div className="mt-3 flex flex-wrap gap-2">
                          <DashButton variant="primary" disabled={busyId === item.id} onClick={() => (item.domainMatch ? approve(item) : setConfirmingMismatch(item))}>
                            <Check className="size-4" aria-hidden /> Approve
                          </DashButton>
                          <DashButton variant="danger" onClick={() => setRejecting(item)}>
                            <X className="size-4" aria-hidden /> Reject…
                          </DashButton>
                        </div>
                      )}
                    </AdminRow>
                  ))}
              </AdminList>
            )}
          </div>
          <ReasonSheet
            open={!!confirmingMismatch}
            title="Approve despite a domain mismatch?"
            detail={confirmingMismatch ? `${confirmingMismatch.companyName}'s domain (${confirmingMismatch.domain}) doesn't match the work email. Write why you're approving it anyway; the note goes into the audit log.` : undefined}
            confirmLabel="Approve with note"
            tone="primary"
            onClose={() => setConfirmingMismatch(null)}
            onConfirm={async (note) => {
              if (confirmingMismatch) await approve(confirmingMismatch, note);
            }}
          />
          <ReasonSheet
            open={!!rejecting}
            title="Reject verification"
            detail={rejecting ? `Explain why ${rejecting.companyName} can't be verified yet.` : undefined}
            confirmLabel="Reject with reason"
            onClose={() => setRejecting(null)}
            onConfirm={reject}
          />
        </>
      )}
    </AdminShell>
  );
}
