import { ShieldCheck, Wand2 } from "lucide-react";
import type { CandidateProfile, Job } from "@/lib/types";
import { cn } from "@/lib/utils";
import { DownloadPdfButton } from "./DownloadPdfButton";

/** Doc-style rendering of the resume the agent tailored for this specific role — skills that
 *  matched the job are visually highlighted and pulled to the front. Shows a visible diff
 *  against the candidate's standard Arena CV (src/components/applications/ArenaCV.tsx) so it's
 *  clear this isn't just "the resume" — it's a version the agent built for this application. */
export function TailoredResume({ profile, job }: { profile: CandidateProfile; job: Job }) {
  const jobSkillsLower = new Set(job.skills.map((s) => s.toLowerCase()));
  const sortedSkills = [...profile.skills].sort((a, b) => {
    const aMatch = jobSkillsLower.has(a.name.toLowerCase());
    const bMatch = jobSkillsLower.has(b.name.toLowerCase());
    return aMatch === bMatch ? 0 : aMatch ? -1 : 1;
  });
  const matchedCount = sortedSkills.filter((s) => jobSkillsLower.has(s.name.toLowerCase())).length;

  const baseTop3 = new Set(profile.skills.slice(0, 3).map((s) => s.name));
  const promoted = sortedSkills.slice(0, 3).map((s) => s.name).filter((name) => !baseTop3.has(name));

  return (
    <div>
      {(promoted.length > 0 || matchedCount > 0) && (
        <div className="mb-3 flex items-start gap-2 rounded-2xl border border-primary/25 bg-primary/[0.05] px-4 py-3">
          <Wand2 className="mt-0.5 size-4 shrink-0 text-primary-soft" />
          <p className="text-xs leading-relaxed text-muted-foreground">
            <span className="font-semibold text-primary-soft">What the agent changed for this role: </span>
            {promoted.length > 0 && <>promoted {promoted.join(", ")} to the top since {job.company} asks for {promoted.length > 1 ? "them" : "it"}. </>}
            {matchedCount} of {sortedSkills.length} skills highlighted as a direct match, rest kept from your standard CV as-is.
          </p>
        </div>
      )}

      <div className="rounded-[24px] border border-border bg-white p-8 text-[#1a1a1a] shadow-[0_20px_60px_rgba(0,0,0,0.5)] arena-print-cv">
        <div className="flex items-start justify-between border-b border-black/10 pb-4">
          <div>
            <h2 className="font-display text-2xl font-bold tracking-tight">{profile.name}</h2>
            <p className="text-sm text-black/60">
              {profile.title} · {profile.location}
            </p>
          </div>
          <span className="rounded-full bg-orange-50 px-3 py-1 text-[11px] font-semibold text-primary">
            Tailored for {job.company}
          </span>
        </div>

        <div className="mt-5">
          <p className="mb-1.5 text-[11px] font-bold uppercase tracking-wide text-black/40">Summary</p>
          <p className="text-sm leading-relaxed text-black/80">
            {profile.experienceYears}+ years in {profile.industry.toLowerCase()}, specializing in{" "}
            {sortedSkills.slice(0, 3).map((s) => s.name).join(", ")}. Strong fit for {job.title} at {job.company} —{" "}
            {job.matchPercentage}% match on this role&apos;s requirements.
          </p>
        </div>

        <div className="mt-5">
          <p className="mb-2 text-[11px] font-bold uppercase tracking-wide text-black/40">
            Skills <span className="normal-case text-black/30">— reordered to lead with what this role needs</span>
          </p>
          <div className="flex flex-wrap gap-1.5">
            {sortedSkills.map((s) => {
              const matched = jobSkillsLower.has(s.name.toLowerCase());
              return (
                <span
                  key={s.name}
                  className={cn(
                    "rounded-md px-2.5 py-1 text-xs font-medium",
                    matched ? "bg-primary/15 text-primary" : "bg-black/[0.04] text-black/60",
                  )}
                >
                  {s.name}
                  {s.verified && <ShieldCheck className="ml-1 inline size-3 text-emerald-600" />}
                </span>
              );
            })}
          </div>
          <p className="mt-2 text-[11px] text-black/40">
            {matchedCount} of {sortedSkills.length} skills highlighted for this role.
          </p>
        </div>

        <div className="mt-5">
          <p className="mb-1.5 text-[11px] font-bold uppercase tracking-wide text-black/40">Experience</p>
          <p className="text-sm leading-relaxed text-black/80">
            {profile.experienceYears} years as a {profile.title} in {profile.industry}. Open to{" "}
            {profile.openTo.join(", ") || "new opportunities"}.
          </p>
        </div>
      </div>

      <div className="mt-3 flex justify-end">
        <DownloadPdfButton />
      </div>
    </div>
  );
}
