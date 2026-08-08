import { ShieldCheck } from "lucide-react";
import type { CandidateProfile } from "@/lib/types";
import { cn } from "@/lib/utils";
import { formatINR } from "@/lib/format";

/** The standardized, canonical Arena CV — profile fields in a fixed order, independent of any
 * specific job. Per-application views (TailoredResume) reorder/highlight against this same
 * base and show a visible diff against it. Pass `printable` to mark it as the one element a
 * "Download PDF" button's window.print() should keep visible (see .arena-print-cv in
 * globals.css). */
export function ArenaCV({ profile, printable }: { profile: CandidateProfile; printable?: boolean }) {
  return (
    <div
      className={cn(
        "rounded-[24px] border border-border bg-white p-8 text-[#1a1a1a] shadow-[0_20px_60px_rgba(0,0,0,0.5)]",
        printable && "arena-print-cv",
      )}
    >
      <div className="flex items-start justify-between border-b border-black/10 pb-4">
        <div>
          <h2 className="font-display text-2xl font-bold tracking-tight">{profile.name}</h2>
          <p className="text-sm text-black/60">
            {profile.title} · {profile.location}
          </p>
        </div>
        <span className="rounded-full bg-black/[0.04] px-3 py-1 text-[11px] font-semibold text-black/50">Standard Arena CV</span>
      </div>

      {profile.bio && (
        <div className="mt-5">
          <p className="mb-1.5 text-[11px] font-bold uppercase tracking-wide text-black/40">Summary</p>
          <p className="text-sm leading-relaxed text-black/80">{profile.bio}</p>
        </div>
      )}

      <div className="mt-5">
        <p className="mb-2 text-[11px] font-bold uppercase tracking-wide text-black/40">Skills</p>
        <div className="flex flex-wrap gap-1.5">
          {profile.skills.map((s) => (
            <span key={s.name} className="rounded-md bg-black/[0.04] px-2.5 py-1 text-xs font-medium text-black/70">
              {s.name}
              {s.verified && <ShieldCheck className="ml-1 inline size-3 text-emerald-600" />}
            </span>
          ))}
        </div>
      </div>

      <div className="mt-5">
        <p className="mb-1.5 text-[11px] font-bold uppercase tracking-wide text-black/40">Experience</p>
        <p className="text-sm leading-relaxed text-black/80">
          {profile.experienceYears} years as a {profile.title} in {profile.industry}. Open to{" "}
          {profile.openTo.join(", ") || "new opportunities"}.
        </p>
      </div>

      <div className="mt-5 grid grid-cols-3 gap-3 border-t border-black/10 pt-4 text-center">
        <div>
          <p className="font-display text-lg font-bold">{profile.experienceYears}</p>
          <p className="text-[11px] text-black/40">Years exp.</p>
        </div>
        <div>
          <p className="font-display text-lg font-bold">{formatINR(profile.rateFloor)}</p>
          <p className="text-[11px] text-black/40">Rate floor</p>
        </div>
        <div>
          <p className="font-display text-lg font-bold">{profile.careerHealth}%</p>
          <p className="text-[11px] text-black/40">Career health</p>
        </div>
      </div>
    </div>
  );
}
