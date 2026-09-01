"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Loader2 } from "lucide-react";
import { AuraBackground } from "@/components/landing/AuraBackground";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { resetPassword } from "@/lib/api/auth";
import { ApiError } from "@/lib/api/httpClient";
import { OrbLoader } from "@/components/ui/orb-loader";

// The link AuthService.forgotPassword emails points here as
// /reset-password?email=...&token=... - both read from the URL, never typed in by hand.
function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const email = searchParams.get("email") ?? "";
  const token = searchParams.get("token") ?? "";
  const [newPassword, setNewPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword.length < 6) { setError("Password must be at least 6 characters."); return; }
    setError("");
    setSubmitting(true);
    try {
      await resetPassword(email, token, newPassword);
      setDone(true);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong — please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  if (!email || !token) {
    return (
      <div className="rounded-[24px] border border-border bg-white/5 p-7 backdrop-blur-[18px]">
        <p className="text-sm text-muted-foreground">
          This reset link looks incomplete. Request a new one from the sign-in page.
        </p>
        <Link href="/auth" className="mt-4 inline-block text-sm text-primary-soft hover:underline">Back to sign in</Link>
      </div>
    );
  }

  if (done) {
    return (
      <div className="rounded-[24px] border border-border bg-white/5 p-7 backdrop-blur-[18px]">
        <p className="text-sm font-medium">Your password has been reset.</p>
        <Button variant="primary-gradient" size="cta" className="mt-4 w-full" onClick={() => router.push("/auth")}>
          Sign in
        </Button>
      </div>
    );
  }

  return (
    <div className="rounded-[24px] border border-border bg-white/5 p-7 backdrop-blur-[18px]">
      <h2 className="font-display text-lg font-bold tracking-tight">Choose a new password</h2>
      <p className="mt-1 text-sm text-muted-foreground">for {email}</p>
      <form onSubmit={handleSubmit} className="mt-4 space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="newPassword">New password</Label>
          <Input
            id="newPassword"
            type="password"
            autoFocus
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            className="h-11 rounded-xl border-border bg-white/[0.03]"
          />
        </div>
        {error && <p className="text-sm text-red-400">{error}</p>}
        <Button type="submit" variant="primary-gradient" size="cta" className="w-full" disabled={submitting}>
          {submitting && <Loader2 className="size-4 animate-spin" />}
          {submitting ? "Saving…" : "Reset password"}
        </Button>
      </form>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <div className="relative isolate min-h-svh w-full overflow-hidden bg-background text-foreground">
      <AuraBackground />
      <div className="relative z-10 mx-auto flex min-h-svh w-full max-w-md items-center px-5 py-16 sm:px-6">
        <div className="w-full">
          <Link href="/" className="mb-8 flex items-center gap-2.5">
            <span className="font-display text-lg font-bold tracking-wide">
              ARENA<span className="text-primary">.</span>
            </span>
          </Link>
          <Suspense fallback={<OrbLoader className="h-64" />}>
            <ResetPasswordForm />
          </Suspense>
        </div>
      </div>
    </div>
  );
}
