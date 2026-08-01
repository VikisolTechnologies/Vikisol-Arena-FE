"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Sparkles, Users, MapPin } from "lucide-react";
import { EnterpriseAppShell } from "@/components/app/EnterpriseAppShell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { getMyEnterpriseProfile, getMyPostings, createPosting, setPostingStatus } from "@/lib/api/enterprise";
import { SKILLS_BY_INDUSTRY } from "@/lib/mock/seed";
import { getSession, isEnterpriseOnboarded } from "@/lib/session";
import { cn } from "@/lib/utils";
import type { EnterpriseProfile, JobPosting } from "@/lib/types";

export default function PostingsPage() {
  const router = useRouter();
  const [profile, setProfile] = useState<EnterpriseProfile | null>(null);
  const [postings, setPostings] = useState<JobPosting[]>([]);
  const [creating, setCreating] = useState(false);
  const [oneLiner, setOneLiner] = useState("");
  const [drafted, setDrafted] = useState<Omit<JobPosting, "id" | "status" | "createdAt"> | null>(null);
  const [drafting, setDrafting] = useState(false);

  const load = () => getMyPostings().then(setPostings);

  useEffect(() => {
    if (!getSession()) { router.replace("/auth"); return; }
    if (!isEnterpriseOnboarded()) { router.replace("/enterprise/onboarding"); return; }
    getMyEnterpriseProfile().then(setProfile);
    load();
  }, [router]);

  const draftPosting = () => {
    if (!oneLiner.trim() || !profile) return;
    setDrafting(true);
    setTimeout(() => {
      const allSkills = Object.values(SKILLS_BY_INDUSTRY).flat();
      const picked = allSkills.filter((s) => oneLiner.toLowerCase().includes(s.toLowerCase()));
      setDrafted({
        title: oneLiner.length > 60 ? oneLiner.slice(0, 57) + "…" : oneLiner,
        industry: profile.industry,
        location: "Bengaluru",
        remote: true,
        employmentType: "Full Time",
        salaryMin: 12,
        salaryMax: 24,
        skills: picked.length ? picked : SKILLS_BY_INDUSTRY[profile.industry].slice(0, 3),
        description: `${oneLiner}. Join ${profile.companyName} and work on real, shipped product.`,
      });
      setDrafting(false);
    }, 900);
  };

  const publish = async () => {
    if (!drafted) return;
    await createPosting(drafted);
    setCreating(false);
    setOneLiner("");
    setDrafted(null);
    load();
  };

  const toggleStatus = async (p: JobPosting) => {
    await setPostingStatus(p.id, p.status === "open" ? "paused" : "open");
    load();
  };

  if (!profile) {
    return (
      <EnterpriseAppShell title="Postings">
        <div className="h-96 animate-pulse rounded-2xl bg-white/5" />
      </EnterpriseAppShell>
    );
  }

  return (
    <EnterpriseAppShell
      title="Postings"
      profile={profile}
      actions={<Button variant="primary-gradient" size="sm" className="gap-1.5" onClick={() => setCreating(true)}><Plus className="size-3.5" /> New posting</Button>}
    >
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {postings.map((p) => (
          <div key={p.id} className="rounded-[24px] border border-border bg-white/[0.03] p-5">
            <div className="flex items-start justify-between gap-2">
              <p className="font-display text-sm font-bold leading-snug">{p.title}</p>
              <Badge variant="secondary" className={cn("shrink-0 capitalize", p.status === "open" ? "bg-emerald-500/15 text-emerald-400" : "bg-white/5 text-muted-foreground")}>
                {p.status}
              </Badge>
            </div>
            <p className="mt-2 flex items-center gap-1 text-xs text-muted-foreground"><MapPin className="size-3" /> {p.location}{p.remote && " · Remote"}</p>
            <div className="mt-3 flex flex-wrap gap-1.5">
              {p.skills.slice(0, 3).map((s) => <Badge key={s} variant="secondary" className="bg-white/5 text-[11px] text-muted-foreground">{s}</Badge>)}
            </div>
            <div className="mt-4 flex gap-2">
              <Button variant="ghost-glass" size="sm" className="flex-1 gap-1.5" onClick={() => router.push(`/enterprise/postings/${p.id}`)}>
                <Users className="size-3.5" /> Applicants
              </Button>
              <Button variant="ghost-glass" size="sm" onClick={() => toggleStatus(p)}>
                {p.status === "open" ? "Pause" : "Reopen"}
              </Button>
            </div>
          </div>
        ))}
        {postings.length === 0 && (
          <div className="col-span-full rounded-2xl border border-dashed border-border-strong px-6 py-12 text-center text-sm text-muted-foreground">
            No postings yet — create your first one.
          </div>
        )}
      </div>

      <Dialog open={creating} onOpenChange={setCreating}>
        <DialogContent className="border-border bg-popover sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>New posting</DialogTitle>
            <DialogDescription>One line is enough — your agent drafts the rest.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="flex gap-2">
              <Input value={oneLiner} onChange={(e) => setOneLiner(e.target.value)} placeholder="e.g. Senior backend engineer for our payments team" className="border-border bg-white/[0.03]" />
              <Button variant="primary-gradient" size="sm" disabled={drafting} onClick={draftPosting} className="shrink-0 gap-1.5">
                <Sparkles className="size-3.5" /> {drafting ? "Drafting…" : "Draft"}
              </Button>
            </div>
            {drafted && (
              <div className="space-y-3 rounded-2xl border border-border bg-white/[0.02] p-4">
                <Input value={drafted.title} onChange={(e) => setDrafted({ ...drafted, title: e.target.value })} className="border-border bg-white/[0.03]" />
                <Textarea value={drafted.description} onChange={(e) => setDrafted({ ...drafted, description: e.target.value })} rows={3} className="border-border bg-white/[0.03]" />
                <div className="flex flex-wrap gap-1.5">
                  {drafted.skills.map((s) => <Badge key={s} variant="secondary" className="bg-primary/10 text-primary-soft">{s}</Badge>)}
                </div>
                <p className="text-xs text-muted-foreground">₹{drafted.salaryMin}–{drafted.salaryMax} LPA · {drafted.location} · {drafted.employmentType}</p>
                <Button variant="primary-gradient" size="sm" className="w-full" onClick={publish}>Publish posting</Button>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </EnterpriseAppShell>
  );
}
