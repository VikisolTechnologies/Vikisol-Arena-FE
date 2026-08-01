"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Clock3, Plus, Sparkles, Users } from "lucide-react";
import { CandidateAppShell } from "@/components/app/CandidateAppShell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { getMyProfile } from "@/lib/api/profile";
import { getProjects } from "@/lib/api/market";
import { getMyProjects, createMyProject } from "@/lib/api/myProjects";
import { SKILLS_BY_INDUSTRY } from "@/lib/mock/seed";
import { getSession, isOnboarded } from "@/lib/session";
import type { CandidateProfile, Project } from "@/lib/types";

function hoursLeft(endsAt: string) {
  return Math.max(0, Math.round((new Date(endsAt).getTime() - Date.now()) / 3600000));
}

export default function MarketplacePage() {
  const router = useRouter();
  const [profile, setProfile] = useState<CandidateProfile | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [posting, setPosting] = useState(false);
  const [oneLiner, setOneLiner] = useState("");
  const [drafted, setDrafted] = useState<{ title: string; description: string; budgetMin: number; budgetMax: number; durationWeeks: number; skills: string[] } | null>(null);
  const [drafting, setDrafting] = useState(false);

  const load = () => {
    Promise.all([getProjects(), getMyProjects()]).then(([mock, mine]) => setProjects([...mine, ...mock]));
  };

  useEffect(() => {
    if (!getSession()) { router.replace("/auth"); return; }
    if (!isOnboarded()) { router.replace("/onboarding"); return; }
    getMyProfile().then(setProfile);
    load();
  }, [router]);

  const draftBrief = () => {
    if (!oneLiner.trim()) return;
    setDrafting(true);
    setTimeout(() => {
      const allSkills = Object.values(SKILLS_BY_INDUSTRY).flat();
      const picked = allSkills.filter((s) => oneLiner.toLowerCase().includes(s.toLowerCase()));
      setDrafted({
        title: oneLiner.length > 60 ? oneLiner.slice(0, 57) + "…" : oneLiner,
        description: `${oneLiner}. Looking for a proven professional to scope, build, and ship this — async-friendly, weekly check-ins.`,
        budgetMin: 150000,
        budgetMax: 400000,
        durationWeeks: 6,
        skills: picked.length ? picked : ["React", "Node.js"],
      });
      setDrafting(false);
    }, 900);
  };

  const publish = () => {
    if (!drafted) return;
    createMyProject(drafted);
    setPosting(false);
    setOneLiner("");
    setDrafted(null);
    load();
  };

  if (!profile) {
    return (
      <CandidateAppShell title="Marketplace">
        <div className="h-96 animate-pulse rounded-2xl bg-white/5" />
      </CandidateAppShell>
    );
  }

  return (
    <CandidateAppShell
      title="Marketplace"
      profile={profile}
      actions={
        <div className="flex gap-2">
          <Button variant="ghost-glass" size="sm" onClick={() => router.push("/marketplace/bids")}>
            My bids
          </Button>
          <Button variant="primary-gradient" size="sm" className="gap-1.5" onClick={() => setPosting(true)}>
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
            className="rounded-[24px] border border-border bg-white/[0.03] p-5 text-left transition-transform hover:-translate-y-0.5"
          >
            <div className="flex items-start justify-between gap-2">
              <p className="font-display text-sm font-bold leading-snug">{p.title}</p>
              {"mine" in p && <Badge variant="secondary" className="shrink-0 bg-primary/12 text-primary-soft">Mine</Badge>}
            </div>
            <p className="mt-2 line-clamp-2 text-xs text-muted-foreground">{p.description}</p>
            <div className="mt-3 flex flex-wrap gap-1.5">
              {p.skills.slice(0, 3).map((s) => (
                <Badge key={s} variant="secondary" className="bg-white/5 text-[11px] text-muted-foreground">{s}</Badge>
              ))}
            </div>
            <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
              <span>₹{p.budgetMin.toLocaleString("en-IN")}–₹{p.budgetMax.toLocaleString("en-IN")}</span>
              <span className="flex items-center gap-1"><Users className="size-3" /> {p.bids.length}</span>
              <span className="flex items-center gap-1"><Clock3 className="size-3" /> {hoursLeft(p.endsAt)}h</span>
            </div>
          </button>
        ))}
      </div>

      <Dialog open={posting} onOpenChange={setPosting}>
        <DialogContent className="border-border bg-popover sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Post a project</DialogTitle>
            <DialogDescription>Describe it in one line — your agent drafts the full brief.</DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            <div className="flex gap-2">
              <Input
                value={oneLiner}
                onChange={(e) => setOneLiner(e.target.value)}
                placeholder="e.g. Need a React dashboard for inventory tracking"
                className="border-border bg-white/[0.03]"
              />
              <Button variant="primary-gradient" size="sm" disabled={drafting} onClick={draftBrief} className="shrink-0 gap-1.5">
                <Sparkles className="size-3.5" /> {drafting ? "Drafting…" : "Draft"}
              </Button>
            </div>

            {drafted && (
              <div className="space-y-3 rounded-2xl border border-border bg-white/[0.02] p-4">
                <div className="space-y-1">
                  <label className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Title</label>
                  <Input value={drafted.title} onChange={(e) => setDrafted({ ...drafted, title: e.target.value })} className="border-border bg-white/[0.03]" />
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Brief</label>
                  <Textarea value={drafted.description} onChange={(e) => setDrafted({ ...drafted, description: e.target.value })} className="border-border bg-white/[0.03]" rows={3} />
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {drafted.skills.map((s) => <Badge key={s} variant="secondary" className="bg-primary/10 text-primary-soft">{s}</Badge>)}
                </div>
                <p className="text-xs text-muted-foreground">
                  ₹{drafted.budgetMin.toLocaleString("en-IN")}–₹{drafted.budgetMax.toLocaleString("en-IN")} · {drafted.durationWeeks} weeks
                </p>
                <Button variant="primary-gradient" size="sm" className="w-full" onClick={publish}>
                  Publish project
                </Button>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </CandidateAppShell>
  );
}
