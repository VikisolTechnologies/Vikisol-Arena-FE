"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { Info } from "lucide-react";
import { vibrate } from "@/lib/motion";
import { AppShell } from "@/components/bplus/AppShell";
import { ButtonLink } from "@/components/bplus/Button";
import { ProceduralCover } from "@/components/covers/ProceduralCover";
import { IntakeForm, clearIntakeDraft } from "@/components/intake/IntakeForm";
import { TellJenny } from "@/components/jenny/JennyParts";
import { useGuest } from "@/hooks/use-arena-session";
import { createMyProject } from "@/lib/api/myProjects";
import { PROJECT_SCHEMA } from "@/lib/intake/schemas/project";
import type { MoneyRange, Values } from "@/lib/intake/types";

/** Flow §7 PR1–PR2. Paid projects publish to the existing projects marketplace; collaborative
 *  projects (roles, applicants, team room) wait for the API (FE-API-GAPS #26) and stay a draft. */
export function ProjectCreateFlow() {
  const router = useRouter();
  const params = useSearchParams();
  const guest = useGuest();
  // A Jenny pre-fill rewrites the draft: remount the form so it reads it (and marks her fields).
  const [prefilled, setPrefilled] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const submit = async (v: Values) => {
    if (v.paid !== "paid") {
      router.push("/work?draft=project");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const budget = (v.budget as MoneyRange | undefined) ?? {};
      const roles = (v.roles as string[] | undefined) ?? [];
      const description = [String(v.goal ?? "").trim(), roles.length ? `Roles: ${roles.join(", ")}` : "", `About ${v.hours ?? 4} h a week · ${v.where === "remote" ? "Remote" : v.where === "both" ? "Local or remote" : "Local"}`].filter(Boolean).join("\n\n");
      const p = await createMyProject({ title: String(v.title ?? "").trim(), description, budgetMin: budget.min ?? 0, budgetMax: budget.max ?? budget.min ?? 0, durationWeeks: Number(v.weeks ?? 6), skills: (v.skills as string[] | undefined) ?? [] });
      clearIntakeDraft("project");
      vibrate();
      router.replace(`/marketplace/${p.id}`);
    } catch (err) {
      setError(err instanceof Error && err.message ? err.message : "It didn't publish. Your answers are saved — try again.");
      setBusy(false);
    }
  };

  if (guest === null) return <AppShell><div className="flex-1" /></AppShell>;
  return (
    <AppShell>
      <div className="-mx-5 -mt-[max(8px,env(safe-area-inset-top))] flex-1 overflow-x-hidden bg-paper px-5 pb-6 pt-[max(12px,env(safe-area-inset-top))] text-paper-ink">
        {guest ? (
          <div className="pt-8">
            <h1 className="font-display-serif text-[28px] font-medium">Start a project</h1>
            <p className="mt-2 text-[15px] text-paper-ink-muted">Sign in to start one.</p>
            <ButtonLink href="/auth?mode=signin" className="mt-6">Sign in</ButtonLink>
          </div>
        ) : (
          <IntakeForm
            key={prefilled}
            schema={PROJECT_SCHEMA}
            draftKey="project"
            startAt={params.get("start") ?? undefined}
            intro={<TellJenny kind="project" example="A map of every lake clean-up spot in Gachibowli" className="mt-4" onPrefill={() => setPrefilled((n) => n + 1)} />}
            onExit={() => router.push("/home")}
            onSubmit={submit}
            submitText={(v) => (v.paid === "paid" ? "Publish project" : "Save draft")}
            busy={busy}
            submitError={error}
            reviewExtra={(v) => (
              <section className="mt-4" aria-label="Preview">
                <div className="relative aspect-video overflow-hidden rounded-tile">
                  <ProceduralCover seed={`project-${String(v.title ?? "draft")}`} category={undefined} subtypeId={undefined} className="absolute inset-0" />
                </div>
                {v.paid !== "paid" && (
                  <p className="mt-3 flex items-start gap-2 rounded-tile bg-paper-muted p-3 text-[14px]">
                    <Info className="mt-0.5 size-4 shrink-0" aria-hidden /> Collaborative projects open soon. Your project is saved on this device and publishes as soon as Arena supports roles and team rooms.
                  </p>
                )}
              </section>
            )}
          />
        )}
      </div>
    </AppShell>
  );
}
