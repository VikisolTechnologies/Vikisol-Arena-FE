"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { AuraBackground } from "@/components/landing/AuraBackground";
import { AgentOrb } from "@/components/landing/AgentOrb";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { previewInvitation, acceptInvitation, type InvitationPreview } from "@/lib/api/companyAdmin";

const ROLE_LABELS: Record<string, string> = {
  recruiter: "Recruiter", company_admin: "Company Admin", hiring_manager: "Hiring Manager",
};

export default function AcceptInvitePage() {
  const params = useParams<{ token: string }>();
  const router = useRouter();
  const [preview, setPreview] = useState<InvitationPreview | null>(null);
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    previewInvitation(params.token).then(setPreview);
  }, [params.token]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!name.trim() || password.length < 8) {
      setError("Name is required and password must be at least 8 characters");
      return;
    }
    setSubmitting(true);
    try {
      await acceptInvitation(params.token, name.trim(), password);
      router.push("/auth");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't accept this invite");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="relative isolate flex min-h-svh w-full items-center justify-center overflow-hidden bg-background px-5 py-16 text-foreground">
      <AuraBackground />
      <div className="relative z-10 w-full max-w-md">
        <div className="mb-6 flex justify-center"><div className="scale-50"><AgentOrb /></div></div>
        <div className="rounded-[24px] border border-border bg-white/5 p-7 backdrop-blur-[18px]">
          {!preview ? (
            <div className="flex justify-center py-8"><Loader2 className="size-6 animate-spin text-muted-foreground" /></div>
          ) : !preview.valid ? (
            <div className="text-center">
              <h1 className="font-display text-lg font-bold">Invite not valid</h1>
              <p className="mt-2 text-sm text-muted-foreground">{preview.invalidReason}</p>
              <Button variant="ghost-glass" size="sm" className="mt-4" onClick={() => router.push("/auth")}>Go to sign in</Button>
            </div>
          ) : (
            <>
              <div className="mb-5 text-center">
                <span className="text-3xl">{preview.companyLogoEmoji}</span>
                <h1 className="mt-2 font-display text-xl font-bold tracking-tight">Join {preview.companyName}</h1>
                <p className="mt-1 text-sm text-muted-foreground">
                  You&apos;ve been invited as <span className="font-semibold text-primary-soft">{ROLE_LABELS[preview.role ?? ""] ?? preview.role}</span>
                </p>
              </div>
              <form onSubmit={submit} className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" value={preview.email ?? ""} disabled className="border-border bg-white/[0.02] opacity-70" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="name">Full name</Label>
                  <Input id="name" value={name} onChange={(e) => setName(e.target.value)} className="border-border bg-white/[0.03]" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="password">Password</Label>
                  <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="border-border bg-white/[0.03]" />
                </div>
                {error && <p className="text-xs text-red-400">{error}</p>}
                <Button type="submit" variant="primary-gradient" size="cta" className="w-full" disabled={submitting}>
                  {submitting ? "Joining…" : "Accept & join"}
                </Button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
