"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { requestEmailSigninOtp, verifyEmailSigninOtp } from "@/lib/api/auth";
import { ApiError } from "@/lib/api/httpClient";
import type { SignInResult } from "@/lib/api/auth";

// Email-OTP sign-in for an existing account, any role - same two-step shape as PhoneAuthForm,
// minus the name field/WebOTP (both phone-specific) and minus a signup branch (see
// AuthService.requestEmailSigninOtp's own comment on why this is signin-only).
export function EmailOtpAuthForm({
  initialEmail, onSignInResult, onSwitchToSignup,
}: {
  initialEmail?: string;
  onSignInResult?: (result: SignInResult) => void;
  onSwitchToSignup?: () => void;
}) {
  const [step, setStep] = useState<"email" | "code">("email");
  const [email, setEmail] = useState(initialEmail ?? "");
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [accountNotFound, setAccountNotFound] = useState(false);

  const requestCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) { setError("Email is required"); return; }
    setError("");
    setAccountNotFound(false);
    setSubmitting(true);
    try {
      await requestEmailSigninOtp(email.trim());
      setStep("code");
    } catch (err) {
      if (err instanceof ApiError && err.message === "No account found with this email") {
        setAccountNotFound(true);
      } else {
        setError(err instanceof ApiError ? err.message : "Something went wrong — please try again.");
      }
    } finally {
      setSubmitting(false);
    }
  };

  const verifyCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (code.length !== 6) return;
    setError("");
    setSubmitting(true);
    try {
      const result = await verifyEmailSigninOtp(email.trim(), code);
      onSignInResult?.(result);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "That code didn't work — please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  if (step === "email") {
    return (
      <form onSubmit={requestCode} className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="otpEmail">Email</Label>
          <Input
            id="otpEmail"
            type="email"
            autoFocus
            value={email}
            onChange={(e) => { setEmail(e.target.value); setAccountNotFound(false); }}
            className="h-11 rounded-xl border-border bg-white/[0.03]"
          />
        </div>
        {accountNotFound ? (
          <div className="rounded-xl border border-border bg-white/[0.03] p-4">
            <p className="text-sm text-muted-foreground">No account found with that email.</p>
            <div className="mt-3 flex gap-2">
              <Button
                type="button"
                variant="primary-gradient"
                size="sm"
                onClick={() => { onSwitchToSignup?.(); setAccountNotFound(false); }}
              >
                Create an account
              </Button>
              <Button type="button" variant="ghost-glass" size="sm" onClick={() => setAccountNotFound(false)}>
                Try a different email
              </Button>
            </div>
          </div>
        ) : (
          error && <p className="text-sm text-red-400">{error}</p>
        )}
        <Button type="submit" variant="primary-gradient" size="cta" className="w-full" disabled={submitting}>
          {submitting && <Loader2 className="size-4 animate-spin" />}
          {submitting ? "Sending…" : "Send code"}
        </Button>
      </form>
    );
  }

  return (
    <form onSubmit={verifyCode} className="space-y-4">
      <p className="text-sm text-muted-foreground">Code sent to {email}.</p>
      <div className="space-y-1.5">
        <Label htmlFor="emailOtpCode">Verification code</Label>
        <Input
          id="emailOtpCode"
          inputMode="numeric"
          autoComplete="one-time-code"
          autoFocus
          maxLength={6}
          value={code}
          onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
          className="h-11 rounded-xl border-border bg-white/[0.03] text-center tracking-[0.5em]"
        />
      </div>
      {error && <p className="text-sm text-red-400">{error}</p>}
      <Button type="submit" variant="primary-gradient" size="cta" className="w-full" disabled={submitting || code.length !== 6}>
        {submitting && <Loader2 className="size-4 animate-spin" />}
        {submitting ? "Verifying…" : "Verify"}
      </Button>
      <button
        type="button"
        onClick={() => { setStep("email"); setCode(""); setError(""); }}
        className="w-full text-center text-xs text-muted-foreground hover:text-foreground"
      >
        Use a different email
      </button>
    </form>
  );
}
