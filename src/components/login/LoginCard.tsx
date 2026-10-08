"use client";

import { useEffect, useRef, useState, type ClipboardEvent, type FormEvent, type KeyboardEvent, type ReactNode } from "react";
import Script from "next/script";
import { ArrowRight, Check, ChevronDown, CircleAlert, Eye, EyeOff, Lock, Mail, Smartphone } from "lucide-react";
import { authErrorMessage, signIn, signInWithGoogle, validateEmail, validatePassword, verifyMfa } from "@/lib/data/auth";
import { requestPhoneSigninOtp, verifyPhoneSigninOtp, type SignInResult } from "@/lib/api/auth";
import type { Session } from "@/lib/types";
import { LOGIN_GOOGLE, LOGIN_HELP_HREF, LOGIN_MOBILE_OTP } from "./flags";

type Landing = (session: Pick<Session, "role">, fromSignup: boolean) => void;
type Pane = "mobile" | "otp" | "email" | "password" | "mfa";
type CtaState = "idle" | "loading" | "success";

const SUCCESS_HOLD_MS = 380;
const RESEND_SECONDS = 30;
const GOOGLE_CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;

export function Cta({ state, children, busyLabel, doneLabel }: { state: CtaState; children: ReactNode; busyLabel: string; doneLabel: string }) {
  return (
    <button type="submit" className="al-cta" data-state={state} disabled={state !== "idle"} aria-busy={state === "loading"}>
      {state === "loading" ? busyLabel : state === "success" ? doneLabel : children}
      <i aria-hidden="true">{state === "loading" ? <span className="al-spin" /> : state === "success" ? <Check /> : <ArrowRight />}</i>
    </button>
  );
}

export function FieldError({ id, message }: { id: string; message: string }) {
  return (
    <p id={id} className="al-err" role="alert" hidden={!message}>
      {message}
    </p>
  );
}

export function IndiaFlag() {
  return (
    <svg className="al-flag" viewBox="0 0 22 15" aria-hidden="true">
      <rect width="22" height="5" fill="#FF9933" />
      <rect y="5" width="22" height="5" fill="#fff" />
      <rect y="10" width="22" height="5" fill="#138808" />
      <circle cx="11" cy="7.5" r="1.8" fill="none" stroke="#000080" strokeWidth="0.5" />
    </svg>
  );
}

function GoogleG() {
  return (
    <svg viewBox="0 0 48 48" aria-hidden="true">
      <path fill="#EA4335" d="M24 9.5c3.540 0 6.710 1.220 9.210 3.600l6.850-6.850C35.900 2.380 30.470 0 24 0 14.620 0 6.510 5.380 2.560 13.220l7.980 6.190C12.430 13.720 17.740 9.500 24 9.500z" />
      <path fill="#4285F4" d="M46.980 24.550c0-1.570-.150-3.090-.380-4.550H24v9.020h12.940c-.580 2.960-2.260 5.480-4.780 7.180l7.730 6c4.510-4.180 7.090-10.360 7.090-17.650z" />
      <path fill="#FBBC05" d="M10.530 28.590c-.480-1.450-.760-2.990-.760-4.590s.270-3.140.760-4.590l-7.980-6.190C.920 16.460 0 20.120 0 24c0 3.880.920 7.540 2.560 10.780l7.970-6.190z" />
      <path fill="#34A853" d="M24 48c6.480 0 11.930-2.130 15.890-5.810l-7.730-6c-2.150 1.450-4.920 2.300-8.160 2.300-6.260 0-11.570-4.220-13.470-9.910l-7.980 6.190C6.510 42.620 14.620 48 24 48z" />
    </svg>
  );
}

/** Google's own sign-in button, rendered by Google Identity Services and laid invisibly over the
 *  glass circle, so the tap and the consent are Google's and the look is the card's. */
