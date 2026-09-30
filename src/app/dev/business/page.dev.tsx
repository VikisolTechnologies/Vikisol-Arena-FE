"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { isRealMode } from "@/lib/api/mode";
import { readApplications, writeApplications } from "@/lib/api/applicationsStore";
import { BUSINESS, person } from "@/lib/fixtures/world";
import type { Conversation, Interview, ThreadMessage } from "@/lib/types";
import { saveEnterpriseProfile, setEnterpriseOnboarded, setSession } from "@/lib/session";
import type { ApplicationStage, JobPosting } from "@/lib/types";

const DEMO_JOB = BUSINESS.job.id;

const DAY = 86_400_000;
const IST = 5.5 * 3_600_000;
const ago = (days: number) => new Date(Date.now() - days * DAY).toISOString();

/** One coherent GreenLeaf week: the team's activity matches the pipeline (8 applicants, 6 moved past
 *  "New", 1 interview booked, 7 profiles unlocked of the Pro plan's 50), and the inbox holds only
 *  GreenLeaf's own candidate threads. */
function seedBusinessWorld() {
  const audit = [
    { actorName: "Alex Rao", action: "posting.created", target: BUSINESS.job.title, createdAt: ago(12) },
    { actorName: "Alex Rao", action: "candidate.unlocked", target: "Ravi Kumar", createdAt: ago(9) },
    { actorName: "Alex Rao", action: "candidate.unlocked", target: "Divya Nair", createdAt: ago(9) },
    { actorName: "Alex Rao", action: "stage.moved", target: "Ravi Kumar", metadata: "New → Reviewing", createdAt: ago(8) },
    { actorName: "Alex Rao", action: "stage.moved", target: "Divya Nair", metadata: "New → Reviewing", createdAt: ago(6) },
    { actorName: "Alex Rao", action: "stage.moved", target: "Arjun Nair", metadata: "Reviewing → Interview", createdAt: ago(3) },
    { actorName: "Alex Rao", action: "interview.scheduled", target: "Arjun Nair", createdAt: ago(2) },
    { actorName: "Alex Rao", action: "message.sent", target: "Arjun Nair", createdAt: ago(2) },
    { actorName: "Alex Rao", action: "message.sent", target: "Sunita Menon", createdAt: ago(1) },
    ...["Meera Iyer", "Lakshmi Devi", "Venkat Rao", "Arjun Nair", "Sunita Menon"].map((t, i) => ({ actorName: "Priyanka Rao", action: "candidate.unlocked", target: t, createdAt: ago(14 + i) })),
    { actorName: "Priyanka Rao", action: "stage.moved", target: "Ananya Rao", metadata: "Reviewing → Not selected", createdAt: ago(5) },
    { actorName: "Priyanka Rao", action: "stage.moved", target: "Sunita Menon", metadata: "Interview → Offer", createdAt: ago(1) },
    { actorName: "Priyanka Rao", action: "stage.moved", target: "Lakshmi Devi", metadata: "Offer → Hired", createdAt: ago(0.5) },
    { actorName: "Priyanka Rao", action: "message.sent", target: "Divya Nair", createdAt: ago(3) },
    { actorName: "Karthik Iyer", action: "message.sent", target: "Arjun Nair", createdAt: ago(2) },
  ].map((a, i) => ({ id: `audit-seed-${i}`, ...a }));
  localStorage.setItem("arena_admin_audit", JSON.stringify(audit));

  const min = (m: number) => new Date(Date.now() - m * 60_000).toISOString();
  const threads: { key: string; context: string; last: number; unread: boolean; msgs: [boolean, string, number][] }[] = [
    { key: "arjun", context: BUSINESS.job.title, last: 30, unread: true, msgs: [[true, "Hi Arjun, thanks for applying. Your lake clean-up work is exactly what this role needs.", 2880], [false, "Thank you! Happy to tell you more about how we ran the last one.", 2820], [true, "Great. We've offered you a first chat tomorrow at 3 PM.", 2800], [false, "Works for me. See you then.", 30]] },
    { key: "sunita", context: BUSINESS.job.title, last: 240, unread: false, msgs: [[true, "Sunita, we'd like to make you an offer. Do you have 10 minutes this week?", 1500], [false, "Yes, tomorrow morning works.", 240]] },
    { key: "divya", context: BUSINESS.job.title, last: 26 * 60, unread: false, msgs: [[true, "Hi Divya, could you tell us which weekends you can do?", 26 * 60 + 5], [false, "Most Saturdays and every second Sunday.", 26 * 60]] },
  ];
  const convs: Conversation[] = threads.map((t) => ({ id: `biz-conv-${t.key}`, participantId: person(t.key).id, participantName: person(t.key).name, participantEmoji: person(t.key).name[0], context: t.context, lastMessageAt: min(t.last), unread: t.unread }));
  const msgs: ThreadMessage[] = threads.flatMap((t) => t.msgs.map(([fromMe, content, ago], i) => ({ id: `biz-m-${t.key}-${i}`, conversationId: `biz-conv-${t.key}`, fromMe, content, timestamp: min(ago) })));
  localStorage.setItem("arena_conversations", JSON.stringify(convs));
  localStorage.setItem("arena_thread_messages", JSON.stringify(msgs));

  // Arjun (interview stage) has a confirmed slot tomorrow at 3 PM India time.
  const tomorrow3pm = new Date(Math.floor((Date.now() + IST) / DAY) * DAY - IST + DAY + 15 * 3_600_000).toISOString();
  const interview: Interview = { id: "iv-demo-0", applicationId: "demo-app-0", proposedSlots: [{ id: "slot-0", start: tomorrow3pm, durationMinutes: 45 }], confirmedSlotId: "slot-0", status: "confirmed" };
  localStorage.setItem("arena_interviews", JSON.stringify([interview]));
}

