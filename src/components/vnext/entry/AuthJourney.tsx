"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { signIn, signUp, verifyMfa, signInWithGoogle } from "@/lib/api/auth";
import { ApiError } from "@/lib/api/httpClient";
import { GoogleSignInButton } from "@/components/auth/GoogleSignInButton";
import type { Role } from "@/lib/types";
import { entryIsPending, markEntryPending } from "./draft";
import { EntryButton, EntryFrame, fieldClass } from "./EntryFrame";

type View = "welcome" | "signin" | "signup";

function messageFor(err: unknown) {
  if (typeof navigator !== "undefined" && !navigator.onLine) return "You are offline. Check the connection and try again.";
  if (err instanceof ApiError) return err.message;
  return "Something went wrong. Nothing was saved.";
}

function land(router: ReturnType<typeof useRouter>, role: string, fromSignup: boolean) {
  if (role === "company_admin") {
    router.push("/enterprise/onboarding");
    return;
  }
  if (role === "recruiter") {
    router.push("/enterprise");
    return;
  }
  if (role === "hiring_manager") {
    router.push("/enterprise/interviews/mine");
    return;
  }
  if (role === "platform_admin") {
    router.push("/admin");
    return;
  }
  if (fromSignup || entryIsPending()) {
    markEntryPending();
    router.push("/onboarding");
    return;
  }
  router.push("/home");
}

