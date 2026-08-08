"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { SlidersHorizontal, X, MessageCircleQuestion, Check, RotateCcw } from "lucide-react";
import { CandidateAppShell } from "@/components/app/CandidateAppShell";
import { OrbLoader } from "@/components/ui/orb-loader";
import { SwipeCard, type SwipeCardHandle, type SwipeDirection } from "@/components/discovery/SwipeCard";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Slider } from "@/components/ui/slider";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter, SheetTrigger,
} from "@/components/ui/sheet";
import { getMyProfile } from "@/lib/api/profile";
import { getJobs, getPassedJobIds, passOnJob } from "@/lib/api/jobs";
import { applyToJob } from "@/lib/api/applications";
import { agentRealtime } from "@/lib/realtime";
import { requireOnboarded } from "@/lib/auth-guard";
import { EmptyState } from "@/components/ui/empty-state";
import type { CandidateProfile, Job, Industry } from "@/lib/types";

const INDUSTRIES: Industry[] = ["Engineering", "Design", "Sales", "Healthcare", "Logistics"];

export default function DiscoverPage() {
  const router = useRouter();
  const [profile, setProfile] = useState<CandidateProfile | null>(null);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [passed, setPassed] = useState<string[]>([]);
  const [cursor, setCursor] = useState(0);
  const [lastAction, setLastAction] = useState<{ job: Job; direction: SwipeDirection } | null>(null);

  const [industries, setIndustries] = useState<Industry[]>(INDUSTRIES);
  const [remoteOnly, setRemoteOnly] = useState(false);
  const [minMatch, setMinMatch] = useState(0);
  const idCounter = useRef(0);
  const nextId = (prefix: string) => `${prefix}-${++idCounter.current}`;

  const cardRef = useRef<SwipeCardHandle>(null);

  useEffect(() => {
    if (!requireOnboarded(router)) return;
    getMyProfile().then(setProfile);
    getJobs().then((j) => {
      setJobs(j);
      setPassed(getPassedJobIds());
    });
  }, [router]);

  const queue = useMemo(() => {
    return jobs.filter(
      (j) =>
        !passed.includes(j.id) &&
        industries.includes(j.industry) &&
        (!remoteOnly || j.remote) &&
        j.matchPercentage >= minMatch,
    );
  }, [jobs, passed, industries, remoteOnly, minMatch]);

  const visible = queue.slice(cursor, cursor + 3);
  const current = visible[0];

  const handleResolved = (job: Job, direction: SwipeDirection) => {
    setLastAction({ job, direction });
    if (direction === "right") {
      applyToJob(job.id);
      agentRealtime.emit({
        id: nextId("evt"),
        type: "applied",
        title: `Applied to ${job.title} at ${job.company}`,
        description: `${job.matchPercentage}% match — swiped right in Discover.`,
        timestamp: new Date().toISOString(),
        relatedJobId: job.id,
        undoable: true,
      });
    } else if (direction === "left") {
      passOnJob(job.id);
      setPassed((p) => [...p, job.id]);
    } else if (direction === "up") {
      router.push(`/agent?about=${job.id}`);
      return;
    }
    setCursor((c) => c + 1);
  };

  const toggleIndustry = (ind: Industry) =>
    setIndustries((prev) => (prev.includes(ind) ? prev.filter((i) => i !== ind) : [...prev, ind]));

  if (!profile) {
    return (
      <CandidateAppShell title="Discover">
        <OrbLoader className="h-96" />
      </CandidateAppShell>
    );
  }

  return (
    <CandidateAppShell
      title="Discover"
      profile={profile}
      actions={
        <Sheet>
          <SheetTrigger render={<Button variant="ghost-glass" size="sm" className="gap-1.5" />}>
            <SlidersHorizontal className="size-3.5" /> Filters
          </SheetTrigger>
          <SheetContent side="right" className="border-border">
            <SheetHeader>
              <SheetTitle>Filters</SheetTitle>
              <SheetDescription>Narrow down what your agent shows you.</SheetDescription>
            </SheetHeader>
            <div className="flex-1 space-y-5 overflow-y-auto px-4">
              <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Industry</p>
                <div className="space-y-2">
                  {INDUSTRIES.map((ind) => (
                    <label key={ind} className="flex items-center gap-2.5 text-sm">
                      <Checkbox checked={industries.includes(ind)} onCheckedChange={() => toggleIndustry(ind)} />
                      {ind}
                    </label>
                  ))}
                </div>
              </div>
              <label className="flex items-center gap-2.5 text-sm">
                <Checkbox checked={remoteOnly} onCheckedChange={(v) => setRemoteOnly(v === true)} />
                Remote only
              </label>
              <div>
                <p className="mb-2 flex items-center justify-between text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Minimum match <span className="normal-case text-foreground">{minMatch}%</span>
                </p>
                <Slider value={minMatch} onValueChange={(v) => setMinMatch(v as number)} min={0} max={95} step={5} />
              </div>
            </div>
            <SheetFooter>
              <Button
                variant="ghost-glass"
                size="sm"
                onClick={() => { setIndustries(INDUSTRIES); setRemoteOnly(false); setMinMatch(0); setCursor(0); }}
              >
                Reset filters
              </Button>
            </SheetFooter>
          </SheetContent>
        </Sheet>
      }
    >
      <div className="mx-auto flex max-w-md flex-col items-center">
        <div className="relative h-[440px] w-full">
          {visible.length === 0 ? (
            <EmptyState
              title="You're all caught up"
              description="Check back later, or reset your filters."
              className="flex h-full flex-col items-center justify-center rounded-[24px] border-border px-0 py-0"
            />
          ) : (
            visible.map((job, i) =>
              i === 0 ? (
                <SwipeCard key={job.id} ref={cardRef} job={job} isTop stackDepth={0} onResolved={(dir) => handleResolved(job, dir)} />
              ) : (
                <SwipeCard key={job.id} job={job} isTop={false} stackDepth={i} onResolved={() => {}} />
              ),
            )
          )}
        </div>

        {current && (
          <div className="mt-6 flex items-center gap-4">
            <Button variant="ghost-glass" size="icon-lg" className="size-14 rounded-full" aria-label="Pass" onClick={() => cardRef.current?.swipe("left")}>
              <X className="size-5" />
            </Button>
            <Button variant="ghost-glass" size="icon-lg" className="size-12 rounded-full" aria-label="Tell me more" onClick={() => cardRef.current?.swipe("up")}>
              <MessageCircleQuestion className="size-4" />
            </Button>
            <Button variant="primary-gradient" size="icon-lg" className="size-14 rounded-full" aria-label="Apply" onClick={() => cardRef.current?.swipe("right")}>
              <Check className="size-5" />
            </Button>
          </div>
        )}

        {lastAction && (
          <div className="mt-4 flex items-center gap-2 rounded-full border border-border bg-white/[0.03] px-4 py-2 text-xs text-muted-foreground">
            {lastAction.direction === "right" && `Applied to ${lastAction.job.title} ✓`}
            {lastAction.direction === "left" && `Passed on ${lastAction.job.title}`}
            {lastAction.direction === "right" && (
              <button
                type="button"
                className="ml-1 flex items-center gap-1 text-primary-soft hover:underline"
                onClick={() => setCursor((c) => Math.max(0, c - 1))}
              >
                <RotateCcw className="size-3" /> Undo
              </button>
            )}
          </div>
        )}
      </div>
    </CandidateAppShell>
  );
}
