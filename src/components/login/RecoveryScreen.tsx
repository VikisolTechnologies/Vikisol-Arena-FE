"use client";

import { useEffect, useState, type CSSProperties, type FormEvent } from "react";
import Link from "next/link";
import { ArrowRight, ChevronDown, KeyRound, UserRound } from "lucide-react";
import { authErrorMessage, forgotPassword } from "@/lib/data/auth";
import { requestPhoneSigninOtp, verifyPhoneSigninOtp } from "@/lib/api/auth";
import type { Session } from "@/lib/types";
import { Cta, FieldError, IndiaFlag, OtpBoxes } from "./LoginCard";
import { LoginFrame } from "./LoginScreen";

type Landing = (session: Pick<Session, "role">, fromSignup: boolean) => void;
type Step = "choose" | "mobile" | "otp" | "help" | "email" | "reset";
type CtaState = "idle" | "loading" | "success";

const RESEND_SECONDS = 30;
const step = (i: number) => ({ "--i": i }) as CSSProperties;

function Option({ icon, title, body, onClick }: { icon: React.ReactNode; title: React.ReactNode; body: string; onClick: () => void }) {
  return (
    <button type="button" className="al-option" onClick={onClick}>
      {icon}
      <span>
        <b>{title}</b>
        <small>{body}</small>
      </span>
      <ArrowRight className="al-option-go" aria-hidden="true" />
    </button>
  );
}

/**
 * Account recovery (`/auth?mode=recover`), built to the approved mockup: choose what you lost,
 * prove the mobile number with an OTP, then reset the password or see the account's email.
 *
 * Uses only calls arena-api already has. The OTP is the phone sign-in OTP, so a correct code signs
 * the person in; "Find my email" then shows the session's email, and "Reset my password" sends
 * the normal reset link to that email. It works only for accounts with a verified mobile number,
 * and only once arena-api can really send an SMS.
 */