function GoogleCircle({ onCredential, disabled }: { onCredential: (idToken: string) => void; disabled: boolean }) {
  const ref = useRef<HTMLDivElement>(null);
  const cb = useRef(onCredential);
  useEffect(() => {
    cb.current = onCredential;
  }, [onCredential]);

  useEffect(() => {
    if (!GOOGLE_CLIENT_ID || disabled) return;
    const init = () => {
      if (!window.google || !ref.current) return false;
      window.google.accounts.id.initialize({ client_id: GOOGLE_CLIENT_ID, callback: (resp) => cb.current(resp.credential) });
      ref.current.innerHTML = "";
      window.google.accounts.id.renderButton(ref.current, { type: "icon", shape: "circle", theme: "filled_black", size: "large" });
      return true;
    };
    if (init()) return;
    const id = window.setInterval(() => {
      if (init()) window.clearInterval(id);
    }, 100);
    return () => window.clearInterval(id);
  }, [disabled]);

  return (
    <div className="al-soc" title="Continue with Google">
      <Script src="https://accounts.google.com/gsi/client" strategy="afterInteractive" />
      <GoogleG />
      <div ref={ref} className="al-gsi" />
    </div>
  );
}

function AppleIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="#fff" aria-hidden="true">
      <path d="M12.152 6.896c-.948 0-2.415-1.078-3.96-1.04-2.04.027-3.91 1.183-4.961 3.014-2.117 3.675-.546 9.103 1.519 12.09 1.013 1.454 2.208 3.09 3.792 3.039 1.52-.065 2.09-.987 3.935-.987 1.831 0 2.35.987 3.96.948 1.637-.026 2.676-1.48 3.676-2.948 1.156-1.688 1.636-3.325 1.662-3.415-.039-.013-3.182-1.221-3.22-4.857-.026-3.04 2.48-4.494 2.597-4.559-1.429-2.09-3.623-2.324-4.39-2.376-2-.156-3.675 1.09-4.61 1.09zM15.53 3.83c.843-1.012 1.4-2.427 1.245-3.83-1.207.052-2.662.805-3.532 1.818-.78.896-1.454 2.338-1.273 3.714 1.338.104 2.715-.688 3.559-1.701" />
    </svg>
  );
}

function WhatsAppIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="#25D366" aria-hidden="true">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
    </svg>
  );
}

export function OtpBoxes({ value, onChange, invalid, label, describedBy }: { value: string; onChange: (v: string) => void; invalid: boolean; label: string; describedBy?: string }) {
  const refs = useRef<Array<HTMLInputElement | null>>([]);
  const setAt = (index: number, digits: string) => {
    const chars = value.padEnd(6, " ").split("");
    digits.split("").forEach((d, k) => {
      if (index + k < 6) chars[index + k] = d;
    });
    const next = chars.join("").replace(/\s+$/, "").replace(/ /g, "");
    onChange(next.slice(0, 6));
    refs.current[Math.min(5, index + digits.length)]?.focus();
  };
  const onKey = (index: number) => (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace") {
      e.preventDefault();
      if (value[index]) onChange(value.slice(0, index));
      else if (index > 0) {
        onChange(value.slice(0, index - 1));
        refs.current[index - 1]?.focus();
      }
    } else if (e.key === "ArrowLeft") refs.current[Math.max(0, index - 1)]?.focus();
    else if (e.key === "ArrowRight") refs.current[Math.min(5, index + 1)]?.focus();
  };
  const onPaste = (e: ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const digits = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (digits) {
      onChange(digits);
      refs.current[Math.min(5, digits.length)]?.focus();
    }
  };
  return (
    <div className="al-otp" role="group" aria-label={label} data-state={invalid ? "error" : undefined}>
      {Array.from({ length: 6 }, (_, i) => (
        <input
          key={i}
          ref={(el) => {
            refs.current[i] = el;
          }}
          inputMode="numeric"
          pattern="[0-9]*"
          maxLength={6}
          autoComplete={i === 0 ? "one-time-code" : "off"}
          aria-label={`Digit ${i + 1} of 6`}
          aria-invalid={invalid || undefined}
          aria-describedby={describedBy}
          autoFocus={i === 0}
          value={value[i] ?? ""}
          onChange={(e) => {
            const digits = e.target.value.replace(/\D/g, "");
            if (digits) setAt(digits.length > 1 ? 0 : i, digits.length > 1 ? digits.slice(0, 6) : digits);
          }}
          onKeyDown={onKey(i)}
          onPaste={onPaste}
          onFocus={(e) => e.target.select()}
        />
      ))}
    </div>
  );
}

