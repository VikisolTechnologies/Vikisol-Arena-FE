"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { m } from "motion/react";
import { ArrowLeft, Bookmark, Briefcase, IndianRupee, Lock, MapPin, MessageCircle, ShieldCheck, Unlock } from "lucide-react";
import { cn } from "@/lib/utils";
import { press, rise, spring } from "@/lib/motion";
import { EnterpriseAppShell } from "@/components/app/EnterpriseAppShell";
import { Avatar } from "@/components/bplus/Avatar";
import { Button } from "@/components/bplus/Button";
import { Skeleton, StateCard } from "@/components/bplus/Primitives";
import { DashButton, Panel } from "@/components/dash/Parts";
import { getCandidateDetail, getMyEnterpriseProfile, hasDirectlyApplied, unlockCandidate } from "@/lib/api/enterprise";
import { getShortlistIds, toggleShortlist } from "@/lib/api/shortlist";
import { ApiError } from "@/lib/api/httpClient";
import { requireEnterpriseOnboarded } from "@/lib/auth-guard";
import type { CandidateProfile, EnterpriseProfile } from "@/lib/types";

/** Arena for Business — a talent profile (no board — designed in B+). Unlock logic unchanged:
 *  waits for the server, re-reads candidate + credits, shows the server's error. Career health
 *  (an internal score) is no longer shown to companies. */
export default function TalentProfilePage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [profile, setProfile] = useState<EnterpriseProfile | null>(null);
  const [c, setC] = useState<(CandidateProfile & { fullAccess: boolean }) | null | undefined>(undefined);
  const [freeUnlock, setFreeUnlock] = useState(false);
  const [unlocking, setUnlocking] = useState(false);
  const [unlockError, setUnlockError] = useState("");
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!requireEnterpriseOnboarded(router)) return;
    getMyEnterpriseProfile().then(setProfile).catch(() => {});
    getCandidateDetail(id)
      .then(async (x) => {
        setC(x ?? null);
        setFreeUnlock(await hasDirectlyApplied(id));
        setSaved((await getShortlistIds()).includes(id));
      })
      .catch(() => setC(null));
  }, [id, router]);

  const shell = (children: React.ReactNode) => <EnterpriseAppShell profile={profile}>{children}</EnterpriseAppShell>;
  if (c === undefined) return shell(<div className="space-y-4"><Skeleton className="h-28" /><Skeleton className="h-48" /></div>);
  if (c === null) return shell(<StateCard kind="empty" title="This person isn't visible" detail="They may have turned off visibility to companies." action={<DashButton href="/enterprise/talent">Back to Talent</DashButton>} />);

  const credits = profile ? profile.unlockCreditsTotal - profile.unlockCreditsUsed : 0;
  const unlock = async () => {
    setUnlocking(true);
    setUnlockError("");
    try {
      await unlockCandidate(c.id);
      const [fresh, freshProfile] = await Promise.all([getCandidateDetail(c.id), getMyEnterpriseProfile()]);
      if (fresh) setC(fresh);
      if (freshProfile) setProfile(freshProfile);
    } catch (err) {
      setUnlockError(err instanceof ApiError ? err.message : "Couldn't unlock — nothing was charged. Try again.");
    } finally {
      setUnlocking(false);
    }
  };
  const name = c.fullAccess ? c.name : c.name.split(" ")[0];

  return shell(
    <>
      <button type="button" onClick={() => router.push("/enterprise/talent")} className="mb-3 inline-flex min-h-11 items-center gap-1.5 text-[14px] font-semibold text-faint hover:text-foreground">
        <ArrowLeft className="size-4" aria-hidden /> Talent
      </button>
      <m.div initial="hidden" animate="shown" className="grid gap-5 lg:grid-cols-[1fr_340px]">
        <div className="space-y-5">
          <m.header variants={rise} className="flex items-center gap-4">
            <Avatar name={c.name} className="size-20 text-[24px]" />
            <div className="min-w-0 flex-1">
              <h1 className="font-display-serif text-[30px] font-medium leading-tight">{name}</h1>
              <p className="text-[15px] text-faint">{c.title}</p>
            </div>
            <m.button type="button" whileTap={press} transition={spring.snappy} aria-pressed={saved} aria-label={saved ? "Remove from shortlist" : "Save to shortlist"} onClick={() => toggleShortlist(c.id).then((ids) => setSaved(ids.includes(c.id))).catch(() => {})} className="grid size-11 place-items-center rounded-full border border-field-line hover:bg-foreground/5">
              <Bookmark className={cn("size-5", saved ? "fill-primary text-primary" : "text-faint")} aria-hidden />
            </m.button>
          </m.header>
          <m.div variants={rise} custom={1}>
            <Panel title="What they shared">
              <ul className="space-y-2.5 text-[15px]">
                <li className="flex gap-3"><MapPin className="mt-0.5 size-4.5 shrink-0 text-faint" aria-hidden /> {c.location || c.homeCity || "Area not shared"}{c.remote ? " · open to remote" : ""}</li>
                <li className="flex gap-3"><Briefcase className="mt-0.5 size-4.5 shrink-0 text-faint" aria-hidden /> {c.experienceYears} year{c.experienceYears === 1 ? "" : "s"} of experience</li>
                {c.rateFloor > 0 && <li className="flex gap-3"><IndianRupee className="mt-0.5 size-4.5 shrink-0 text-faint" aria-hidden /> Looking for ₹{c.rateFloor} LPA or more</li>}
              </ul>
              {c.bio && <p className="mt-4 border-t border-line pt-4 text-[15px] leading-relaxed text-foreground/85">{c.bio}</p>}
              <div className="mt-4 flex flex-wrap gap-1.5">
                {c.skills.map((s) => <span key={s.name} className="inline-flex items-center gap-1 rounded-full bg-foreground/8 px-3 py-1 text-[13px]">{s.name}{s.verified && <ShieldCheck className="size-3.5 text-success-on-dark" aria-label="verified" />}</span>)}
              </div>
            </Panel>
          </m.div>
        </div>

        <m.aside variants={rise} custom={2}>
          {c.fullAccess ? (
            <Panel title="Contact">
              <p className="flex items-center gap-2 text-[15px] font-semibold text-success-on-dark"><Unlock className="size-4" aria-hidden /> Unlocked</p>
              {freeUnlock && <p className="mt-2 text-[14px] text-faint">They applied to one of your jobs, so this was free. Credits are only for people you find here.</p>}
              <p className="mt-2 text-[14px] text-faint">{name} hasn&apos;t shared an email or phone through Arena — message them here.</p>
              <div className="mt-4"><DashButton href={`/enterprise/messages?with=${c.id}`}><MessageCircle className="size-4" aria-hidden /> Message</DashButton></div>
            </Panel>
          ) : (
            <section className="rounded-tile bg-paper p-5 text-paper-ink" aria-label="Contact">
              <p className="flex items-center gap-2 text-[17px] font-semibold"><Lock className="size-5 text-primary-on-paper" aria-hidden /> Contact is private</p>
              <p className="mt-2 text-[14px] text-paper-ink-muted">{name} chose to be visible to companies. Their full name and resume open when you unlock — 1 credit. You have {credits} of {profile?.unlockCreditsTotal ?? 0} left.</p>
              {unlockError && <p role="alert" className="mt-3 text-[14px] font-semibold text-danger-on-paper">{unlockError}</p>}
              <Button className="mt-4" loading={unlocking} disabled={credits <= 0} onClick={unlock}>{credits > 0 ? "Unlock contact" : "No credits left"}</Button>
            </section>
          )}
        </m.aside>
      </m.div>
    </>,
  );
}
