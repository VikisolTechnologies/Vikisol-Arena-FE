"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { AnimatePresence, m } from "motion/react";
import { Lock, Mail, User } from "lucide-react";
import { Button } from "@/components/bplus/Button";
import { Checkbox } from "@/components/bplus/Controls";
import { OrDivider, Lede, Screen, SkylineFooter, Title, TopBar } from "@/components/bplus/Screen";
import { PasswordField, TextField } from "@/components/bplus/TextField";
import { GOOGLE_SIGN_IN_ENABLED, GoogleSignInButton } from "@/components/auth/GoogleSignInButton";
import {
  authErrorMessage,
  fieldForServerError,
  PASSWORD_MIN,
  signIn,
  signInWithGoogle,
  signUp,
  validateEmail,
  validateName,
  validateNewPassword,
  validatePassword,
  verifyMfa,
} from "@/lib/data/auth";
import type { SignInResult } from "@/lib/api/auth";
import type { Role, Session } from "@/lib/types";
import { errorIn, vibrate } from "@/lib/motion";

/** How long the success check shows before the next screen slides in. */
const SUCCESS_HOLD_MS = 380;

function FormError({ message }: { message: string }) {
  return (
    <AnimatePresence initial={false}>
      {message && (
        <m.p key={message} variants={errorIn} initial="hidden" animate="shown" exit="hidden" role="alert" className="rounded-xl bg-danger/12 px-3.5 py-2.5 text-[14px] text-foreground">
          {message}
        </m.p>
      )}
    </AnimatePresence>
  );
}

function focusFirst(ids: string[]) {
  for (const id of ids) {
    const el = document.getElementById(id);
    if (el) {
      el.focus();
      return;
    }
  }
}

type Landing = (session: Pick<Session, "role">, fromSignup: boolean) => void;

