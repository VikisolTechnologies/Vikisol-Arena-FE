import { ShieldCheck } from "lucide-react";
import type { CandidateProfile, Job } from "@/lib/types";
import { cn } from "@/lib/utils";

/** Doc-style rendering of the resume the agent tailored for this specific role — skills that
 *  matched the job are visually highlighted and pulled to the front, a lightweight stand-in
 *  for a real diff against the base profile order. */
export function TailoredResume({ profile, job }: { profile: CandidateProfile; job: Job }) {
  const jobSkillsLower = new Set(job.skills.map((s) => s.toLowerCase()));
  const sortedSkills = [...profile.skills].sort((a, b) => {
    const aMatch = jobSkillsLower.has(a.name.toLowerCase());
    const bMatch = jobSkillsLower.has(b.name.toLowerCase());
    return aMatch === bMatch ? 0 : aMatch ? -1 : 1;
  });
  const matchedCount = sortedSkills.filter((s) => jobSkillsLower.has(s.name.toLowerCase())).length;

  return (
    <div className="rounded-[24px] border border-border bg-white p-8 text-[#1a1a1a] shadow-[0_20px_60px_rgba(0,0,0,0.5)]">
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
  );
}