export function LoginCard({ land, notice, onSignUp, onRecover }: { land: Landing; notice?: string; onSignUp: () => void; onRecover: () => void }) {
  const [pane, setPane] = useState<Pane>(LOGIN_MOBILE_OTP ? "mobile" : "email");
  const [cta, setCta] = useState<CtaState>("idle");
  const [error, setError] = useState("");
  const [socialNote, setSocialNote] = useState("");

  const [phone, setPhone] = useState("");
  const [phoneError, setPhoneError] = useState("");
  const [code, setCode] = useState("");
  const [resendIn, setResendIn] = useState(0);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [emailTouched, setEmailTouched] = useState(false);
  const [notFound, setNotFound] = useState(false);
  const [keepSignedIn, setKeepSignedIn] = useState(true);
  const [passwordError, setPasswordError] = useState("");

  const [mfaToken, setMfaToken] = useState<string | null>(null);

  const tab: "mobile" | "email" = pane === "mobile" || pane === "otp" ? "mobile" : "email";
  const busy = cta !== "idle";
  const digits = phone.replace(/\D/g, "");
  const e164 = `+91${digits}`;
  const phoneOk = /^[6-9]\d{9}$/.test(digits);
  const emailProblem = !email.trim() ? "Enter your email address." : validateEmail(email) ? "Please enter a valid email address." : "";
  const emailError = emailTouched ? emailProblem : "";
  const showTabs = LOGIN_MOBILE_OTP && pane !== "mfa" && pane !== "password";
  const showSocial = pane === "mobile" || pane === "email" || pane === "password";

  useEffect(() => {
    if (resendIn <= 0) return;
    const id = window.setTimeout(() => setResendIn((s) => s - 1), 1000);
    return () => window.clearTimeout(id);
  }, [resendIn]);

  const go = (next: Pane) => {
    setError("");
    setSocialNote("");
    setCode("");
    setCta("idle");
    setPane(next);
  };

  const finish = (session: Pick<Session, "role">) => {
    setCta("success");
    if (typeof navigator !== "undefined" && "vibrate" in navigator) navigator.vibrate?.(10);
    window.setTimeout(() => land(session, false), SUCCESS_HOLD_MS);
  };

  const handle = (result: SignInResult) => {
    if (result.status === "mfa_required") {
      setMfaToken(result.pendingToken);
      go("mfa");
      return;
    }
    finish(result.session);
  };

  const fail = (err: unknown) => {
    const message = authErrorMessage(err);
    // arena-api's own wording when the email has no account: show the "Account not found" state.
    if (pane === "password" && /no account found/i.test(message)) {
      setNotFound(true);
      go("email");
      return;
    }
    setError(message);
    setCta("idle");
  };

  const submitEmail = (e: FormEvent) => {
    e.preventDefault();
    setEmailTouched(true);
    if (emailProblem) {
      document.getElementById("signin-email")?.focus();
      return;
    }
    if (notFound) {
      onSignUp();
      return;
    }
    go("password");
  };

  const submitPassword = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    const pErr = validatePassword(password);
    setPasswordError(pErr);
    if (pErr) {
      document.getElementById("signin-password")?.focus();
      return;
    }
    setCta("loading");
    try {
      handle(await signIn(email.trim(), password, "talent"));
    } catch (err) {
      fail(err);
    }
  };

  const sendOtp = async (e?: FormEvent) => {
    e?.preventDefault();
    setError("");
    if (!phoneOk) {
      setPhoneError("Please enter a valid mobile number");
      document.getElementById("login-phone")?.focus();
      return;
    }
    setPhoneError("");
    setCta("loading");
    try {
      await requestPhoneSigninOtp(e164);
      setCta("success");
      window.setTimeout(() => {
        go("otp");
        setResendIn(RESEND_SECONDS);
      }, 600);
    } catch (err) {
      fail(err);
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

  const submitOtp = async (e: FormEvent) => {
    e.preventDefault();
    if (code.length !== 6) {
      setError("Enter the 6-digit code we sent you.");
      return;
    }
    setError("");
    setCta("loading");
    try {
      handle(await verifyPhoneSigninOtp(e164, code));
    } catch (err) {
      fail(err);
    }
  };

  const submitMfa = async (e: FormEvent) => {
    e.preventDefault();
    if (code.length !== 6 || !mfaToken) {
      setError("Enter the 6-digit code from your authenticator app.");
      return;
    }
    setError("");
    setCta("loading");
    try {
      finish(await verifyMfa(mfaToken, code));
    } catch (err) {
      fail(err);
    }
  };

  const onGoogle = async (idToken: string) => {
    setError("");
    setSocialNote("");
    setCta("loading");
    try {
      handle(await signInWithGoogle(idToken));
    } catch (err) {
      fail(err);
    }
  };

  const onTabKey = (e: KeyboardEvent<HTMLButtonElement>) => {
    if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
    e.preventDefault();
    const next = tab === "mobile" ? "email" : "mobile";
    go(next);
    document.getElementById(`login-tab-${next}`)?.focus();
  };

  const formatPhone = (raw: string) => {
    const d = raw.replace(/\D/g, "").slice(0, 10);
    return d.length > 5 ? `${d.slice(0, 5)} ${d.slice(5)}` : d;
  };
  const maskedPhone = `+91 ${digits.slice(0, 5)} ${digits.slice(5)}`;
  const mm = String(Math.floor(resendIn / 60)).padStart(2, "0");
  const ss = String(resendIn % 60).padStart(2, "0");
  const notYet = (name: string) => () => setSocialNote(`${name} sign-in isn't available yet. Use your mobile number or email for now.`);

  return (
    <section className="al-card" aria-label="Sign in">
      {notice && (
        <p className="al-notice" role="status">
          {notice}
        </p>
      )}

      {showTabs && (
        <div className="al-tabs" role="tablist" aria-label="Sign-in method">
          <button id="login-tab-mobile" type="button" role="tab" className="al-tab" aria-selected={tab === "mobile"} aria-controls="login-pane" tabIndex={tab === "mobile" ? 0 : -1} onClick={() => tab !== "mobile" && go("mobile")} onKeyDown={onTabKey}>
            <Smartphone aria-hidden="true" />
            <span>
              <b>Mobile</b>
              <small>Quick &amp; easy</small>
            </span>
          </button>
          <button id="login-tab-email" type="button" role="tab" className="al-tab" aria-selected={tab === "email"} aria-controls="login-pane" tabIndex={tab === "email" ? 0 : -1} onClick={() => tab !== "email" && go("email")} onKeyDown={onTabKey}>
            <Mail aria-hidden="true" />
            <span>
              <b>Email</b>
              <small>Use your email</small>
            </span>
          </button>
        </div>
      )}

      <div id="login-pane" key={pane} className="al-pane" role={showTabs ? "tabpanel" : undefined} aria-labelledby={showTabs ? `login-tab-${tab}` : undefined}>
        {pane === "mobile" && (
          <>
            <h2 className="al-title">Enter your mobile number</h2>
            <p className="al-desc">We&apos;ll send you a 6-digit OTP to sign in.</p>
            <form className="al-form" method="post" noValidate onSubmit={sendOtp}>
              <label htmlFor="login-phone" className="al-sr">
                Mobile number
              </label>
              <div className="al-field" data-state={phoneError ? "error" : phoneOk ? "success" : undefined}>
                <span className="al-cc">
                  <IndiaFlag />
                  <span>
                    <span className="al-sr">India </span>+91
                  </span>
                  <ChevronDown aria-hidden="true" />
                </span>
                <input
                  id="login-phone"
                  type="tel"
                  inputMode="numeric"
                  autoComplete="tel-national"
                  placeholder="98765 43210"
                  value={phone}
                  aria-invalid={Boolean(phoneError) || undefined}
                  aria-describedby="login-phone-error"
                  onChange={(e) => {
                    setPhone(formatPhone(e.target.value));
                    if (phoneError) setPhoneError("");
                  }}
                />
                {phoneOk && <Check aria-hidden="true" style={{ margin: "0 14px 0 0", color: "var(--al-success)" }} />}
              </div>
              <FieldError id="login-phone-error" message={phoneError} />
              <FieldError id="login-form-error" message={error} />
              <Cta state={cta} busyLabel="Sending..." doneLabel="OTP sent">
                Send OTP
              </Cta>
            </form>
          </>
        )}

        {pane === "otp" && (
          <>
            <h2 className="al-title">Verify your number</h2>
            <p className="al-desc">We sent a 6-digit code to {maskedPhone}</p>
            <form className="al-form" method="post" noValidate onSubmit={submitOtp}>
              <OtpBoxes value={code} onChange={setCode} invalid={Boolean(error)} label="6-digit code" describedBy="login-form-error" />
              <FieldError id="login-form-error" message={error} />
              <div className="al-row">
                <button type="button" className="al-link" onClick={() => go("mobile")}>
                  Change number
                </button>
                <button type="button" className="al-link" disabled={resendIn > 0} onClick={resend}>
                  {resendIn > 0 ? `Resend code in ${mm}:${ss}` : "Resend code"}
                </button>
              </div>
              <Cta state={cta} busyLabel="Verifying..." doneLabel="Verified">
                Verify &amp; continue
              </Cta>
            </form>
          </>
        )}

        {pane === "email" && (
          <>
            <h2 className="al-title">{notFound ? "Account not found" : "Sign in with email"}</h2>
            <p className="al-desc">Enter your email address to continue.</p>
            <form className="al-form" method="post" noValidate onSubmit={submitEmail}>
              <label htmlFor="signin-email" className="al-sr">
                Email address
              </label>
              <div className="al-field" data-state={emailError || notFound ? "error" : undefined}>
                <Mail aria-hidden="true" />
                <input
                  id="signin-email"
                  type="email"
                  inputMode="email"
                  autoComplete="username"
                  autoCapitalize="none"
                  spellCheck={false}
                  placeholder="you@example.com"
                  value={email}
                  aria-invalid={Boolean(emailError) || notFound || undefined}
                  aria-describedby="signin-email-error"
                  onBlur={() => email && setEmailTouched(true)}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (notFound) setNotFound(false);
                  }}
                />
                {(emailError || notFound) && <CircleAlert className="al-bang" aria-hidden="true" />}
              </div>
              <FieldError id="signin-email-error" message={emailError} />
              {notFound && (
                <p className="al-banner" role="alert">
                  <CircleAlert aria-hidden="true" />
                  We couldn&apos;t find an account with this email address.
                </p>
              )}
              {notFound ? (
                <>
                  <Cta state="idle" busyLabel="" doneLabel="">
                    Create account
                  </Cta>
                  <button
                    type="button"
                    className="al-ghost"
                    onClick={() => {
                      setNotFound(false);
                      setEmail("");
                      setEmailTouched(false);
                      document.getElementById("signin-email")?.focus();
                    }}
                  >
                    Try a different email
                  </button>
                </>
              ) : (
                <button type="submit" className="al-cta" data-state="idle" disabled={Boolean(emailError)}>
                  Continue
                  <i aria-hidden="true">
                    <ArrowRight />
                  </i>
                </button>
              )}
            </form>
          </>
        )}

        {pane === "password" && (
          <>
            <h2 className="al-title al-title-lg">Enter your password</h2>
            <p className="al-desc">Welcome back! Please enter your password to continue.</p>
            <form className="al-form" method="post" noValidate onSubmit={submitPassword}>
              {/* Lets password managers pair the saved password with this email. */}
              <input type="email" name="username" autoComplete="username" value={email.trim()} readOnly hidden />
              <div className="al-field al-field-static">
                <Mail aria-hidden="true" />
                <span className="al-static">{email.trim()}</span>
                <button type="button" className="al-link al-change" onClick={() => go("email")}>
                  Change
                </button>
              </div>
              <label htmlFor="signin-password" className="al-sr">
                Password
              </label>
              <div className="al-field" data-state={passwordError ? "error" : undefined}>
                <Lock aria-hidden="true" />
                <input
                  id="signin-password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  autoFocus
                  placeholder="Enter your password"
                  value={password}
                  aria-invalid={Boolean(passwordError) || undefined}
                  aria-describedby="signin-password-error"
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (passwordError) setPasswordError("");
                  }}
                />
                <button type="button" className="al-eye" aria-label={showPassword ? "Hide the characters" : "Show the characters"} aria-pressed={showPassword} onClick={() => setShowPassword((v) => !v)}>
                  {showPassword ? <EyeOff aria-hidden="true" /> : <Eye aria-hidden="true" />}
                </button>
              </div>
              <FieldError id="signin-password-error" message={passwordError} />
              <div className="al-row">
                <label className="al-check">
                  <input type="checkbox" checked={keepSignedIn} onChange={(e) => setKeepSignedIn(e.target.checked)} />
                  <span aria-hidden="true">
                    <Check />
                  </span>
                  Keep me signed in
                </label>
                <button type="button" className="al-link" onClick={onRecover}>
                  Forgot password?
                </button>
              </div>
              <FieldError id="login-form-error" message={error} />
              <Cta state={cta} busyLabel="Signing in..." doneLabel="Signed in">
                Sign in
              </Cta>
            </form>
          </>
        )}

        {pane === "mfa" && (
          <>
            <h2 className="al-title">Verification code</h2>
            <p className="al-desc">Enter the 6-digit code from your authenticator app.</p>
            <form className="al-form" method="post" noValidate onSubmit={submitMfa}>
              <OtpBoxes value={code} onChange={setCode} invalid={Boolean(error)} label="6-digit code" describedBy="login-form-error" />
              <FieldError id="login-form-error" message={error} />
              <div className="al-row">
                <button
                  type="button"
                  className="al-link"
                  onClick={() => {
                    setMfaToken(null);
                    go("email");
                  }}
                >
                  Back to sign in
                </button>
              </div>
              <Cta state={cta} busyLabel="Verifying..." doneLabel="Verified">
                Continue
              </Cta>
            </form>
          </>
        )}
      </div>

      {showSocial && (
        <>
          <div className="al-or">or continue with</div>
          <div className="al-social">
            {LOGIN_GOOGLE ? (
              <GoogleCircle onCredential={onGoogle} disabled={busy} />
            ) : (
              <button type="button" className="al-soc" aria-label="Continue with Google" onClick={notYet("Google")}>
                <GoogleG />
              </button>
            )}
            <button type="button" className="al-soc" aria-label="Continue with Apple" onClick={notYet("Apple")}>
              <AppleIcon />
            </button>
            <button type="button" className="al-soc" aria-label="Continue with WhatsApp" onClick={notYet("WhatsApp")}>
              <WhatsAppIcon />
            </button>
          </div>
          <p className="al-note" role="status">
            {socialNote}
          </p>
        </>
      )}

      {pane === "email" && (
        <p className="al-help">
          Forgot{" "}
          <button type="button" className="al-link" onClick={onRecover}>
            email
          </button>{" "}
          or{" "}
          <button type="button" className="al-link" onClick={onRecover}>
            password
          </button>
          ?
        </p>
      )}
      {pane === "password" && (
        <p className="al-help">
          <button type="button" className="al-link" onClick={onRecover}>
            Forgot email?
          </button>
        </p>
      )}
      {(pane === "mobile" || pane === "otp" || pane === "mfa") && (
        <p className="al-help">
          Having trouble signing in?{" "}
          <a href={LOGIN_HELP_HREF} className="al-link">
            Get help
          </a>
        </p>
      )}
    </section>
  );
}