export function SignUpView({ onBack, onSignIn, land }: { onBack: () => void; onSignIn: () => void; land: Landing }) {
  const [account, setAccount] = useState<Role>("talent");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [agree, setAgree] = useState(false);
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [submitted, setSubmitted] = useState(false);
  const [shakeSignal, setShake] = useState(0);
  const [serverField, setServerField] = useState<{ field: string; message: string } | null>(null);
  const [formError, setFormError] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const errors = {
    name: validateName(name),
    email: validateEmail(email),
    password: validateNewPassword(password),
    agree: agree ? "" : "Please agree to the Terms of Service and Privacy Policy.",
  };
  const shown = (field: keyof typeof errors) => {
    if (serverField?.field === field) return serverField.message;
    return touched[field] || submitted ? errors[field] : "";
  };
  const blur = (field: string) => () => setTouched((t) => ({ ...t, [field]: true }));
  const edit = (setter: (v: string) => void, field: string) => (v: string) => {
    setter(v);
    if (serverField?.field === field) setServerField(null);
  };

  const onGoogle = async (idToken: string) => {
    setFormError("");
    setLoading(true);
    try {
      const result: SignInResult = await signInWithGoogle(idToken);
      if (result.status === "mfa_required") {
        setFormError("This account uses a verification code. Sign in instead.");
        return;
      }
      land(result.session, true);
    } catch (err) {
      setFormError(authErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
    setFormError("");
    const invalid = (["name", "email", "password", "agree"] as const).filter((f) => errors[f]);
    if (invalid.length) {
      setShake((s) => s + 1);
      focusFirst(invalid.map((f) => `signup-${f}`));
      return;
    }
    setLoading(true);
    try {
      const session = await signUp(name.trim(), email.trim(), password, account);
      setSuccess(true);
      vibrate();
      window.setTimeout(() => land(session, true), SUCCESS_HOLD_MS);
    } catch (err) {
      const message = authErrorMessage(err);
      const field = fieldForServerError(message);
      if (field) {
        setServerField({ field, message });
        focusFirst([`signup-${field}`]);
      } else {
        setFormError(message);
      }
      setShake((s) => s + 1);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen>
      <TopBar onBack={onBack} />
      <Title className="mt-2">Create your account</Title>
      <Lede>Join a neighborhood of real people doing real things together.</Lede>

      {account === "company_admin" && (
        <p className="mt-4 rounded-xl border border-line bg-surface px-3.5 py-2.5 text-[14px] text-foreground/90">
          Company account. Recruiters join with an invitation from their company.{" "}
          <button type="button" className="font-semibold text-primary underline-offset-4 hover:underline" onClick={() => setAccount("talent")}>
            Join as a person instead
          </button>
        </p>
      )}

      {GOOGLE_SIGN_IN_ENABLED && account === "talent" && (
        <>
          <div className="mt-6">
            <GoogleSignInButton onCredential={onGoogle} disabled={loading} text="continue_with" shape="rectangular" />
          </div>
          <OrDivider />
        </>
      )}

      <form method="post" noValidate onSubmit={submit} className={GOOGLE_SIGN_IN_ENABLED && account === "talent" ? "space-y-3.5" : "mt-6 space-y-3.5"}>
        <TextField id="signup-name" label="Full name" icon={User} autoComplete="name" value={name} onChange={edit(setName, "name")} onBlur={blur("name")} error={shown("name")} shakeSignal={shakeSignal} />
        <TextField id="signup-email" label="Email address" icon={Mail} type="email" inputMode="email" autoComplete="email" value={email} onChange={edit(setEmail, "email")} onBlur={blur("email")} error={shown("email")} shakeSignal={shakeSignal} />
        <PasswordField
          id="signup-password"
          label="Password"
          icon={Lock}
          autoComplete="new-password"
          value={password}
          onChange={edit(setPassword, "password")}
          onBlur={blur("password")}
          error={shown("password")}
          hint={`Use at least ${PASSWORD_MIN} characters`}
          shakeSignal={shakeSignal}
        />
        <Checkbox id="signup-agree" checked={agree} onChange={setAgree} error={submitted ? errors.agree : ""}>
          I agree to the{" "}
          <Link href="/terms" className="underline underline-offset-2">
            Terms of Service
          </Link>{" "}
          and{" "}
          <Link href="/privacy" className="underline underline-offset-2">
            Privacy Policy
          </Link>
        </Checkbox>
        <FormError message={formError} />
        <Button type="submit" loading={loading} success={success} className="mt-2">
          Create account
        </Button>
      </form>

      <p className="mt-4 text-center text-[15px] text-foreground/85">
        Already have an account?{" "}
        <button type="button" onClick={onSignIn} className="min-h-11 font-semibold text-primary underline-offset-4 hover:underline">
          Sign in
        </button>
      </p>
      {account === "talent" && (
        <p className="text-center text-[13px] text-faint">
          Hiring for a company?{" "}
          <button type="button" onClick={() => setAccount("company_admin")} className="min-h-11 underline underline-offset-4">
            Create a company account
          </button>
        </p>
      )}

      <SkylineFooter lines={["People today", "Stronger neighbors tomorrow"]} />
    </Screen>
  );
}

export function SignInView({
  onBack,
  onSignUp,
  land,
  notice,
}: {
  onBack: () => void;
  onSignUp: () => void;
  land: Landing;
  notice?: string;
}) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [submitted, setSubmitted] = useState(false);
  const [shakeSignal, setShake] = useState(0);
  const [formError, setFormError] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [mfaToken, setMfaToken] = useState<string | null>(null);

  const errors = { email: validateEmail(email), password: validatePassword(password) };
  const shown = (f: keyof typeof errors) => (touched[f] || submitted ? errors[f] : "");

  const finish = (session: Pick<Session, "role">) => {
    setSuccess(true);
    vibrate();
    window.setTimeout(() => land(session, false), SUCCESS_HOLD_MS);
  };

  const handle = (result: SignInResult) => {
    if (result.status === "mfa_required") {
      setMfaToken(result.pendingToken);
      return;
    }
    finish(result.session);
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
    setFormError("");
    const invalid = (["email", "password"] as const).filter((f) => errors[f]);
    if (invalid.length) {
      setShake((s) => s + 1);
      focusFirst(invalid.map((f) => `signin-${f}`));
      return;
    }
    setLoading(true);
    try {
      handle(await signIn(email.trim(), password, "talent"));
    } catch (err) {
      setFormError(authErrorMessage(err));
      setShake((s) => s + 1);
    } finally {
      setLoading(false);
    }
  };

  const onGoogle = async (idToken: string) => {
    setFormError("");
    setLoading(true);
    try {
      handle(await signInWithGoogle(idToken));
    } catch (err) {
      setFormError(authErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  if (mfaToken) return <MfaView pendingToken={mfaToken} onBack={() => setMfaToken(null)} onDone={finish} />;

  return (
    <Screen>
      <TopBar onBack={onBack} />
      <Title className="mt-2">Welcome back</Title>
      <Lede>Good to see you again.</Lede>
      {notice && (
        <p role="status" className="mt-4 rounded-xl border border-line bg-surface px-3.5 py-2.5 text-[14px]">
          {notice}
        </p>
      )}

      <form method="post" noValidate onSubmit={submit} className="mt-6 space-y-3.5">
        <TextField id="signin-email" label="Email address" icon={Mail} type="email" inputMode="email" autoComplete="email" value={email} onChange={setEmail} onBlur={() => setTouched((t) => ({ ...t, email: true }))} error={shown("email")} shakeSignal={shakeSignal} />
        <PasswordField id="signin-password" label="Password" icon={Lock} autoComplete="current-password" value={password} onChange={setPassword} onBlur={() => setTouched((t) => ({ ...t, password: true }))} error={shown("password")} shakeSignal={shakeSignal} />
        <div className="flex justify-center">
          <Link href="/auth/forgot" className="inline-flex min-h-11 items-center text-[15px] font-semibold text-primary underline-offset-4 hover:underline">
            Forgot password?
          </Link>
        </div>
        <FormError message={formError} />
        <Button type="submit" loading={loading} success={success}>
          Sign in
        </Button>
      </form>

      {GOOGLE_SIGN_IN_ENABLED && (
        <>
          <OrDivider />
          <GoogleSignInButton onCredential={onGoogle} disabled={loading} text="continue_with" shape="rectangular" />
        </>
      )}

      <p className="mt-4 text-center text-[15px] text-foreground/85">
        Don&apos;t have an account?{" "}
        <button type="button" onClick={onSignUp} className="min-h-11 font-semibold text-primary underline-offset-4 hover:underline">
          Create account
        </button>
      </p>

      <SkylineFooter lines={["Same neighbors", "Bigger possibilities"]} />
    </Screen>
  );
}

function MfaView({ pendingToken, onBack, onDone }: { pendingToken: string; onBack: () => void; onDone: (session: Pick<Session, "role">) => void }) {
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [shakeSignal, setShake] = useState(0);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!/^\d{6}$/.test(code.trim())) {
      setError("Enter the 6-digit code from your authenticator app.");
      setShake((s) => s + 1);
      return;
    }
    setError("");
    setLoading(true);
    try {
      onDone(await verifyMfa(pendingToken, code.trim()));
    } catch (err) {
      setError(authErrorMessage(err));
      setShake((s) => s + 1);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen>
      <TopBar onBack={onBack} />
      <Title className="mt-2">Verification code</Title>
      <Lede>Enter the code from your authenticator app.</Lede>
      <form method="post" noValidate onSubmit={submit} className="mt-6 space-y-4">
        <TextField id="mfa-code" label="6-digit code" inputMode="numeric" autoComplete="one-time-code" value={code} onChange={setCode} error={error} shakeSignal={shakeSignal} />
        <Button type="submit" loading={loading}>
          Continue
        </Button>
      </form>
    </Screen>
  );
}
