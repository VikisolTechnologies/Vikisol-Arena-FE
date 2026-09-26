"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { resetPassword } from "@/lib/api/auth";
import { ApiError } from "@/lib/api/httpClient";
import { EntryButton, EntryFrame, fieldClass } from "./EntryFrame";

export function ResetPasswordForm({ pathToken }: { pathToken?: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = pathToken || searchParams.get("token") || "";
  const email = searchParams.get("email") ?? "";
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  if (!token || !email) {
    return (
      <EntryFrame title="This link has expired" lede="Request a new reset link. The old one cannot set a password.">
        <Link href="/auth/forgot" className="inline-flex min-h-11 items-center text-sm text-primary-soft">Request a new link</Link>
      </EntryFrame>
    );
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 6) {
      setError("Use at least 6 characters.");
      return;
    }
    setError("");
    setSubmitting(true);
    try {
      await resetPassword(email, token, password);
      setDone(true);
    } catch (err) {
      const text = err instanceof ApiError ? err.message : "That link did not work.";
      setError(/expir|invalid|token/i.test(text) ? "This reset link is invalid or has expired." : text);
    } finally {
      setSubmitting(false);
    }
  };

  if (done) {
    return (
      <EntryFrame title="Password updated" lede="Sign in with the new password.">
        <EntryButton onClick={() => router.push("/auth?mode=signin")}>Sign in</EntryButton>
      </EntryFrame>
    );
  }

  return (
    <EntryFrame title="Choose a new password" lede={`For ${email}`}>
      <form onSubmit={submit} className="space-y-4">
        <label className="text-sm font-medium" htmlFor="new-password">New password</label>
        <div className="flex gap-2">
          <input id="new-password" type={show ? "text" : "password"} autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} className={fieldClass} />
          <button type="button" className="min-h-11 shrink-0 rounded-2xl border border-border px-3 text-sm" onClick={() => setShow((v) => !v)} aria-pressed={show}>{show ? "Hide" : "Show"}</button>
        </div>
        <p className="text-xs text-muted-foreground">At least 6 characters.</p>
        {error && <p className="text-sm text-red-400" role="alert">{error}</p>}
        <EntryButton type="submit" disabled={submitting}>{submitting ? "Saving…" : "Update password"}</EntryButton>
      </form>
    </EntryFrame>
  );
}
