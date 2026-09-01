"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  requestPhoneSigninOtp, verifyPhoneSigninOtp,
  requestPhoneSignupOtp, verifyPhoneSignupOtp,
} from "@/lib/api/auth";
import { ApiError } from "@/lib/api/httpClient";
import type { SignInResult } from "@/lib/api/auth";
import type { Session } from "@/lib/types";

// Two-step OTP flow shared by phone sign-in (existing, already-verified accounts) and phone
// signup (brand-new TALENT account - see PhoneSignupVerifyRequest's comment on why it's scoped
// there). The two only differ in which pair of endpoints they call and whether a name is needed
// once the code step is reached - not worth two near-duplicate components.
export function PhoneAuthForm({
  mode, onSignInResult, onSignUpResult,
}: {
  mode: "signin" | "signup";
  onSignInResult?: (result: SignInResult) => void;
  onSignUpResult?: (session: Session) => void;
}) {
  const [step, setStep] = useState<"phone" | "code">("phone");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const requestCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phoneNumber.trim()) { setError("Phone number is required"); return; }
    setError("");
    setSubmitting(true);
    try {
      if (mode === "signin") await requestPhoneSigninOtp(phoneNumber.trim());
      else await requestPhoneSignupOtp(phoneNumber.trim());
      setStep("code");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong — please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const verifyCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (code.length !== 6) return;
    if (mode === "signup" && !name.trim()) { setError("Name is required"); return; }
    setError("");
    setSubmitting(true);
    try {
      if (mode === "signin") {
        const result = await verifyPhoneSigninOtp(phoneNumber.trim(), code);
        onSignInResult?.(result);
      } else {
        const session = await verifyPhoneSignupOtp(phoneNumber.trim(), code, name.trim());
        onSignUpResult?.(session);
      }
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "That code didn't work — please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  if (step === "phone") {
    return (
      <form onSubmit={requestCode} className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="phoneNumber">Phone number</Label>
          <Input
            id="phoneNumber"
            type="tel"
            inputMode="tel"
            placeholder="+91 90000 00000"
            value={phoneNumber}
            onChange={(e) => setPhoneNumber(e.target.value)}
            className="h-11 rounded-xl border-border bg-white/[0.03]"
          />
        </div>
        {error && <p className="text-sm text-red-400">{error}</p>}
        <Button type="submit" variant="primary-gradient" size="cta" className="w-full" disabled={submitting}>
          {submitting && <Loader2 className="size-4 animate-spin" />}
          {submitting ? "Sending…" : "Send code"}
        </Button>
      </form>
    );
  }

  return (
    <form onSubmit={verifyCode} className="space-y-4">
      <p className="text-sm text-muted-foreground">Code sent to {phoneNumber}.</p>
      {mode === "signup" && (
        <div className="space-y-1.5">
          <Label htmlFor="phoneName">Full name</Label>
          <Input
            id="phoneName"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="h-11 rounded-xl border-border bg-white/[0.03]"
          />
        </div>
      )}
      <div className="space-y-1.5">
        <Label htmlFor="phoneCode">Verification code</Label>
        <Input
          id="phoneCode"
          inputMode="numeric"
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
        onClick={() => { setStep("phone"); setCode(""); setError(""); }}
        className="w-full text-center text-xs text-muted-foreground hover:text-foreground"
      >
        Use a different number
      </button>
    </form>
  );
}
