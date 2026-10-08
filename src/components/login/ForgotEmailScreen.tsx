"use client";

import { useState, type CSSProperties, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Mail, MailCheck } from "lucide-react";
import { authErrorMessage, forgotPassword, validateEmail } from "@/lib/data/auth";
import { Cta, FieldError } from "./LoginCard";
import { LoginFrame } from "./LoginScreen";

/** `/auth/forgot` in the login look: email in, reset link out. Same call as before. */
export function ForgotEmailScreen() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [touched, setTouched] = useState(false);
  const [error, setError] = useState("");
  const [state, setState] = useState<"idle" | "loading" | "success">("idle");
  const [sent, setSent] = useState(false);

  const fieldError = touched ? validateEmail(email) : "";
  const toSignIn = () => router.push("/auth?mode=signin");

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setTouched(true);
    setError("");
    if (validateEmail(email)) {
      document.getElementById("forgot-email")?.focus();
      return;
    }
    setState("loading");
    try {
      await forgotPassword(email.trim());
      setSent(true);
    } catch (err) {
      setError(authErrorMessage(err));
    } finally {
      setState("idle");
    }
  };

  return (
    <LoginFrame onBack={() => router.push("/auth?mode=recover")} skip={false} compact>
      <div className="al-recover al-in" style={{ "--i": 1 } as CSSProperties}>
        {sent ? (
          <div role="status">
            <MailCheck className="al-sent-icon" aria-hidden="true" />
            <h1 className="al-h2">Check your email</h1>
            <p className="al-lede">If an account exists for that address, a reset link is on its way. It expires, so use it soon.</p>
            <div className="al-form">
              <button type="button" className="al-cta" data-state="idle" onClick={toSignIn}>
                Back to sign in
                <i aria-hidden="true">
                  <ArrowRight />
                </i>
              </button>
            </div>
          </div>
        ) : (
          <>
            <h1 className="al-h2">Reset your password</h1>
            <p className="al-lede">Enter your email and we&apos;ll send a reset link if an account exists for it.</p>
            <form className="al-form" method="post" noValidate onSubmit={submit}>
              <label htmlFor="forgot-email" className="al-sr">
                Email address
              </label>
              <div className="al-field" data-state={fieldError ? "error" : undefined}>
                <Mail aria-hidden="true" />
                <input
                  id="forgot-email"
                  type="email"
                  inputMode="email"
                  autoComplete="email"
                  autoCapitalize="none"
                  spellCheck={false}
                  placeholder="you@example.com"
                  value={email}
                  aria-invalid={Boolean(fieldError) || undefined}
                  aria-describedby="forgot-email-error"
                  onBlur={() => email && setTouched(true)}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              <FieldError id="forgot-email-error" message={fieldError} />
              <FieldError id="forgot-error" message={error} />
              <Cta state={state} busyLabel="Sending..." doneLabel="Sent">
                Send reset link
              </Cta>
            </form>
          </>
        )}
      </div>
    </LoginFrame>
  );
}
