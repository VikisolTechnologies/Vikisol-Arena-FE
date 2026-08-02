"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Pencil, Eye, ShieldCheck, Briefcase, GraduationCap, X } from "lucide-react";
import { CandidateAppShell } from "@/components/app/CandidateAppShell";
import { ForceGraph } from "@/components/identity/ForceGraph";
import { SkillPicker } from "@/components/onboarding/SkillPicker";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getMyProfile, updateMySkills } from "@/lib/api/profile";
import { getSession, isOnboarded } from "@/lib/session";
import type { CandidateProfile } from "@/lib/types";

export default function IdentityPage() {
  const router = useRouter();
  const [profile, setProfile] = useState<CandidateProfile | null>(null);
  const [mode, setMode] = useState<"public" | "edit">("public");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [draftSkills, setDraftSkills] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!getSession()) { router.replace("/auth"); return; }
    if (!isOnboarded()) { router.replace("/onboarding"); return; }
    getMyProfile().then((p) => {
      setProfile(p);
      setDraftSkills(p.skills.map((s) => s.name));
      setSelectedId("me");
    });
  }, [router]);

  if (!profile) {
    return (
      <CandidateAppShell title="Identity">
        <div className="h-96 animate-pulse rounded-2xl bg-white/5" />
      </CandidateAppShell>
    );
  }

  const nodes = [
    { id: "me", label: profile.name, type: "center" as const },
    ...profile.skills.map((s) => ({ id: s.name, label: s.name, type: "skill" as const, verified: s.verified })),
    { id: "__exp", label: `${profile.experienceYears} yrs exp`, type: "meta" as const },
    { id: "__ind", label: profile.industry, type: "meta" as const },
  ];

  const selectedSkill = profile.skills.find((s) => s.name === selectedId);
  const selectedIsMeta = selectedId === "__exp" || selectedId === "__ind";

  const saveSkills = async () => {
    setSaving(true);
    const updated = await updateMySkills(draftSkills);
    setProfile(updated);
    setSaving(false);
    setMode("public");
  };

  return (
    <CandidateAppShell profile={profile}>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Avatar className="size-12">
            <AvatarFallback className="bg-primary/15 text-lg text-primary-soft">{profile.name.slice(0, 1)}</AvatarFallback>
          </Avatar>
          <div>
            <h1 className="font-display text-xl font-bold tracking-tight">{profile.name}</h1>
            <p className="text-sm text-muted-foreground">{profile.title} · {profile.location}</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button
            variant={mode === "public" ? "primary-gradient" : "ghost-glass"}
            size="sm"
            className="gap-1.5"
            onClick={() => setMode("public")}
          >
            <Eye className="size-3.5" /> Preview
          </Button>
          <Button
            variant={mode === "edit" ? "primary-gradient" : "ghost-glass"}
            size="sm"
            className="gap-1.5"
            onClick={() => setMode("edit")}
          >
            <Pencil className="size-3.5" /> Edit
          </Button>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
        <div className="rounded-[24px] border border-border bg-white/[0.03] p-4">
          <ForceGraph nodes={nodes} selectedId={selectedId} onSelect={setSelectedId} />
          <p className="mt-2 text-center text-xs text-muted-foreground">Drag a node to reposition it, or click to focus and zoom</p>
        </div>

        <div className="space-y-4">
          <div className="rounded-[24px] border border-border bg-white/[0.03] p-5">
            {selectedId === "me" && (
              <>
                <p className="font-display text-sm font-bold">{profile.name}</p>
                <p className="mt-1 text-xs text-muted-foreground">{profile.bio}</p>
                <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                  <div className="flex items-center gap-1.5 rounded-lg border border-border bg-white/[0.02] px-2.5 py-2">
                    <Briefcase className="size-3.5 text-primary-soft" /> {profile.experienceYears} yrs
                  </div>
                  <div className="flex items-center gap-1.5 rounded-lg border border-border bg-white/[0.02] px-2.5 py-2">
                    <GraduationCap className="size-3.5 text-primary-soft" /> {profile.industry}
                  </div>
                </div>
              </>
            )}
            {selectedSkill && (
              <>
                <div className="flex items-center gap-2">
                  <p className="font-display text-sm font-bold">{selectedSkill.name}</p>
                  {selectedSkill.verified && <ShieldCheck className="size-4 text-emerald-400" />}
                </div>
                <Badge variant="secondary" className={`mt-2 ${selectedSkill.verified ? "bg-emerald-500/15 text-emerald-400" : "bg-white/5 text-muted-foreground"}`}>
                  {selectedSkill.verified ? "Verified via Challenges" : "Not yet verified"}
                </Badge>
                {mode === "edit" && (
                  <Button
                    variant="ghost-glass"
                    size="sm"
                    className="mt-3 w-full gap-1.5"
                    onClick={() => setDraftSkills((prev) => prev.filter((s) => s !== selectedSkill.name))}
                  >
                    <X className="size-3.5" /> Remove skill
                  </Button>
                )}
              </>
            )}
            {selectedIsMeta && (
              <p className="text-sm text-muted-foreground">
                {selectedId === "__exp" ? `${profile.experienceYears} years of professional experience.` : `Working in ${profile.industry}.`}
              </p>
            )}
            {!selectedId && <p className="text-sm text-muted-foreground">Select a node to see details.</p>}
          </div>

          {mode === "edit" && (
            <div className="rounded-[24px] border border-border bg-white/[0.03] p-5">
              <p className="mb-3 font-display text-sm font-bold">Edit skills</p>
              <SkillPicker selected={draftSkills} onChange={setDraftSkills} />
              <Button variant="primary-gradient" size="sm" className="mt-3 w-full" disabled={saving} onClick={saveSkills}>
                {saving ? "Saving…" : "Save changes"}
              </Button>
            </div>
          )}
        </div>
      </div>
    </CandidateAppShell>
  );
}
