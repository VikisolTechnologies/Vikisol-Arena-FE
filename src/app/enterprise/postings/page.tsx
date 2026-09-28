"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { m } from "motion/react";
import { Lock, MapPin, Plus, Users } from "lucide-react";
import { rise } from "@/lib/motion";
import { EnterpriseAppShell } from "@/components/app/EnterpriseAppShell";
import { Pills, Skeleton, StateCard } from "@/components/bplus/Primitives";
import { DashButton, StatusPill } from "@/components/dash/Parts";
import { getMyEnterpriseProfile, getMyPostings, setPostingStatus } from "@/lib/api/enterprise";
import { POSTING_LIMITS } from "@/lib/plan";
import { requireEnterpriseOnboarded } from "@/lib/auth-guard";
import { loadApplicants, type Applicant } from "@/lib/data/business";
import type { EnterpriseProfile, JobPosting } from "@/lib/types";

const TABS = [
  { id: "open", label: "Published" },
  { id: "paused", label: "Paused" },
  { id: "closed", label: "Closed" },
] as const;
type Tab = (typeof TABS)[number]["id"];

function Postings() {
  const router = useRouter();
  const params = useSearchParams();
  const [profile, setProfile] = useState<EnterpriseProfile | null>(null);
  const [postings, setPostings] = useState<JobPosting[] | null>(null);
  const [applicants, setApplicants] = useState<Applicant[]>([]);
  const [tab, setTab] = useState<Tab>("open");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState("");

  const load = () =>
    getMyPostings()
      .then((p) => {
        setPostings(p);
        return loadApplicants(p);
      })
      .then(setApplicants)
      .catch(() => setError("Jobs didn't load. Try again."));

  useEffect(() => {
    if (!requireEnterpriseOnboarded(router)) return;
    if (params.get("new") === "1") {
      router.replace("/enterprise/postings/new");
      return;
    }
    getMyEnterpriseProfile().then(setProfile).catch(() => {});
    void load();
  }, [router, params]);

  const change = async (p: JobPosting, status: JobPosting["status"]) => {
    setBusyId(p.id);
    setError("");
    try {
      await setPostingStatus(p.id, status);
      await load();
    } catch {
      setError("That didn't change. Try again.");
    } finally {
      setBusyId(null);
    }
  };

  const active = (postings ?? []).filter((p) => p.status !== "closed").length;
  const limit = profile ? POSTING_LIMITS[profile.plan] : Infinity;
  const atLimit = active >= limit;
  const shown = (postings ?? []).filter((p) => p.status === tab);

  return (
    <EnterpriseAppShell
      title="Jobs"
      profile={profile}
      actions={
        <>
          {Number.isFinite(limit) && <span className="text-[14px] text-faint">{active}/{limit} active on your plan</span>}
          {atLimit ? (
            <DashButton href="/pricing" variant="outline"><Lock className="size-4" aria-hidden /> Plan limit reached — view plans</DashButton>
          ) : (
            <DashButton href="/enterprise/postings/new"><Plus className="size-4" aria-hidden /> Post a job</DashButton>
          )}
        </>
      }
    >
      <Pills label="Show" options={TABS} value={tab} onChange={setTab} compact />
      {error && <p role="alert" className="mt-4 rounded-xl bg-danger/12 px-3.5 py-2.5 text-[14px]">{error}</p>}
      <div className="mt-5">
        {!postings ? (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-44" />)}</div>
        ) : shown.length === 0 ? (
          <StateCard kind="empty" title={tab === "open" ? "No published jobs" : `No ${tab} jobs`} detail={tab === "open" ? "Post a job to start receiving applicants." : undefined} action={tab === "open" && !atLimit ? <DashButton href="/enterprise/postings/new">Post a job</DashButton> : undefined} />
        ) : (
          <m.ul initial="hidden" animate="shown" className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {shown.map((p, i) => {
              const mine = applicants.filter((a) => a.posting.id === p.id);
              const fresh = mine.filter((a) => a.stage === "applied").length;
              return (
                <m.li key={p.id} variants={rise} custom={i} className="flex flex-col rounded-tile border border-line bg-surface p-5">
                  <div className="flex items-start justify-between gap-2">
                    <h2 className="text-[17px] font-semibold leading-snug">{p.title}</h2>
                    <StatusPill status={p.status} />
                  </div>
                  <p className="mt-1.5 flex items-center gap-1 text-[14px] text-faint"><MapPin className="size-3.5" aria-hidden /> {p.location}{p.remote && " · Remote"}</p>
                  <p className="mt-3 flex items-center gap-1.5 text-[14px]">
                    <Users className="size-4 text-faint" aria-hidden /> {mine.length} applicant{mine.length === 1 ? "" : "s"}
                    {fresh > 0 && <span className="rounded-full bg-info/15 px-2 py-0.5 text-[12px] font-semibold text-info">{fresh} new</span>}
                  </p>
                  <div className="mt-auto flex flex-wrap gap-2 pt-4">
                    <DashButton href={`/enterprise/postings/${p.id}`}>Open</DashButton>
                    {p.status !== "closed" && <DashButton variant="outline" disabled={busyId === p.id} onClick={() => change(p, p.status === "open" ? "paused" : "open")}>{p.status === "open" ? "Pause" : "Reopen"}</DashButton>}
                    {p.status !== "closed" && <DashButton variant="danger" disabled={busyId === p.id} onClick={() => change(p, "closed")}>Close</DashButton>}
                  </div>
                </m.li>
              );
            })}
          </m.ul>
        )}
      </div>
    </EnterpriseAppShell>
  );
}

/** Arena for Business — Jobs (flow §8). */
export default function PostingsPage() {
  return (
    <Suspense>
      <Postings />
    </Suspense>
  );
}