/** Preview-only: signs this browser in as a demo recruiter in MOCK mode and seeds one job with
 *  applicants, then opens `?to=`. Lets the founder see the business screens without a backend.
 *  Never runs against the real API (mock mode only) and /dev is 404 in production. */
function Seed() {
  const router = useRouter();
  const to = useSearchParams().get("to") ?? "/enterprise/dashboard";
  const [blocked] = useState(() => isRealMode());

  useEffect(() => {
    if (blocked) return;
    const { recruiter, company, job: j, applicants } = BUSINESS;
    setSession({ role: "company_admin", name: recruiter.name, email: recruiter.email });
    saveEnterpriseProfile({ ...company, ...BUSINESS.plan, status: "active" });
    setEnterpriseOnboarded();
    localStorage.setItem("arena_cookie_consent", "accepted");
    const day = 86_400_000;
    const job: JobPosting = {
      id: DEMO_JOB,
      title: j.title,
      industry: company.industry,
      location: "Gachibowli, Hyderabad",
      remote: false,
      employmentType: "Full Time",
      salaryMin: 3,
      salaryMax: 4,
      skills: [...j.must],
      description: `Help run neighbourhood programs, from sign-ups to the day itself.\n\nMust-haves:\n${j.must.map((x) => `• ${x}`).join("\n")}\n\nExperience: ${j.experience}`,
      status: "open",
      createdAt: new Date(Date.now() - 12 * day).toISOString(),
    };
    const others = JSON.parse(localStorage.getItem("arena_enterprise_postings") || "[]").filter((p: JobPosting) => p.id !== DEMO_JOB);
    localStorage.setItem("arena_enterprise_postings", JSON.stringify([job, ...others]));
    writeApplications([
      ...applicants.map((a, i) => ({ id: `demo-app-${i}`, candidateId: person(a.key).id, postingId: DEMO_JOB, stage: a.stage as ApplicationStage, appliedAt: new Date(Date.now() - (i + 1) * 0.8 * day).toISOString(), updatedAt: new Date(Date.now() - i * 0.5 * day).toISOString() })),
      ...readApplications().filter((a) => a.postingId !== DEMO_JOB),
    ]);
    seedBusinessWorld();
    // A full load, so shell-level state (session, cookie bar) is read fresh.
    window.location.replace(to);
  }, [blocked, router, to]);

  return <p className="p-6 text-[15px] text-faint">{blocked ? "The business demo only runs in mock mode." : "Opening the business demo…"}</p>;
}

export default function DevBusinessPage() {
  return (
    <Suspense>
      <Seed />
    </Suspense>
  );
}
