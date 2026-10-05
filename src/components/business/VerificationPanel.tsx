"use client";

import { useEffect, useState } from "react";
import { BadgeCheck, Info, ShieldAlert } from "lucide-react";
import { Panel } from "@/components/dash/Parts";
import { Button } from "@/components/bplus/Button";
import {
  confirmVerification,
  getMyVerification,
  submitVerification,
  SUBMITTER_ROLES,
  type SubmitterRole,
  type VerificationView,
} from "@/lib/api/businessVerification";

const field = "mt-1.5 min-h-12 w-full rounded-xl border border-field-line bg-transparent px-3 text-[15px] outline-none focus-visible:border-primary aria-[invalid=true]:border-danger-on-dark [&>option]:text-paper-ink";

/**
 * MARATHON-FE-2 Step A. Company verification — ARENA-APP-FLOW.md's business section: website +
 * work email → a code to the domain → "Pending review" → the platform admin approves or
 * rejects, with a note → Verified badge or Rejected (with the reason and a retry). This had no
 * frontend code at all before this mission; built and verified live against the real backend
 * (`BusinessController.java`).
 */
export function VerificationPanel() {
  const [view, setView] = useState<VerificationView | null | undefined>(undefined);
  const [stage, setStage] = useState<"form" | "code">("form");
  const [legalName, setLegalName] = useState("");
  const [website, setWebsite] = useState("");
  const [workEmail, setWorkEmail] = useState("");
  const [submitterRole, setSubmitterRole] = useState<SubmitterRole>("founder");
  const [hqCity, setHqCity] = useState("");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const load = () => getMyVerification().then((v) => setView(v ?? null)).catch(() => setView(null));
  useEffect(() => {
    load();
  }, []);

  const submit = async () => {
    setBusy(true);
    setError("");
    try {
      const v = await submitVerification({ legalName: legalName.trim(), website: website.trim(), workEmail: workEmail.trim(), submitterRole, hqCity: hqCity.trim() || undefined });
      if (v) setView(v);
      setStage("code");
    } catch (err) {
      setError(err instanceof Error && err.message ? err.message : "That didn't send. Try again.");
    } finally {
      setBusy(false);
    }
  };

  const confirm = async () => {
    setBusy(true);
    setError("");
    try {
      const v = await confirmVerification(code.trim());
      if (v) setView(v);
      setCode("");
    } catch (err) {
      setError(err instanceof Error && err.message ? err.message : "That code didn't work. Try again.");
    } finally {
      setBusy(false);
    }
  };

  if (view === undefined) return <Panel title="Company verification"><p className="text-[14px] text-faint">Loading…</p></Panel>;

  if (view?.status === "verified" || view?.legacy) {
    return (
      <Panel title="Company verification">
        <p className="flex items-center gap-2 text-[15px] font-semibold text-success-on-paper"><BadgeCheck className="size-5" aria-hidden /> Verified</p>
        <p className="mt-1 text-[14px] text-faint">{view.legacy ? "Grandfathered — here before verification became required." : `Domain proven: ${view.domain}`}</p>
      </Panel>
    );
  }

  if (view?.status === "rejected") {
    return (
      <Panel title="Company verification">
        <p className="flex items-center gap-2 text-[15px] font-semibold text-danger-on-dark"><ShieldAlert className="size-5" aria-hidden /> Not verified</p>
        {view.reviewNote && <p className="mt-1 text-[14px] text-faint">{view.reviewNote}</p>}
        <Button className="mt-4 max-w-[220px]" variant="outline" onClick={() => { setStage("form"); setView(null); }}>Try again</Button>
      </Panel>
    );
  }

  if (view?.status === "pending" && view.domainConfirmed) {
    return (
      <Panel title="Company verification">
        <p className="text-[15px] font-semibold">Pending review</p>
        <p className="mt-1 text-[14px] text-faint">{view.domain} is confirmed — Arena&apos;s team will review it shortly.</p>
      </Panel>
    );
  }

  if (view?.status === "pending" && stage !== "code") {
    // A code is already out for a submission we haven't confirmed yet (e.g. a reload).
    setStage("code");
  }

  return (
    <Panel title="Company verification">
      {stage === "form" ? (
        <div className="space-y-3">
          <p className="flex gap-2 text-[13px] text-faint"><Info className="mt-0.5 size-4 shrink-0" aria-hidden /> A job can&apos;t publish until your company is verified. It takes a minute: prove you control your company&apos;s domain.</p>
          <label className="block text-[14px] font-semibold">Legal name
            <input value={legalName} onChange={(e) => setLegalName(e.target.value)} maxLength={200} className={field} />
          </label>
          <label className="block text-[14px] font-semibold">Website
            <input value={website} onChange={(e) => setWebsite(e.target.value)} placeholder="https://yourcompany.com" className={field} />
          </label>
          <label className="block text-[14px] font-semibold">Work email
            <input type="email" value={workEmail} onChange={(e) => setWorkEmail(e.target.value)} placeholder="you@yourcompany.com" className={field} />
          </label>
          <label className="block text-[14px] font-semibold">Your role
            <select value={submitterRole} onChange={(e) => setSubmitterRole(e.target.value as SubmitterRole)} className={field}>
              {SUBMITTER_ROLES.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
            </select>
          </label>
          <label className="block text-[14px] font-semibold">HQ city (optional)
            <input value={hqCity} onChange={(e) => setHqCity(e.target.value)} maxLength={60} className={field} />
          </label>
          {error && <p role="alert" className="rounded-xl bg-danger/12 px-3.5 py-2.5 text-[14px]">{error}</p>}
          <Button loading={busy} disabled={!legalName.trim() || !website.trim() || !workEmail.trim()} onClick={submit}>Send verification code</Button>
        </div>
      ) : (
        <div className="space-y-3">
          <p className="text-[14px] text-faint">We sent a code to {workEmail || "your work email"}. It expires in 30 minutes.</p>
          <label className="block text-[14px] font-semibold">Code
            <input value={code} onChange={(e) => setCode(e.target.value)} inputMode="numeric" maxLength={6} className={field} />
          </label>
          {error && <p role="alert" className="rounded-xl bg-danger/12 px-3.5 py-2.5 text-[14px]">{error}</p>}
          <Button loading={busy} disabled={code.trim().length !== 6} onClick={confirm}>Confirm code</Button>
        </div>
      )}
    </Panel>
  );
}
