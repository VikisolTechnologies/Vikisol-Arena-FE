"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Loader2, Building2, User } from "lucide-react";
import { AuraBackground } from "@/components/landing/AuraBackground";
import { AgentOrb } from "@/components/landing/AgentOrb";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { signIn, signUp, verifyMfa, forgotPassword } from "@/lib/api/auth";
import { ApiError } from "@/lib/api/httpClient";
import { isRealMode } from "@/lib/api/mode";
import { isOnboarded } from "@/lib/session";
import { useCookieConsentVisible } from "@/hooks/use-cookie-consent-visible";
import { GoogleSignInButton } from "@/components/auth/GoogleSignInButton";
import { PhoneAuthForm } from "@/components/auth/PhoneAuthForm";
import { signInWithGoogle } from "@/lib/api/auth";
import type { Role, Session } from "@/lib/types";
import type { SignInResult } from "@/lib/api/auth";

// Public signup only ever creates "talent" or a brand-new tenant's "company_admin" (see
// DECISIONS.md) - recruiter/hiring_manager accounts only ever come from accepting an invite.
const ROLES: { key: Role; label: string; desc: string; icon: typeof User }[] = [
  { key: "talent", label: "Talent", desc: "Find opportunities", icon: User },
  { key: "company_admin", label: "Enterprise", desc: "Find candidates", icon: Building2 },
];