export function AuthJourney() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initial = searchParams.get("mode") === "signup" ? "signup" : searchParams.get("mode") === "signin" ? "signin" : "welcome";
  const [view, setView] = useState<View>(initial);
  const [account, setAccount] = useState<Role>("talent");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [mfaToken, setMfaToken] = useState<string | null>(null);
  const [mfaCode, setMfaCode] = useState("");
  const expired = searchParams.get("reason") === "expired";
  const invited = searchParams.get("invite") === "1";

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!email.trim() || !password) {
      setError("Email and password are required.");
      return;
    }
    if (view === "signup" && password.length < 6) {
      setError("Use at least 6 characters.");
      return;
    }
    if (view === "signup" && !name.trim()) {
      setError("Name is required to create the account.");
      return;
    }
    setSubmitting(true);
    try {
      if (view === "signup") {
        const session = await signUp(name.trim(), email.trim(), password, account);
        land(router, session.role, true);
        return;
      }
      const result = await signIn(email.trim(), password, "talent");
      if (result.status === "mfa_required") {
        setMfaToken(result.pendingToken);
        return;
      }
      land(router, result.session.role, false);
    } catch (err) {
      setError(messageFor(err));
    } finally {
      setSubmitting(false);
    }
  };

  const submitMfa = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!mfaToken) return;
    setSubmitting(true);
    setError("");
    try {
      const session = await verifyMfa(mfaToken, mfaCode);
      land(router, session.role, false);
    } catch (err) {
      setError(messageFor(err));
    } finally {
      setSubmitting(false);
    }
  };

  const onGoogle = async (idToken: string) => {
    setError("");
    setSubmitting(true);
    try {
      const result = await signInWithGoogle(idToken);
      if (result.status === "mfa_required") {
        setMfaToken(result.pendingToken);
        setView("signin");
        return;
      }
      land(router, result.session.role, entryIsPending());
    } catch (err) {
      setError(messageFor(err));
    } finally {
      setSubmitting(false);
    }
  };

  if (view === "welcome") {
    return (
      <EntryFrame title="Local people. Real outcomes." lede="Meet neighbors, join activities, ask for help, and make your skills useful nearby.">
        <div className="mb-6 h-36 rounded-[24px] bg-[radial-gradient(circle_at_30%_20%,#ff6b35_0%,transparent_42%),linear-gradient(160deg,#1c120e,#09090b)]" aria-hidden />
        <div className="mt-auto space-y-3">
          <EntryButton onClick={() => setView("signup")}>Join Arena</EntryButton>
          <EntryButton tone="ghost" onClick={() => setView("signin")}>Sign in</EntryButton>
          <Link href="/home" className="inline-flex min-h-11 w-full items-center justify-center text-sm text-muted-foreground underline-offset-4 hover:underline">
            Continue as guest
          </Link>
        </div>
      </EntryFrame>
    );
  }

  if (mfaToken) {
    return (
      <EntryFrame title="Verification code" lede="Enter the code from your authenticator.">
        <form onSubmit={submitMfa} className="space-y-4">
          <label className="block text-sm font-medium" htmlFor="mfa-code">Code</label>
          <input id="mfa-code" inputMode="numeric" autoComplete="one-time-code" value={mfaCode} onChange={(e) => setMfaCode(e.target.value)} className={fieldClass} />
          {error && <p className="text-sm text-red-400" role="alert">{error}</p>}
          <EntryButton type="submit" disabled={submitting}>{submitting ? "Checking…" : "Continue"}</EntryButton>
        </form>
      </EntryFrame>
    );
  }

  const signup = view === "signup";
  return (
    <EntryFrame
      title={signup ? "Create your account" : "Welcome back"}
      lede={signup ? "Join as yourself, or open a company account. Recruiters join only with an invitation." : "Good to see you again."}
    >
      <form method="post" action={signup ? "/auth?mode=signup" : "/auth?mode=signin"} onSubmit={submit} className="space-y-4">
        {expired && <p className="rounded-2xl border border-border px-3 py-2 text-sm" role="status">Your session expired. Sign in again.</p>}
        {invited && <p className="rounded-2xl border border-border px-3 py-2 text-sm">This invitation is for a company role. Open the invite link you were sent.</p>}
        {signup && (
          <fieldset className="flex flex-col gap-2">
            <legend className="sr-only">Account type</legend>
            <button type="button" aria-pressed={account === "talent"} onClick={() => setAccount("talent")} className={choiceClass(account === "talent")}>Join as a person</button>
            <button type="button" aria-pressed={account === "company_admin"} onClick={() => setAccount("company_admin")} className={choiceClass(account === "company_admin")}>Create a company account</button>
          </fieldset>
        )}
        {signup && (
          <div>
            <label className="text-sm font-medium" htmlFor="name">Full name</label>
            <input id="name" autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} className={`${fieldClass} mt-1.5`} />
          </div>
        )}
        <div>
          <label className="text-sm font-medium" htmlFor="email">Email address</label>
          <input id="email" type="email" autoComplete="email" inputMode="email" value={email} onChange={(e) => setEmail(e.target.value)} className={`${fieldClass} mt-1.5`} />
        </div>
        <div>
          <label className="text-sm font-medium" htmlFor="password">Password</label>
          <div className="mt-1.5 flex gap-2">
            <input
              id="password"
              type={showPassword ? "text" : "password"}
              autoComplete={signup ? "new-password" : "current-password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={fieldClass}
            />
            <button type="button" className="min-h-11 shrink-0 rounded-2xl border border-border px-3 text-sm" onClick={() => setShowPassword((v) => !v)} aria-pressed={showPassword}>
              {showPassword ? "Hide" : "Show"}
            </button>
          </div>
          {signup && <p className="mt-1.5 text-xs text-muted-foreground">At least 6 characters.</p>}
        </div>
        {!signup && (
          <Link href="/auth/forgot" className="inline-flex min-h-11 items-center text-sm text-primary-soft">Forgot password?</Link>
        )}
        {error && <p className="text-sm text-red-400 motion-safe:animate-[entry-in_160ms_ease]" role="alert">{error}</p>}
        <EntryButton type="submit" disabled={submitting}>{submitting ? "Please wait…" : signup ? "Create account" : "Sign in"}</EntryButton>
        <GoogleSignInButton onCredential={onGoogle} disabled={submitting} />
        <p className="text-center text-sm text-muted-foreground">
          {signup ? (
            <button type="button" className="min-h-11 underline-offset-4 hover:underline" onClick={() => setView("signin")}>Already have an account? Sign in</button>
          ) : (
            <button type="button" className="min-h-11 underline-offset-4 hover:underline" onClick={() => setView("signup")}>New here? Create an account</button>
          )}
        </p>
        <p className="text-center text-xs text-muted-foreground">
          <Link href="/terms" className="underline-offset-4 hover:underline">Terms</Link>
          {" · "}
          <Link href="/privacy" className="underline-offset-4 hover:underline">Privacy</Link>
        </p>
      </form>
    </EntryFrame>
  );
}

function choiceClass(on: boolean) {
  return `min-h-11 rounded-2xl border px-2 text-sm font-medium focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary ${on ? "border-primary bg-primary/15 text-primary-soft" : "border-border"}`;
}
