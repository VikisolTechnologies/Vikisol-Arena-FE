"use client";

import { useState } from "react";
import Link from "next/link";
import { forgotPassword } from "@/lib/api/auth";
import { ApiError } from "@/lib/api/httpClient";
import { EntryButton, EntryFrame, fieldClass } from "./EntryFrame";

export function ForgotPasswordForm() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      setError("Email is required.");
      return;
    }
    setError("");
    setSubmitting(true);
    try {
      await forgotPassword(email.trim());
      setSent(true);
    } catch (err) {
      const offline = typeof navigator !== "undefined" && !navigator.onLine;
      setError(offline ? "You are offline. Check the connection and try again." : err instanceof ApiError ? err.message : "The reset email was not sent.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <EntryFrame title="Reset your password" lede="We will email a link if an account exists for this address.">
      {sent ? (
        <p className="text-sm" role="status">Check your email for the reset link. It expires, and an unknown address gets the same confirmation.</p>
      ) : (
        <form onSubmit={submit} className="space-y-4">
          <label className="text-sm font-medium" htmlFor="forgot-email">Email address</label>
          <input id="forgot-email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} className={fieldClass} />
          {error && <p className="text-sm text-red-400" role="alert">{error}</p>}
          <EntryButton type="submit" disabled={submitting}>{submitting ? "Sending…" : "Send reset link"}</EntryButton>
        </form>
      )}
      <Link href="/auth?mode=signin" className="mt-4 inline-flex min-h-11 items-center text-sm text-primary-soft">Back to sign in</Link>
    </EntryFrame>
  );
}