// Landing-page entry points (Hero's "Ask anything" input, OvernightReport's teaser links) send
// visitors here as /auth?mode=signup - lands them straight on the signup tab instead of making
// them click it themselves. useSearchParams() needs a Suspense boundary above it (see
// reset-password/page.tsx for the same pattern) - the plain AuthPage() default export below
// provides that.
function AuthForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [mode, setMode] = useState<"signin" | "signup">(searchParams.get("mode") === "signup" ? "signup" : "signin");
  const [role, setRole] = useState<Role>("talent");
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  // Set only when signIn() comes back with "mfa_required" (see DECISIONS.md's 2FA flow) - a
  // non-null value swaps the form below to the code-entry step instead of email/password.
  const [mfaPendingToken, setMfaPendingToken] = useState<string | null>(null);
  const [mfaCode, setMfaCode] = useState("");
  // Phone/Google are talent-only entry points (see PhoneSignupVerifyRequest's comment) - "email"
  // stays the only method for the enterprise/recruiter/hiring-manager/platform-admin tabs.
  const [method, setMethod] = useState<"email" | "phone">("email");
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  // Syam's explicit call (2026-09-02): sign-in against an unknown email used to just show the
  // same generic "Invalid email or password" as a wrong password - a dead end for someone who
  // simply never signed up. AuthService.signIn now reveals this one specific case (see its own
  // comment on the enumeration trade-off), so this offers the obvious next step instead.
  const [accountNotFound, setAccountNotFound] = useState(false);
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotSent, setForgotSent] = useState(false);
  const [forgotSubmitting, setForgotSubmitting] = useState(false);
  // Same fixed-bottom-banner-covers-a-real-control bug already fixed on every app shell's
  // sidebar (see use-cookie-consent-visible.ts) - CookieConsentBanner is a fixed, bottom-of-
  // viewport overlay (z-[900]) and this page's own submit button can land directly under it for
  // any first-time visitor, since nothing here previously reserved space for it (found via a
  // real, reproducible signInAs() timeout: "button[type=submit] ... subtree intercepts pointer
  // events" from CookieConsentBanner's own class). This is the ONE page every visitor hits
  // before any shell exists to protect them, so it was the highest-severity instance of this
  // bug class in the app - it could block sign-in entirely, not just a secondary nav action.
  const cookieBannerVisible = useCookieConsentVisible();

  // Redirect off the session's *actual* role, not the tab the user clicked - real mode's
  // sign-in ignores the selected role entirely (any account can sign in from either tab) and
  // returns whichever role the account really has, which matters now that "company_admin"
  // is one of several distinct enterprise-side landings (see DECISIONS.md role-based landing).
  const redirectForRole = (sessionRole: string) => {
    switch (sessionRole) {
      case "company_admin":
        router.push("/enterprise/admin");
        break;
      case "recruiter":
        router.push("/enterprise");
        break;
      case "hiring_manager":
        router.push("/enterprise/interviews/mine");
        break;
      case "platform_admin":
        router.push("/admin");
        break;
      default:
        router.push(isOnboarded() ? "/home" : "/onboarding");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setAccountNotFound(false);
    if (!form.email || !form.password) {
      setError("Email and password are required");
      return;
    }
    if (mode === "signup" && !form.name) {
      setError("Name is required");
      return;
    }
    setSubmitting(true);
    try {
      if (mode === "signin") {
        const result = await signIn(form.email, form.password, role);
        if (result.status === "mfa_required") {
          setMfaPendingToken(result.pendingToken);
          return;
        }
        redirectForRole(result.session.role);
      } else {
        const session = await signUp(form.name, form.email, form.password, role);
        redirectForRole(session.role);
      }
    } catch (err) {
      if (mode === "signin" && err instanceof ApiError && err.message === "No account found with this email") {
        setAccountNotFound(true);
      } else {
        setError(err instanceof ApiError ? err.message : "Something went wrong — please try again.");
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleGoogleCredential = async (idToken: string) => {
    setError("");
    setSubmitting(true);
    try {
      const result = await signInWithGoogle(idToken);
      if (result.status === "mfa_required") {
        setMfaPendingToken(result.pendingToken);
        return;
      }
      redirectForRole(result.session.role);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Google sign-in didn't work — please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const handlePhoneSignInResult = (result: SignInResult) => {
    if (result.status === "mfa_required") {
      setMfaPendingToken(result.pendingToken);
      return;
    }
    redirectForRole(result.session.role);
  };

  const handlePhoneSignUpResult = (session: Session) => {
    redirectForRole(session.role);
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!forgotEmail.trim()) return;
    setError("");
    setForgotSubmitting(true);
    try {
      await forgotPassword(forgotEmail.trim());
      setForgotSent(true);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong — please try again.");
    } finally {
      setForgotSubmitting(false);
    }
  };

  const handleVerifyMfa = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!mfaPendingToken) return;
    setError("");
    setSubmitting(true);
    try {
      const session = await verifyMfa(mfaPendingToken, mfaCode);
      redirectForRole(session.role);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Incorrect code — please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="relative isolate min-h-svh w-full overflow-hidden bg-background text-foreground">
      <AuraBackground />

      <div
        className="relative z-10 mx-auto grid min-h-svh w-full max-w-[1240px] items-center gap-8 px-5 py-16 sm:px-6 lg:grid-cols-2"
        style={cookieBannerVisible ? { paddingBottom: "var(--cookie-banner-h, 88px)" } : undefined}
      >
        {/* Branding panel */}
        <div className="order-2 hidden flex-col items-center text-center lg:order-1 lg:flex">
          <AgentOrb />
          <p className="mt-4 max-w-sm font-display text-2xl font-bold tracking-tight">
            Your agent is ready to work.
          </p>
          <p className="mt-2 max-w-sm text-sm text-muted-foreground">
            Sign in to keep it hunting openings, applying, and booking interviews for you.
          </p>
        </div>

        {/* Form panel */}
        <div className="order-1 mx-auto w-full max-w-md lg:order-2">
          <Link href="/" className="mb-8 flex items-center gap-2.5">
            <span className="font-display text-lg font-bold tracking-wide">
              ARENA<span className="text-primary">.</span>
            </span>
          </Link>

          <div className="rounded-[24px] border border-border bg-white/5 p-7 backdrop-blur-[18px]">
            {showForgotPassword ? (
              <div className="space-y-4">
                <div>
                  <h2 className="font-display text-lg font-bold tracking-tight">Reset your password</h2>
                  <p className="mt-1 text-sm text-muted-foreground">Enter your email and we&apos;ll send you a reset link.</p>
                </div>
                {forgotSent ? (
                  <p className="rounded-xl border border-border bg-white/[0.03] p-4 text-sm text-muted-foreground">
                    If <span className="text-foreground">{forgotEmail}</span> has an account, a reset link is on its way — check your inbox.
                  </p>
                ) : (
                  <form onSubmit={handleForgotPassword} className="space-y-4">
                    <div className="space-y-1.5">
                      <Label htmlFor="forgotEmail">Email</Label>
                      <Input
                        id="forgotEmail"
                        type="email"
                        autoFocus
                        value={forgotEmail}
                        onChange={(e) => setForgotEmail(e.target.value)}
                        className="h-11 rounded-xl border-border bg-white/[0.03]"
                      />
                    </div>
                    {error && <p className="text-sm text-red-400">{error}</p>}
                    <Button type="submit" variant="primary-gradient" size="cta" className="w-full" disabled={forgotSubmitting}>
                      {forgotSubmitting && <Loader2 className="size-4 animate-spin" />}
                      {forgotSubmitting ? "Sending…" : "Send reset link"}
                    </Button>
                  </form>
                )}
                <button
                  type="button"
                  onClick={() => { setShowForgotPassword(false); setForgotSent(false); setForgotEmail(""); setError(""); }}
                  className="w-full text-center text-xs text-muted-foreground hover:text-foreground"
                >
                  Back to sign in
                </button>
              </div>
            ) : mfaPendingToken ? (
              <form onSubmit={handleVerifyMfa} className="space-y-4">
                <div>
                  <h2 className="font-display text-lg font-bold tracking-tight">Two-factor verification</h2>
                  <p className="mt-1 text-sm text-muted-foreground">Enter the 6-digit code from your authenticator app.</p>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="mfaCode">Verification code</Label>
                  <Input
                    id="mfaCode"
                    inputMode="numeric"
                    autoFocus
                    maxLength={6}
                    value={mfaCode}
                    onChange={(e) => setMfaCode(e.target.value.replace(/\D/g, ""))}
                    className="h-11 rounded-xl border-border bg-white/[0.03] text-center tracking-[0.5em]"
                  />
                </div>
                {error && <p className="text-sm text-red-400">{error}</p>}
                <Button type="submit" variant="primary-gradient" size="cta" className="w-full" disabled={submitting || mfaCode.length !== 6}>
                  {submitting && <Loader2 className="size-4 animate-spin" />}
                  {submitting ? "Verifying…" : "Verify"}
                </Button>
                <button
                  type="button"
                  onClick={() => { setMfaPendingToken(null); setMfaCode(""); setError(""); }}
                  className="w-full text-center text-xs text-muted-foreground hover:text-foreground"
                >
                  Back to sign in
                </button>
              </form>
            ) : (
              <>
            <Tabs value={mode} onValueChange={(v) => { setMode(v as "signin" | "signup"); setAccountNotFound(false); setError(""); }}>
              <TabsList className="mb-6 grid w-full grid-cols-2 rounded-full bg-white/5 p-1">
                <TabsTrigger value="signin" className="rounded-full data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                  Sign in
                </TabsTrigger>
                <TabsTrigger value="signup" className="rounded-full data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                  Sign up
                </TabsTrigger>
              </TabsList>
            </Tabs>

            <div className="mb-6 grid grid-cols-2 gap-3">
              {ROLES.map(({ key, label, desc, icon: Icon }) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => { setRole(key); setMethod("email"); setAccountNotFound(false); }}
                  className={cn(
                    "flex flex-col items-center gap-1.5 rounded-2xl border px-3 py-3.5 text-center transition-colors",
                    role === key
                      ? "border-primary/60 bg-primary/10 text-primary-soft"
                      : "border-border bg-white/[0.03] text-muted-foreground hover:border-white/20",
                  )}
                >
                  <Icon className="size-5" />
                  <span className="text-sm font-semibold">{label}</span>
                  <span className="text-[11px] text-muted-foreground">{desc}</span>
                </button>
              ))}
            </div>

            {/* Recruiter/hiring_manager/platform_admin only ever exist via invite or internal
                seeding (see ROLES above / DECISIONS.md) - never a signup choice, but still need
                a way to sign in as one. Keeps the primary talent/enterprise cards as the two
                on-brand choices rather than diluting them into a 5-way grid. */}
            {mode === "signin" && (
              <div className="mb-6 flex flex-wrap gap-2">
                {(["recruiter", "hiring_manager", "platform_admin"] as const).map((key) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => { setRole(key); setMethod("email"); setAccountNotFound(false); }}
                    className={cn(
                      "rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
                      role === key
                        ? "border-primary/60 bg-primary/10 text-primary-soft"
                        : "border-border bg-white/[0.03] text-muted-foreground hover:border-white/20",
                    )}
                  >
                    {key === "recruiter" ? "Recruiter" : key === "hiring_manager" ? "Hiring manager" : "Platform admin"}
                  </button>
                ))}
              </div>
            )}

            {method === "phone" ? (
              <>
                <PhoneAuthForm
                  mode={mode}
                  onSignInResult={handlePhoneSignInResult}
                  onSignUpResult={handlePhoneSignUpResult}
                  onSwitchToSignup={() => setMode("signup")}
                />
                <button
                  type="button"
                  onClick={() => setMethod("email")}
                  className="mt-4 w-full text-center text-xs text-muted-foreground hover:text-foreground"
                >
                  Use email instead
                </button>
              </>
            ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {mode === "signup" && (
                <div className="space-y-1.5">
                  <Label htmlFor="name">Full name</Label>
                  <Input
                    id="name"
                    value={form.name}
                    onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                    className="h-11 rounded-xl border-border bg-white/[0.03]"
                  />
                </div>
              )}
              <div className="space-y-1.5">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={form.email}
                  onChange={(e) => { setForm((f) => ({ ...f, email: e.target.value })); setAccountNotFound(false); }}
                  className="h-11 rounded-xl border-border bg-white/[0.03]"
                />
              </div>
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password">Password</Label>
                  {mode === "signin" && (
                    <button
                      type="button"
                      onClick={() => { setShowForgotPassword(true); setForgotEmail(form.email); setError(""); }}
                      className="text-xs text-muted-foreground hover:text-foreground"
                    >
                      Forgot password?
                    </button>
                  )}
                </div>
                <Input
                  id="password"
                  type="password"
                  value={form.password}
                  onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
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
                      onClick={() => { setMode("signup"); setAccountNotFound(false); }}
                    >
                      Create an account
                    </Button>
                    <Button
                      type="button"
                      variant="ghost-glass"
                      size="sm"
                      onClick={() => setAccountNotFound(false)}
                    >
                      Try a different email
                    </Button>
                  </div>
                </div>
              ) : (
                error && <p className="text-sm text-red-400">{error}</p>
              )}

              <Button type="submit" variant="primary-gradient" size="cta" className="w-full" disabled={submitting}>
                {submitting && <Loader2 className="size-4 animate-spin" />}
                {submitting ? "Working…" : mode === "signin" ? "Sign in" : "Create account"}
              </Button>
              {!isRealMode() && (
                <p className="text-center text-xs text-muted-foreground">
                  Any email and password works here — this is a design preview, no real account is created.
                </p>
              )}

              {/* Google/phone are talent-only entry points (see PhoneSignupVerifyRequest's
                  comment) - enterprise/recruiter/hiring-manager/platform-admin stay email-only. */}
              {role === "talent" && (
                <div className="space-y-3 pt-1">
                  <div className="flex items-center gap-3">
                    <div className="h-px flex-1 bg-border" />
                    <span className="text-[11px] uppercase tracking-wide text-muted-foreground">or</span>
                    <div className="h-px flex-1 bg-border" />
                  </div>
                  <GoogleSignInButton onCredential={handleGoogleCredential} disabled={submitting} />
                  <button
                    type="button"
                    onClick={() => setMethod("phone")}
                    className="w-full rounded-full border border-border bg-white/[0.03] px-4 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:border-white/20 hover:text-foreground"
                  >
                    Continue with phone number
                  </button>
                </div>
              )}
            </form>
            )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function AuthPage() {
  return (
    <Suspense fallback={<div className="min-h-svh w-full bg-background" />}>
      <AuthForm />
    </Suspense>
  );
}
