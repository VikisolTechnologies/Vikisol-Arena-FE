"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Clock3, Plus, Users } from "lucide-react";
import { AppShell } from "@/components/app/AppShell";
import { OrbLoader } from "@/components/ui/orb-loader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { getMyProfile } from "@/lib/api/profile";
import { getProjects } from "@/lib/api/market";
import { getMyProjects, createMyProject } from "@/lib/api/myProjects";
import { requireOnboarded } from "@/lib/auth-guard";
import { formatINRRange } from "@/lib/format";
import type { CandidateProfile, Project } from "@/lib/types";

const EMPTY_DRAFT = { title: "", description: "", budgetMin: "", budgetMax: "", durationWeeks: "", skills: "" };

function hoursLeft(endsAt: string) {
  return Math.max(0, Math.round((new Date(endsAt).getTime() - Date.now()) / 3600000));
}

export default function MarketplacePage() {
  const router = useRouter();
  const [profile, setProfile] = useState<CandidateProfile | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [posting, setPosting] = useState(false);
  const [draft, setDraft] = useState(EMPTY_DRAFT);
  const [publishing, setPublishing] = useState(false);

  const load = () => {
    Promise.all([getProjects(), getMyProjects()]).then(([all, mine]) => {
      // Real mode's /marketplace/projects already includes the caller's own postings, so `all`
      // and `mine` overlap there (mock mode's MOCK_PROJECTS never does) - dedupe by id, keeping
      // the "mine" copy since it carries the flag the "Mine" badge renders off of.
      const mineIds = new Set(mine.map((p) => p.id));
      setProjects([...mine, ...all.filter((p) => !mineIds.has(p.id))]);
    });
  };

  useEffect(() => {
    if (!requireOnboarded(router)) return;
    getMyProfile().then(setProfile);
    load();
  }, [router]);

  // Was "type one line, an agent drafts the full brief" — but nothing drafted it: a fixed
  // ₹1.5–4L/6-week budget got returned for every input, with only the skill chips varying by
  // keyword match. No AI or backend call was ever involved. Until a real drafting assist exists,
  // asking for the real brief up front is the honest version of this feature.
  const canPublish = draft.title.trim() && draft.description.trim()
    && Number(draft.budgetMin) > 0 && Number(draft.budgetMax) >= Number(draft.budgetMin)
    && Number(draft.durationWeeks) > 0;

  const publish = async () => {
    if (!canPublish) return;
    setPublishing(true);
    try {
      await createMyProject({
        title: draft.title.trim(),
        description: draft.description.trim(),
        budgetMin: Number(draft.budgetMin),
        budgetMax: Number(draft.budgetMax),
        durationWeeks: Number(draft.durationWeeks),
        skills: draft.skills.split(",").map((s) => s.trim()).filter(Boolean),
      });
      setPosting(false);
      setDraft(EMPTY_DRAFT);
      load();
    } finally {
      setPublishing(false);
    }
  };

  if (!profile) {
    return (
      <AppShell title="Marketplace">
        <OrbLoader className="h-96" />
      </AppShell>
    );
  }

  return (
    <AppShell
      title="Marketplace"
      profile={profile}
      actions={
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => router.push("/marketplace/bids")}>
            My bids
          </Button>
          <Button variant="default" size="sm" className="gap-1.5" onClick={() => setPosting(true)}>
            <Plus className="size-3.5" /> Post a project
          </Button>
        </div>
      }
    >
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {projects.map((p) => (
          <button
            key={p.id}
            type="button"
            onClick={() => router.push(`/marketplace/${p.id}`)}
            className="overflow-hidden rounded-[24px] border border-border bg-card text-left transition-transform hover:-translate-y-0.5"
          >
            {/* R2 - project thumbnail; seeded placeholder until media upload (Step 4) exists. */}
            {/* eslint-disable-next-line @next/next/no-img-element -- seeded placeholder, see PersonAvatar */}
            <img
              src={`https://picsum.photos/seed/${encodeURIComponent(p.id)}/480/220`}
              alt=""
              className="h-28 w-full object-cover"
              loading="lazy"
            />
            <div className="p-5">
            <div className="flex items-start justify-between gap-2">
              <p className="font-display text-sm font-bold leading-snug">{p.title}</p>
              {"mine" in p && <Badge variant="secondary" className="shrink-0 bg-primary/12 text-primary-soft">Mine</Badge>}
            </div>
            <p className="mt-2 line-clamp-2 text-xs text-muted-foreground">{p.description}</p>
            <div className="mt-3 flex flex-wrap gap-1.5">
              {p.skills.slice(0, 3).map((s) => (
                <Badge key={s} variant="secondary" className="bg-secondary text-[11px] text-muted-foreground">{s}</Badge>
              ))}
            </div>
            <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
              <span>{formatINRRange(p.budgetMin, p.budgetMax)}</span>
              <span className="flex items-center gap-1"><Users className="size-3" /> {p.bids.length}</span>
              <span className="flex items-center gap-1"><Clock3 className="size-3" /> {hoursLeft(p.endsAt)}h</span>
            </div>
            </div>
          </button>
        ))}
      </div>

      <Dialog open={posting} onOpenChange={(open) => { setPosting(open); if (!open) setDraft(EMPTY_DRAFT); }}>
        <DialogContent className="border-border bg-popover sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Post a project</DialogTitle>
            <DialogDescription>Describe what you need — bids start coming in once it&apos;s live.</DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            <div className="space-y-1">
              <label className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Title</label>
              <Input
                value={draft.title}
                onChange={(e) => setDraft({ ...draft, title: e.target.value })}
                placeholder="e.g. React dashboard for inventory tracking"
                className="border-border bg-card"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Brief</label>
              <Textarea
                value={draft.description}
                onChange={(e) => setDraft({ ...draft, description: e.target.value })}
                placeholder="What needs building, and what does done look like?"
                className="border-border bg-card"
                rows={3}
              />
            </div>
            <div className="space-y-1">
              <label className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Skills (comma-separated)</label>
              <Input
                value={draft.skills}
                onChange={(e) => setDraft({ ...draft, skills: e.target.value })}
                placeholder="React, Node.js"
                className="border-border bg-card"
              />
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div className="space-y-1">
                <label className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Budget min ₹</label>
                <Input type="number" min={0} value={draft.budgetMin} onChange={(e) => setDraft({ ...draft, budgetMin: e.target.value })} className="border-border bg-card" />
              </div>
              <div className="space-y-1">
                <label className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Budget max ₹</label>
                <Input type="number" min={0} value={draft.budgetMax} onChange={(e) => setDraft({ ...draft, budgetMax: e.target.value })} className="border-border bg-card" />
              </div>
              <div className="space-y-1">
                <label className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Weeks</label>
                <Input type="number" min={0} value={draft.durationWeeks} onChange={(e) => setDraft({ ...draft, durationWeeks: e.target.value })} className="border-border bg-card" />
              </div>
            </div>
            <Button variant="default" size="sm" className="w-full" disabled={!canPublish || publishing} onClick={publish}>
              {publishing ? "Publishing…" : "Publish project"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}
