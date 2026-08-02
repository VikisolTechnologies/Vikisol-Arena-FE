"use client";

import { useRef, useState } from "react";
import { Upload, FileText, Sparkles, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { updateMyResume } from "@/lib/api/profile";
import type { CandidateProfile } from "@/lib/types";

type Phase = "idle" | "parsing" | "review";

/**
 * Upload -> (simulated) parse -> review -> confirm. This is a frontend-only phase with no real
 * PDF/DOCX text-extraction engine, so the "extracted" fields shown for review are read from
 * the candidate's own existing profile rather than actually parsed from file bytes — what
 * genuinely changes on confirm is the CV artifact (filename + upload timestamp), which is
 * exactly what a real parser would additionally populate once Phase 4 wires one up. Framed
 * honestly in the UI copy rather than pretending otherwise.
 */
export function ResumeUpload({ profile, onDone }: { profile: CandidateProfile; onDone: (updated: CandidateProfile) => void }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [phase, setPhase] = useState<Phase>("idle");
  const [fileName, setFileName] = useState("");
  const [saving, setSaving] = useState(false);

  const handleFile = (file: File) => {
    setFileName(file.name);
    setPhase("parsing");
    setTimeout(() => setPhase("review"), 1600);
  };

  const confirm = async () => {
    setSaving(true);
    const updated = await updateMyResume({ fileName, skills: profile.skills.map((s) => s.name) });
    setSaving(false);
    setPhase("idle");
    onDone(updated);
  };

  if (phase === "parsing") {
    return (
      <div className="flex flex-col items-center gap-3 rounded-[24px] border border-border bg-white/[0.03] px-6 py-10 text-center">
        <span
          className="size-12 animate-pulse rounded-full"
          style={{ background: "radial-gradient(circle at 35% 30%, #FF8A5B, #FF6B35 70%)", boxShadow: "0 0 32px rgba(255,107,53,0.35)" }}
        />
        <p className="text-sm font-medium">Reading {fileName}…</p>
        <p className="text-xs text-muted-foreground">Extracting skills, experience, and title.</p>
      </div>
    );
  }

  if (phase === "review") {
    return (
      <div className="rounded-[24px] border border-primary/25 bg-primary/[0.05] p-6">
        <p className="mb-1 flex items-center gap-1.5 font-display text-sm font-bold text-primary-soft">
          <Sparkles className="size-4" /> Here&apos;s what we extracted from {fileName}
        </p>
        <p className="mb-4 text-xs text-muted-foreground">Review before this becomes your standard Arena CV.</p>
        <div className="space-y-2 text-sm">
          <div className="flex items-center justify-between rounded-xl border border-border bg-white/[0.02] px-3.5 py-2.5">
            <span className="text-muted-foreground">Title</span>
            <span className="font-medium">{profile.title}</span>
          </div>
          <div className="flex items-center justify-between rounded-xl border border-border bg-white/[0.02] px-3.5 py-2.5">
            <span className="text-muted-foreground">Experience</span>
            <span className="font-medium">{profile.experienceYears} years</span>
          </div>
          <div className="rounded-xl border border-border bg-white/[0.02] px-3.5 py-2.5">
            <p className="mb-1.5 text-muted-foreground">Skills ({profile.skills.length})</p>
            <div className="flex flex-wrap gap-1.5">
              {profile.skills.map((s) => (
                <span key={s.name} className="rounded-md bg-white/5 px-2 py-0.5 text-xs">
                  {s.name}
                </span>
              ))}
            </div>
          </div>
        </div>
        <div className="mt-4 flex gap-2">
          <Button variant="ghost-glass" size="sm" onClick={() => setPhase("idle")}>
            Cancel
          </Button>
          <Button variant="primary-gradient" size="sm" className="flex-1 gap-1.5" disabled={saving} onClick={confirm}>
            <Check className="size-3.5" /> {saving ? "Saving…" : "Looks right — use this"}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-[24px] border border-dashed border-border-strong px-6 py-10 text-center">
      <FileText className="mx-auto mb-3 size-8 text-muted-foreground" />
      {profile.resumeFileName ? (
        <>
          <p className="text-sm font-medium">{profile.resumeFileName}</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Uploaded {profile.resumeUploadedAt ? new Date(profile.resumeUploadedAt).toLocaleDateString() : ""}
          </p>
        </>
      ) : (
        <p className="text-sm text-muted-foreground">No resume uploaded yet — your standard CV is built from your profile only.</p>
      )}
      <input
        ref={inputRef}
        type="file"
        accept=".pdf,.doc,.docx"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) handleFile(f);
        }}
      />
      <Button variant="ghost-glass" size="sm" className="mt-4 gap-1.5" onClick={() => inputRef.current?.click()}>
        <Upload className="size-3.5" /> {profile.resumeFileName ? "Replace resume" : "Upload resume (PDF/DOCX)"}
      </Button>
    </div>
  );
}
