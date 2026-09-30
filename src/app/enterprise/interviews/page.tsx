"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { CalendarClock, CheckCircle2, Clock3 } from "lucide-react";
import { EnterpriseAppShell } from "@/components/app/EnterpriseAppShell";
import { Avatar } from "@/components/bplus/Avatar";
import { Skeleton, StateCard } from "@/components/bplus/Primitives";
import { DashButton, Panel, Row } from "@/components/dash/Parts";
import { when } from "@/components/interview/InterviewRoom";
import { getMyEnterpriseProfile, getMyPostings } from "@/lib/api/enterprise";
import { getInterviewForApplication } from "@/lib/api/interviews";
import { requireEnterpriseOnboarded } from "@/lib/auth-guard";
import { loadApplicants, type Applicant } from "@/lib/data/business";
import type { EnterpriseProfile, Interview } from "@/lib/types";

type Item = { a: Applicant; iv: Interview | null };

/** Arena for Business — Interviews (flow §8; no board — designed in B+): everyone at the
 *  interview stage, grouped by what they need from you. Reads existing calls only. */
export default function InterviewsPage() {
  const router = useRouter();
  const [profile, setProfile] = useState<EnterpriseProfile | null>(null);
  const [items, setItems] = useState<Item[] | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!requireEnterpriseOnboarded(router)) return;
    getMyEnterpriseProfile().then(setProfile).catch(() => {});
    getMyPostings()
      .then(loadApplicants)
      .then(async (as) => {
        const inStage = as.filter((a) => a.stage === "interview");
        const ivs = await Promise.allSettled(inStage.map((a) => getInterviewForApplication(a.id)));
        setItems(inStage.map((a, i) => ({ a, iv: ivs[i].status === "fulfilled" ? ivs[i].value : null })));
      })
      .catch(() => {
        setError(true);
        setItems([]);
      });
  }, [router]);

  const slotOf = (iv: Interview | null) => iv?.proposedSlots.find((s) => s.id === iv.confirmedSlotId);
  const upcoming = (items ?? []).filter((x) => x.iv?.status === "confirmed").sort((x, y) => Date.parse(slotOf(x.iv)?.start ?? "") - Date.parse(slotOf(y.iv)?.start ?? ""));
  const waiting = (items ?? []).filter((x) => !x.iv || x.iv.status === "proposed");
  const decide = (items ?? []).filter((x) => x.iv?.status === "completed");

  const row = (x: Item, meta: string) => (
    <li key={x.a.id}>
      <Row href={`/enterprise/interviews/${x.a.id}`} lead={<Avatar name={x.a.candidate?.name ?? "Candidate"} className="size-10 text-[14px]" />} title={x.a.candidate?.name ?? "Candidate"} meta={`${x.a.posting.title} · ${meta}`} />
    </li>
  );

  return (
    <EnterpriseAppShell title="Interviews" profile={profile}>
      {error && <p role="alert" className="mb-4 rounded-xl bg-danger/12 px-3.5 py-2.5 text-[14px]">Interviews didn&apos;t load. Refresh to try again.</p>}
      {!items ? (
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-2"><Skeleton className="h-48" /><Skeleton className="h-48" /></div>
      ) : items.length === 0 && !error ? (
        <StateCard kind="empty" title="No one at interview yet" detail="Move a candidate to Interview from a job's pipeline to start scheduling." action={<DashButton href="/enterprise/postings">Open jobs</DashButton>} />
      ) : (
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
          <div className="space-y-5">
            <Panel title="Upcoming" action={<CalendarClock className="size-5 text-faint" aria-hidden />}>
              {upcoming.length ? <ul>{upcoming.map((x) => row(x, slotOf(x.iv) ? when(slotOf(x.iv)!.start) : "Time set"))}</ul> : <p className="text-[14px] text-faint">Nothing scheduled.</p>}
            </Panel>
            <Panel title="Needs a decision" action={<CheckCircle2 className="size-5 text-faint" aria-hidden />}>
              {decide.length ? <ul>{decide.map((x) => row(x, "Feedback in — choose offer or not selected"))}</ul> : <p className="text-[14px] text-faint">No completed interviews waiting on you.</p>}
            </Panel>
          </div>
          <Panel title="Waiting for a time" action={<Clock3 className="size-5 text-faint" aria-hidden />}>
            {waiting.length ? <ul>{waiting.map((x) => row(x, x.iv ? "Times offered" : "Not scheduled yet"))}</ul> : <p className="text-[14px] text-faint">Everyone has a time.</p>}
          </Panel>
        </div>
      )}
    </EnterpriseAppShell>
  );
}
