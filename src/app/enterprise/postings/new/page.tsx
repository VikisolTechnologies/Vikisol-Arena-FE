"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ShieldCheck } from "lucide-react";
import { EnterpriseAppShell } from "@/components/app/EnterpriseAppShell";
import { IntakeForm, clearIntakeDraft } from "@/components/intake/IntakeForm";
import { createPosting, getMyEnterpriseProfile, PostingLimitError } from "@/lib/api/enterprise";
import { getMyVerification } from "@/lib/api/businessVerification";
import { requireEnterpriseOnboarded } from "@/lib/auth-guard";
import { JOB_SCHEMA } from "@/lib/intake/schemas/job";
import type { EmploymentType, EnterpriseProfile } from "@/lib/types";
import type { MoneyRange, Values } from "@/lib/intake/types";

/** Recruiter board 3 — Post a job. Same `createPosting` call as before; must-haves and
 *  nice-to-haves go into skills + the description. Deadline and questions are stored with the job. */
export default function NewPostingPage() {
  const router = useRouter();
  const [profile, setProfile] = useState<EnterpriseProfile | null>(null);
  const [verified, setVerified] = useState<boolean | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!requireEnterpriseOnboarded(router)) return;
    getMyEnterpriseProfile().then(setProfile).catch(() => setError("Your company profile didn't load."));
    // MARATHON-FE-2 Step A: an unverified company's posting can only be saved as a draft - the
    // backend 400s OPEN at creation, not only on publish. Used to decide which status to send,
    // not to block opening this form at all.
    getMyVerification().then((v) => setVerified(!!v && (v.status === "verified" || v.legacy))).catch(() => setVerified(false));
  }, [router]);

  const publish = async (v: Values) => {
    if (!profile) return;
    setBusy(true);
    setError("");
    const must = (v.must as string[] | undefined) ?? [];
    const nice = (v.nice as string[] | undefined) ?? [];
    const pay = (v.pay as MoneyRange | undefined) ?? {};
    const description = [
      String(v.about ?? "").trim(),
      must.length ? `Must-haves:\n${must.map((x) => `• ${x}`).join("\n")}` : "",
      nice.length ? `Nice-to-haves:\n${nice.map((x) => `• ${x}`).join("\n")}` : "",
      v.level ? `Experience: ${v.level}` : "",
    ].filter(Boolean).join("\n\n");
    try {
      const posting = await createPosting({
        title: String(v.title ?? "").trim(),
        description,
        industry: profile.industry,
        location: String(v.location ?? "").trim(),
        remote: v.mode === "remote",
        employmentType: (v.type as EmploymentType) ?? "Full Time",
        salaryMin: pay.min ?? 0,
        salaryMax: pay.max ?? pay.min ?? 0,
        skills: [...must, ...nice],
        status: verified ? "open" : "draft",
        deadline: v.deadline ? String(v.deadline) : undefined,
        experienceLevel: v.level ? String(v.level) : undefined,
        questions: ((v.questions as string[] | undefined) ?? []).filter(Boolean).map((text) => ({ text, required: true })),
      });
      clearIntakeDraft("job");
      router.replace(`/enterprise/postings/${posting.id}?published=${verified ? "1" : "0"}`);
    } catch (e) {
      setError(e instanceof PostingLimitError ? e.message : e instanceof Error && e.message ? e.message : "The job didn't publish. Your answers are kept — try again.");
      setBusy(false);
    }
  };

  return (
    <EnterpriseAppShell profile={profile}>
      <div className="mx-auto max-w-[620px] overflow-hidden rounded-[28px] bg-paper px-5 pb-6 pt-4 text-paper-ink sm:px-8">
        {profile && (
          <IntakeForm
            schema={JOB_SCHEMA}
            draftKey="job"
            tabBar={false}
            onExit={() => router.push("/enterprise/postings")}
            onSubmit={publish}
            busy={busy}
            submitError={error}
            reviewExtra={() => (
              <p className="mt-4 flex gap-2.5 rounded-tile bg-paper-muted p-4 text-[14px]">
                <ShieldCheck className="mt-0.5 size-5 shrink-0 text-success-on-paper" aria-hidden />
                We don&apos;t allow requirements based on age, gender, marital status, religion, caste, disability status or other protected attributes. Jobs that include them are removed.
              </p>
            )}
          />
        )}
      </div>
    </EnterpriseAppShell>
  );
}
