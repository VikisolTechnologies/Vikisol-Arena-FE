"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { AnimatePresence, m } from "motion/react";
import { Lock, Mail, MailCheck } from "lucide-react";
import { Button, ButtonLink } from "@/components/bplus/Button";
import { Lede, Screen, SkylineFooter, Title, TopBar } from "@/components/bplus/Screen";
import { PasswordField, TextField } from "@/components/bplus/TextField";
import { authErrorMessage, forgotPassword, PASSWORD_MIN, resetPassword, validateEmail, validateNewPassword } from "@/lib/data/auth";
import { errorIn, spring, vibrate } from "@/lib/motion";

function Sent({ title, body }: { title: string; body: string }) {
  return (
    <m.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={spring.gentle} role="status" className="mt-8">
      <span className="grid size-14 place-items-center rounded-full bg-success/15 text-success">
        <MailCheck className="size-7" strokeWidth={1.75} aria-hidden />
      </span>
      <p className="mt-4 text-[17px] font-semibold text-foreground">{title}</p>
      <p className="mt-1.5 text-[15px] leading-relaxed text-faint">{body}</p>
    </m.div>
  );
}

export function ForgotPasswordView() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [touched, setTouched] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [shakeSignal, setShake] = useState(0);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const fieldError = touched || submitted ? validateEmail(email) : "";

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
    setError("");
    if (validateEmail(email)) {
      setShake((s) => s + 1);
      document.getElementById("forgot-email")?.focus();
      return;
    }
    setLoading(true);
    try {
      await forgotPassword(email.trim());
      vibrate();
      setSent(true);
    } catch (err) {
      setError(authErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen>
        <TopBar onBack={() => router.push("/auth?mode=signin")} backLabel="Back to sign in" />
        <Title className="mt-2">Reset your password</Title>
        <Lede>Enter your email and we&apos;ll send a reset link if an account exists for it.</Lede>
        {sent ? (
          <>
            <Sent title="Check your email" body="If an account exists for that address, a reset link is on its way. It expires, so use it soon." />
            <ButtonLink href="/auth?mode=signin" variant="outline" className="mt-8">
              Back to sign in
            </ButtonLink>
          </>
        ) : (
          <form method="post" noValidate onSubmit={submit} className="mt-6 space-y-3.5">
            <TextField id="forgot-email" label="Email address" icon={Mail} type="email" inputMode="email" autoComplete="email" value={email} onChange={setEmail} onBlur={() => setTouched(true)} error={fieldError} shakeSignal={shakeSignal} />
            <AnimatePresence initial={false}>
              {error && (
                <m.p variants={errorIn} initial="hidden" animate="shown" exit="hidden" role="alert" className="rounded-xl bg-danger/12 px-3.5 py-2.5 text-[14px]">
                  {error}
                </m.p>
              )}
            </AnimatePresence>
            <Button type="submit" loading={loading}>
              Send reset link
            </Button>
          </form>
        )}
        <SkylineFooter lines={["Same neighbors", "Bigger possibilities"]} />
    </Screen>
  );
}

export function ResetPasswordView({ pathToken }: { pathToken?: string }) {
  const router = useRouter();
  const params = useSearchParams();
  const token = pathToken || params.get("token") || "";
  const email = params.get("email") ?? "";
  const [password, setPassword] = useState("");
  const [touched, setTouched] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [shakeSignal, setShake] = useState(0);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  const fieldError = touched || submitted ? validateNewPassword(password) : "";

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
    setError("");
    if (validateNewPassword(password)) {
      setShake((s) => s + 1);
      document.getElementById("reset-password")?.focus();
      return;
    }
    setLoading(true);
    try {
      await resetPassword(email, token, password);
      vibrate();
      setDone(true);
    } catch (err) {
      const text = authErrorMessage(err);
      setError(/expir|invalid|token/i.test(text) ? "This reset link is invalid or has expired. Request a new one." : text);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen>
        <TopBar onBack={() => router.push("/auth?mode=signin")} backLabel="Back to sign in" />
        {!token || !email ? (
          <>
            <Title className="mt-2">This link has expired</Title>
            <Lede>Reset links only work once and for a short time. Request a new one.</Lede>
            <ButtonLink href="/auth/forgot" className="mt-8">
              Request a new link
            </ButtonLink>
          </>
        ) : done ? (
          <>
            <Title className="mt-2">Password updated</Title>
            <Sent title="You're all set" body="Sign in with your new password." />
            <ButtonLink href="/auth?mode=signin" className="mt-8">
              Sign in
            </ButtonLink>
          </>
        ) : (
          <>
            <Title className="mt-2">Choose a new password</Title>
            <Lede>For {email}</Lede>
            <form method="post" noValidate onSubmit={submit} className="mt-6 space-y-3.5">
              <PasswordField
                id="reset-password"
                label="New password"
                icon={Lock}
                autoComplete="new-password"
                value={password}
                onChange={setPassword}
                onBlur={() => setTouched(true)}
                error={fieldError}
                hint={`Use at least ${PASSWORD_MIN} characters`}
                shakeSignal={shakeSignal}
              />
              {error && (
                <p role="alert" className="rounded-xl bg-danger/12 px-3.5 py-2.5 text-[14px]">
                  {error}{" "}
                  <Link href="/auth/forgot" className="font-semibold text-primary underline underline-offset-4">
                    Get a new link
                  </Link>
                </p>
              )}
              <Button type="submit" loading={loading}>
                Update password
              </Button>
            </form>
          </>
        )}
        <SkylineFooter lines={["Same neighbors", "Bigger possibilities"]} />
    </Screen>
  );
}