export function RecoveryScreen({ onExit, land }: { onExit: () => void; land: Landing }) {
  const [at, setAt] = useState<Step>("choose");
  const [phone, setPhone] = useState("");
  const [phoneError, setPhoneError] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [cta, setCta] = useState<CtaState>("idle");
  const [resendIn, setResendIn] = useState(0);
  const [session, setSession] = useState<Session | null>(null);

  const digits = phone.replace(/\D/g, "");
  const e164 = `+91${digits}`;

  useEffect(() => {
    if (resendIn <= 0) return;
    const id = window.setTimeout(() => setResendIn((s) => s - 1), 1000);
    return () => window.clearTimeout(id);
  }, [resendIn]);

  const go = (next: Step) => {
    setError("");
    setCta("idle");
    setAt(next);
  };

  const back = () => {
    if (at === "choose") return onExit();
    if (at === "mobile") return go("choose");
    if (at === "otp") {
      setCode("");
      return go("mobile");
    }
    if (at === "help") return session ? land(session, false) : onExit();
    go("help");
  };

  const sendOtp = async (e?: FormEvent) => {
    e?.preventDefault();
    setError("");
    if (!/^[6-9]\d{9}$/.test(digits)) {
      setPhoneError("Please enter a valid mobile number");
      document.getElementById("recover-phone")?.focus();
      return;
    }
    setPhoneError("");
    setCta("loading");
    try {
      await requestPhoneSigninOtp(e164);
      setCode("");
      setResendIn(RESEND_SECONDS);
      go("otp");
    } catch (err) {
      setError(authErrorMessage(err));
      setCta("idle");
    }
  };

  const resend = async () => {
    setError("");
    setCode("");
    try {
      await requestPhoneSigninOtp(e164);
      setResendIn(RESEND_SECONDS);
    } catch (err) {
      setError(authErrorMessage(err));
    }
  };

  const verify = async (e: FormEvent) => {
    e.preventDefault();
    if (code.length !== 6) {
      setError("Enter the 6-digit code we sent you.");
      return;
    }
    setError("");
    setCta("loading");
    try {
      const result = await verifyPhoneSigninOtp(e164, code);
      if (result.status === "mfa_required") {
        setError("This account also uses an authenticator app. Sign in with your email and password instead.");
        setCta("idle");
        return;
      }
      setSession(result.session);
      go("help");
    } catch (err) {
      setError(authErrorMessage(err));
      setCta("idle");
    }
  };

  const sendReset = async () => {
    if (!session) return;
    setError("");
    try {
      await forgotPassword(session.email);
      go("reset");
    } catch (err) {
      setError(authErrorMessage(err));
    }
  };

  const formatPhone = (raw: string) => {
    const d = raw.replace(/\D/g, "").slice(0, 10);
    return d.length > 5 ? `${d.slice(0, 5)} ${d.slice(5)}` : d;
  };
  const mm = String(Math.floor(resendIn / 60)).padStart(2, "0");
  const ss = String(resendIn % 60).padStart(2, "0");

  return (
    <LoginFrame onBack={back} skip={false} compact>
      <div key={at} className="al-recover al-in" style={step(1)}>
        {at === "choose" && (
          <>
            <h1 className="al-h2">Account recovery</h1>
            <p className="al-lede">Enter your mobile number and we&apos;ll help you recover your account.</p>
            <div className="al-options">
              <Option icon={<KeyRound className="al-option-icon al-option-key" aria-hidden="true" />} title="Forgot password?" body="Reset your password using mobile OTP." onClick={() => go("mobile")} />
              <Option
                icon={<UserRound className="al-option-icon" aria-hidden="true" />}
                title={
                  <>
                    Forgot email <em>/</em> username?
                  </>
                }
                body="Recover your email or username using mobile OTP."
                onClick={() => go("mobile")}
              />
            </div>
            <p className="al-help al-help-left">
              Know your email?{" "}
              <Link href="/auth/forgot" className="al-link">
                Get a reset link by email
              </Link>
            </p>
          </>
        )}

        {at === "mobile" && (
          <>
            <h1 className="al-h2">Enter your mobile number</h1>
            <p className="al-lede">We&apos;ll send you a 6-digit OTP to help you recover your account.</p>
            <form className="al-form" method="post" noValidate onSubmit={sendOtp}>
              <label htmlFor="recover-phone" className="al-sr">
                Mobile number
              </label>
              <div className="al-field" data-state={phoneError ? "error" : undefined}>
                <span className="al-cc">
                  <IndiaFlag />
                  <span>
                    <span className="al-sr">India </span>+91
                  </span>
                  <ChevronDown aria-hidden="true" />
                </span>
                <input
                  id="recover-phone"
                  type="tel"
                  inputMode="numeric"
                  autoComplete="tel-national"
                  placeholder="98765 43210"
                  value={phone}
                  aria-invalid={Boolean(phoneError) || undefined}
                  aria-describedby="recover-phone-error"
                  onChange={(e) => {
                    setPhone(formatPhone(e.target.value));
                    if (phoneError) setPhoneError("");
                  }}
                />
              </div>
              <FieldError id="recover-phone-error" message={phoneError} />
              <FieldError id="recover-error" message={error} />
              <Cta state={cta} busyLabel="Sending..." doneLabel="OTP sent">
                Send OTP
              </Cta>
            </form>
          </>
        )}

        {at === "otp" && (
          <div className="al-center">
            <h1 className="al-h2">Verify OTP</h1>
            <p className="al-lede">
              We&apos;ve sent a 6-digit code to
              <br />
              +91 {digits.slice(0, 5)} {digits.slice(5)}
            </p>
            <form className="al-form" method="post" noValidate onSubmit={verify}>
              <OtpBoxes value={code} onChange={setCode} invalid={Boolean(error)} label="6-digit code" describedBy="recover-error" />
              <FieldError id="recover-error" message={error} />
              <p className="al-resend">
                Didn&apos;t receive the code?
                <br />
                <button type="button" className="al-link" disabled={resendIn > 0} onClick={resend}>
                  {resendIn > 0 ? `Resend in ${mm}:${ss}` : "Resend code"}
                </button>
              </p>
              <button type="submit" className="al-cta" data-state={cta} disabled={cta !== "idle" || code.length !== 6} aria-busy={cta === "loading"}>
                {cta === "loading" ? "Verifying..." : "Verify & continue"}
                <i aria-hidden="true">{cta === "loading" ? <span className="al-spin" /> : <ArrowRight />}</i>
              </button>
            </form>
          </div>
        )}

        {at === "help" && (
          <>
            <h1 className="al-h2">How can we help you?</h1>
            <p className="al-lede">Choose what you want to reset.</p>
            <div className="al-options">
              <Option icon={<KeyRound className="al-option-icon" aria-hidden="true" />} title="Reset my password" body="You'll be able to set a new password after verification." onClick={sendReset} />
              <Option
                icon={<UserRound className="al-option-icon" aria-hidden="true" />}
                title={
                  <>
                    Find my email <em>/</em> username
                  </>
                }
                body="We'll show your registered email or username after verification."
                onClick={() => go("email")}
              />
            </div>
            <FieldError id="recover-error" message={error} />
          </>
        )}

        {at === "email" && session && (
          <>
            <h1 className="al-h2">Your Arena email</h1>
            <p className="al-lede">This is the email registered to your mobile number.</p>
            <p className="al-found">{session.email}</p>
            <div className="al-form">
              <button type="button" className="al-cta" data-state="idle" onClick={() => land(session, false)}>
                Continue to Arena
                <i aria-hidden="true">
                  <ArrowRight />
                </i>
              </button>
            </div>
          </>
        )}

        {at === "reset" && session && (
          <>
            <h1 className="al-h2">Check your email</h1>
            <p className="al-lede">We sent a link to set a new password to {session.email}. You&apos;re signed in for now.</p>
            <div className="al-form">
              <button type="button" className="al-cta" data-state="idle" onClick={() => land(session, false)}>
                Continue to Arena
                <i aria-hidden="true">
                  <ArrowRight />
                </i>
              </button>
            </div>
          </>
        )}
      </div>
    </LoginFrame>
  );
}
