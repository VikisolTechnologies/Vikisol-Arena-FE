"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { Info } from "lucide-react";
import { ArenaLogo } from "@/components/brand/ArenaLogo";
import { IntakeForm, clearIntakeDraft } from "@/components/intake/IntakeForm";
import { saveMyEnterpriseProfile } from "@/lib/api/enterprise";
import { setEnterpriseOnboarded } from "@/lib/session";
import { requireSession } from "@/lib/auth-guard";
import { businessSchema } from "@/lib/intake/schemas/business";
import { useIndustries } from "@/lib/data/industries";
import type { CompanySize } from "@/lib/types";
import type { Values } from "@/lib/intake/types";

const subscribeNothing = () => () => {};

/** Recruiter board 2 — Company workspace (Arena for Business setup). Saves the same enterprise
 *  profile as before; verification fields wait for the API (FE-API-GAPS #29). */
export default function EnterpriseOnboardingPage() {
  const router = useRouter();
  const ready = useSyncExternalStore(subscribeNothing, () => true, () => false);
  const industries = useIndustries();
  const schema = useMemo(() => businessSchema(industries), [industries]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    requireSession(router);
  }, [router]);

  const finish = async (v: Values) => {
    if (!requireSession(router)) return;
    setBusy(true);
    setError("");
    try {
      await saveMyEnterpriseProfile({
        companyName: String(v.companyName ?? "").trim(),
        logoEmoji: "🏢",
        industry: String(v.industry ?? ""),
        size: (v.size as CompanySize) ?? "11-50",
        hiringFor: (v.hiringFor as string[] | undefined) ?? [],
        plan: "free",
        seatsUsed: 1,
        seatsTotal: 3,
        unlockCreditsUsed: 0,
        unlockCreditsTotal: 25,
        status: "active",
      });
      setEnterpriseOnboarded();
      clearIntakeDraft("business");
      router.push("/enterprise/dashboard");
    } catch (err) {
      setError(err instanceof Error && err.message ? err.message : "Setup didn't save. Your answers are kept — try again.");
      setBusy(false);
    }
  };

  return (
    <div data-theme="bplus" className="min-h-svh bg-background">
      <div className="mx-auto min-h-svh max-w-[560px] bg-paper px-5 pb-8 pt-[max(16px,env(safe-area-inset-top))] text-paper-ink sm:my-8 sm:min-h-0 sm:rounded-[28px]">
        <p className="mb-4 flex items-center gap-2 text-[20px] text-paper-ink">
          <ArenaLogo /> <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide text-primary-on-paper">Business</span>
        </p>
        {ready && (
          <IntakeForm
            schema={schema}
            draftKey="business"
            tabBar={false}
            onExit={() => router.push("/auth")}
            onSubmit={finish}
            busy={busy}
            submitError={error}
            reviewExtra={() => (
              <section className="mt-4 flex gap-3 rounded-tile bg-paper-muted p-4" aria-label="Verification">
                <Info className="mt-0.5 size-5 shrink-0" aria-hidden />
                <div>
                  <p className="text-[15px] font-semibold">Company verification</p>
                  <p className="mt-0.5 text-[14px] text-paper-ink-muted">Right after this, verify your company&apos;s domain from Company profile — it takes a minute, and a job can&apos;t publish until it&apos;s done.</p>
                </div>
              </section>
            )}
          />
        )}
      </div>
    </div>
  );
}
