"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { isRealMode } from "@/lib/api/mode";
import { readApplications, writeApplications } from "@/lib/api/applicationsStore";
import { BUSINESS, person } from "@/lib/fixtures/world";
import { saveEnterpriseProfile, setEnterpriseOnboarded, setSession } from "@/lib/session";
import type { ApplicationStage, JobPosting } from "@/lib/types";

const DEMO_JOB = BUSINESS.job.id;

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
    saveEnterpriseProfile({ ...company, plan: "pro", seatsUsed: 2, seatsTotal: 5, unlockCreditsUsed: 1, unlockCreditsTotal: 10, status: "active" });
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
