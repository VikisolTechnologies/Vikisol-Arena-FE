"use client";

import { useEffect, useRef, useState, type CSSProperties, type FormEvent, type ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowRight, Briefcase, Building2, Calendar, Camera, Check, ChevronDown, ChevronRight, CircleAlert, Compass, Cpu, Eye, EyeOff, GraduationCap,
  Handshake, HeartHandshake, Lock, Mail, MapPin, MoreHorizontal, Pencil, Rocket, Search, Smartphone, Sparkles, Upload, User, UserPlus, Users, Wrench, X,
} from "lucide-react";
import { authErrorMessage, fieldForServerError, signInWithGoogle, signUp, validateEmail } from "@/lib/data/auth";
import { requestPhoneSignupOtp, verifyPhoneSignupOtp } from "@/lib/api/auth";
import { setDateOfBirth } from "@/lib/api/verification";
import { updateMySkills } from "@/lib/api/profile";
import { clearEntryPending, EMPTY_DRAFT, readCurrentPosition, saveOnboarding, type EntryIntent } from "@/lib/data/onboarding";
import { isAdult } from "@/lib/geo";
import { setOnboarded } from "@/lib/session";
import { AppleIcon, Cta, FieldError, GoogleCircle, GoogleG, IndiaFlag, OtpBoxes, WhatsAppIcon } from "./LoginCard";
import { LOGIN_GOOGLE, LOGIN_MOBILE_OTP } from "./flags";
import { LoginFrame } from "./LoginScreen";

type Step = "start" | "otp" | "about" | "photo" | "location" | "interests" | "details" | "review" | "done";
type CtaState = "idle" | "loading" | "success";

const ORDER: Step[] = ["about", "photo", "location", "interests", "details", "review"];
const INTRO_MAX = 160;
const RESEND_SECONDS = 30;
/** arena-api needs a name to create a phone account; the real one replaces this on the next step. */
const PLACEHOLDER_NAME = "Arena member";
const at = (i: number) => ({ "--i": i }) as CSSProperties;

/** What the person can pick, and the Feed intent each one maps to (the Feed reads intents). */
const INTERESTS: { label: string; icon: ReactNode; intent?: EntryIntent }[] = [
  { label: "Jobs", icon: <Briefcase />, intent: "job" },
  { label: "Hiring", icon: <UserPlus />, intent: "hire" },
  { label: "Networking", icon: <Users />, intent: "meet" },
  { label: "Learning", icon: <GraduationCap />, intent: "ask" },
  { label: "Events", icon: <Calendar />, intent: "activities" },
  { label: "Freelance", icon: <Handshake />, intent: "offer" },
  { label: "Tech", icon: <Cpu /> },
  { label: "Business", icon: <Building2 /> },
  { label: "Startups", icon: <Rocket />, intent: "projects" },
  { label: "Community", icon: <HeartHandshake />, intent: "meet" },
  { label: "Mentorship", icon: <Sparkles />, intent: "offer" },
  { label: "Other", icon: <MoreHorizontal /> },
];

const PASSWORD_RULES: { label: string; test: (v: string) => boolean }[] = [
  { label: "At least 8 characters", test: (v) => v.length >= 8 },
  { label: "Include a number", test: (v) => /\d/.test(v) },
  { label: "Include a special character", test: (v) => /[^A-Za-z0-9]/.test(v) },
];

async function downscale(file: File, size = 256): Promise<string> {
  const bitmap = await createImageBitmap(file);
  const side = Math.min(bitmap.width, bitmap.height);
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("This browser can't prepare the photo.");
  ctx.drawImage(bitmap, (bitmap.width - side) / 2, (bitmap.height - side) / 2, side, side, 0, 0, size, size);
  return canvas.toDataURL("image/jpeg", 0.82);
}

function Progress({ step }: { step: Step }) {
  const index = ORDER.indexOf(step);
  if (index < 0) return null;
  return (
    <ol className="al-progress" aria-label={`Step ${index + 1} of ${ORDER.length}`}>
      {ORDER.map((s, i) => (
        <li key={s} data-on={i <= index || undefined} />
      ))}
    </ol>
  );
}

function Next({ children = "Continue", state = "idle", disabled }: { children?: ReactNode; state?: CtaState; disabled?: boolean }) {
  return (
    <button type="submit" className="al-cta" data-state={state} disabled={disabled || state !== "idle"} aria-busy={state === "loading"}>
      {children}
      <i aria-hidden="true">{state === "loading" ? <span className="al-spin" /> : <ArrowRight />}</i>
    </button>
  );
}

/**
 * Sign-up for a person (`/auth?mode=signup`), built to the approved mockup:
 * start (mobile or email) → OTP (mobile only) → about you → photo → location → interests →
 * review → welcome.
 *
 * Email path: nothing is sent until "Create account" on the review step; then the account is
 * created (name, email, password, date of birth) and the profile answers are saved with the same
 * calls onboarding used. Mobile and Google paths create the account at verification, then save
 * the rest at review. Date of birth is asked because arena-api refuses sign-up without it (18+).
 */
export function SignupFlow({ onBack, onSignIn }: { onBack: () => void; onSignIn: () => void }) {
  const router = useRouter();
  const fileInput = useRef<HTMLInputElement>(null);
  const [step, setStep] = useState<Step>("start");
  const [tab, setTab] = useState<"mobile" | "email">(LOGIN_MOBILE_OTP ? "mobile" : "email");
  const [hasSession, setHasSession] = useState(false);
  const [viaPhone, setViaPhone] = useState(false);
  const [emailLocked, setEmailLocked] = useState(false);
  const [cta, setCta] = useState<CtaState>("idle");
  const [error, setError] = useState("");
  const [note, setNote] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [resendIn, setResendIn] = useState(0);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [dob, setDob] = useState("");
  const [photo, setPhoto] = useState<string | null>(null);
  const [area, setArea] = useState("");
  const [useCurrent, setUseCurrent] = useState(false);
  const [locating, setLocating] = useState(false);
  const [picks, setPicks] = useState<string[]>([]);
  const [query, setQuery] = useState("");
  const [skills, setSkills] = useState("");
  const [intro, setIntro] = useState("");

  const digits = phone.replace(/\D/g, "");
  const e164 = `+91${digits}`;
  const phoneOk = /^[6-9]\d{9}$/.test(digits);
  const today = new Date().toISOString().slice(0, 10);
  const clear = (field: string) => setFieldErrors((f) => (f[field] ? { ...f, [field]: "" } : f));

  useEffect(() => {
    if (resendIn <= 0) return;
    const id = window.setTimeout(() => setResendIn((s) => s - 1), 1000);
    return () => window.clearTimeout(id);
  }, [resendIn]);

  const go = (next: Step) => {
    setError("");
    setNote("");
    setCta("idle");
    setStep(next);
    window.scrollTo({ top: 0 });
  };

  const back = () => {
    if (step === "start") return onBack();
    if (step === "otp") return go("start");
    if (step === "about") return hasSession ? undefined : go("start");
    const i = ORDER.indexOf(step);
    if (i > 0) go(ORDER[i - 1]);
  };
  const canGoBack = !(step === "about" && hasSession) && step !== "done";
  const skipStep = step === "photo" ? () => go("location") : step === "location" ? () => go("interests") : step === "interests" ? () => go("details") : step === "details" ? () => go("review") : undefined;

  const formatPhone = (raw: string) => {
    const d = raw.replace(/\D/g, "").slice(0, 10);
    return d.length > 5 ? `${d.slice(0, 5)} ${d.slice(5)}` : d;
  };

  // ---- start ----
  const sendOtp = async (e?: FormEvent) => {
    e?.preventDefault();
    setError("");
    if (!phoneOk) {
      setFieldErrors({ phone: "Please enter a valid mobile number" });
      document.getElementById("signup-phone")?.focus();
      return;
    }
    setFieldErrors({});
    setCta("loading");
    try {
      await requestPhoneSignupOtp(e164);
      setCode("");
      setResendIn(RESEND_SECONDS);
      go("otp");
    } catch (err) {
      setError(authErrorMessage(err));
      setCta("idle");
    }
  };

  const startEmail = (e: FormEvent) => {
    e.preventDefault();
    const problem = validateEmail(email);
    if (problem) {
      setFieldErrors({ start: problem });
      document.getElementById("signup-start-email")?.focus();
      return;
    }
    setFieldErrors({});
    go("about");
  };

  const onGoogle = async (idToken: string) => {
    setError("");
    setCta("loading");
    try {
      const result = await signInWithGoogle(idToken);
      if (result.status === "mfa_required") {
        setError("This account uses a verification code. Sign in instead.");
        setCta("idle");
        return;
      }
      setHasSession(true);
      setEmailLocked(true);
      setName(result.session.name ?? "");
      setEmail(result.session.email ?? "");
      go("about");
    } catch (err) {
      setError(authErrorMessage(err));
      setCta("idle");
    }
  };

  // ---- otp ----
  const verify = async (e: FormEvent) => {
    e.preventDefault();
    if (code.length !== 6) return;
    setError("");
    setCta("loading");
    try {
      await verifyPhoneSignupOtp(e164, code, PLACEHOLDER_NAME);
      setHasSession(true);
      setViaPhone(true);
      go("about");
    } catch (err) {
      setError(authErrorMessage(err));
      setCta("idle");
    }
  };

  const resend = async () => {
    setError("");
    setCode("");
    try {
      await requestPhoneSignupOtp(e164);
      setResendIn(RESEND_SECONDS);
    } catch (err) {
      setError(authErrorMessage(err));
    }
  };

  // ---- about ----
  const needsPassword = !hasSession;
  const showEmail = !viaPhone;
  const aboutProblems = () => {
    const out: Record<string, string> = {};
    if (!name.trim()) out.name = "Enter your name.";
    if (showEmail && validateEmail(email)) out.email = validateEmail(email);
    if (needsPassword && !PASSWORD_RULES.every((r) => r.test(password))) out.password = password ? "Your password needs all three of the points below." : "Choose a password.";
    if (!dob) out.dob = "Enter your date of birth.";
    else if (dob > today) out.dob = "That date hasn't happened yet.";
    else if (!isAdult(dob)) out.dob = "You must be 18 or older to join Arena.";
    return out;
  };

  const submitAbout = (e: FormEvent) => {
    e.preventDefault();
    const problems = aboutProblems();
    setFieldErrors(problems);
    const first = (["name", "email", "password", "dob"] as const).find((f) => problems[f]);
    if (first) {
      document.getElementById(`signup-${first}`)?.focus();
      return;
    }
    go("photo");
  };

  // ---- photo ----
  const pickPhoto = async (file: File | undefined) => {
    if (!file) return;
    setError("");
    if (!/^image\/(jpeg|png)$/.test(file.type)) return setError("Choose a JPG or PNG photo.");
    if (file.size > 5 * 1024 * 1024) return setError("That photo is over 5MB. Choose a smaller one.");
    try {
      setPhoto(await downscale(file));
    } catch {
      setError("That photo couldn't be read. Try another one.");
    }
  };

  // ---- location ----
  const shareLocation = async () => {
    setError("");
    setLocating(true);
    try {
      await readCurrentPosition();
      setUseCurrent(true);
      setArea("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Location wasn't shared. You can type your area instead.");
    } finally {
      setLocating(false);
    }
  };

  // ---- review / create ----
  const create = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    setCta("loading");
    let created = hasSession;
    try {
      if (!created) {
        await signUp(name.trim(), email.trim(), password, "talent", dob);
        created = true;
        setHasSession(true);
      } else {
        await setDateOfBirth(dob);
      }
    } catch (err) {
      const message = authErrorMessage(err);
      const field = fieldForServerError(message);
      setCta("idle");
      if (field) {
        setStep("about");
        setFieldErrors({ [field]: message });
        window.scrollTo({ top: 0 });
      } else {
        setError(message);
      }
      return;
    }
    try {
      const intents = [...new Set(INTERESTS.filter((i) => picks.includes(i.label) && i.intent).map((i) => i.intent as EntryIntent))];
      await saveOnboarding(
        { ...EMPTY_DRAFT, displayName: name.trim(), area: area.trim(), useCurrentLocation: useCurrent, interests: picks, intents: intents.length ? intents : ["explore"], photo, intro: intro.trim(), dateOfBirth: dob },
        name.trim(),
      );
      const skillList = [...new Set(skills.split(",").map((x) => x.trim()).filter(Boolean))];
      if (skillList.length) await updateMySkills(skillList);
    } catch (err) {
      setCta("idle");
      setError(`Your account is created, but Arena couldn't save your profile details${err instanceof Error && err.message ? `: ${err.message}` : "."} Try again.`);
      return;
    }
    setOnboarded();
    clearEntryPending();
    go("done");
  };

  const mm = String(Math.floor(resendIn / 60)).padStart(2, "0");
  const ss = String(resendIn % 60).padStart(2, "0");
  const notYet = (what: string) => () => setNote(`${what} sign-up isn't available yet. Use your mobile number or email for now.`);
  const locationLabel = useCurrent ? "Current location" : area.trim();

  if (step === "done") {
    return (
      <LoginFrame skip={false} compact footer={false} tone="dusk">
        <div className="al-done al-in" style={at(1)} role="status">
          <span className="al-done-ring" aria-hidden="true">
            <Check />
          </span>
          <h1 className="al-h1">
            Welcome to <em>Arena!</em>
          </h1>
          <p className="al-lede">Your account has been created successfully.</p>
          <ul className="al-done-list">
            <li>
              <Compass aria-hidden="true" /> Explore your neighborhood
            </li>
            <li>
              <Users aria-hidden="true" /> Connect with amazing people
            </li>
            <li>
              <MapPin aria-hidden="true" /> Discover opportunities
            </li>
            <li>
              <UserPlus aria-hidden="true" /> Start building your network
            </li>
          </ul>
          <button type="button" className="al-cta" data-state="idle" onClick={() => router.push("/home")}>
            Take me to Arena
            <i aria-hidden="true">
              <ArrowRight />
            </i>
          </button>
        </div>
      </LoginFrame>
    );
  }

  return (
    <LoginFrame onBack={canGoBack ? back : undefined} skip={step === "start" || step === "otp"} onSkip={skipStep} tone="dusk">
      <Progress step={step} />

      {step === "start" && (
        <>
          <header className="al-head">
            <h1 className="al-h1 al-in" style={at(1)}>
              Create <em>your account</em>
            </h1>
            <p className="al-sub al-in" style={at(2)}>
              Join your neighborhood.
            </p>
          </header>
          <div className="al-in" style={at(3)}>
            <section className="al-card" aria-label="Create your account">
              {LOGIN_MOBILE_OTP && (
                <div className="al-tabs" role="tablist" aria-label="Sign-up method">
                  <button id="signup-tab-mobile" type="button" role="tab" className="al-tab" aria-selected={tab === "mobile"} aria-controls="signup-pane" onClick={() => { setTab("mobile"); setError(""); setNote(""); }}>
                    <Smartphone aria-hidden="true" />
                    <span>
                      <b>Mobile</b>
                      <small>Quick &amp; easy</small>
                    </span>
                  </button>
                  <button id="signup-tab-email" type="button" role="tab" className="al-tab" aria-selected={tab === "email"} aria-controls="signup-pane" onClick={() => { setTab("email"); setError(""); setNote(""); }}>
                    <Mail aria-hidden="true" />
                    <span>
                      <b>Email</b>
                      <small>Use your email</small>
                    </span>
                  </button>
                </div>
              )}
              <div id="signup-pane" key={tab} className="al-pane" role={LOGIN_MOBILE_OTP ? "tabpanel" : undefined} aria-labelledby={LOGIN_MOBILE_OTP ? `signup-tab-${tab}` : undefined}>
                {tab === "mobile" ? (
                  <>
                    <h2 className="al-title">Enter your mobile number</h2>
                    <p className="al-desc">We&apos;ll send you a 6-digit OTP to verify.</p>
                    <form className="al-form" method="post" noValidate onSubmit={sendOtp}>
                      <label htmlFor="signup-phone" className="al-sr">
                        Mobile number
                      </label>
                      <div className="al-field" data-state={fieldErrors.phone ? "error" : undefined}>
                        <span className="al-cc">
                          <IndiaFlag />
                          <span>
                            <span className="al-sr">India </span>+91
                          </span>
                          <ChevronDown aria-hidden="true" />
                        </span>
                        <input id="signup-phone" type="tel" inputMode="numeric" autoComplete="tel-national" placeholder="98765 43210" value={phone} aria-invalid={Boolean(fieldErrors.phone) || undefined} aria-describedby="signup-phone-error" onChange={(e) => { setPhone(formatPhone(e.target.value)); setFieldErrors({}); }} />
                      </div>
                      <FieldError id="signup-phone-error" message={fieldErrors.phone ?? ""} />
                      <FieldError id="signup-error" message={error} />
                      <Cta state={cta} busyLabel="Sending..." doneLabel="OTP sent">
                        Send OTP
                      </Cta>
                    </form>
                  </>
                ) : (
                  <>
                    <h2 className="al-title">Enter your email address</h2>
                    <p className="al-desc">You&apos;ll set a password on the next step.</p>
                    <form className="al-form" method="post" noValidate onSubmit={startEmail}>
                      <label htmlFor="signup-start-email" className="al-sr">
                        Your email
                      </label>
                      <div className="al-field" data-state={fieldErrors.start ? "error" : undefined}>
                        <Mail aria-hidden="true" />
                        <input id="signup-start-email" type="email" inputMode="email" autoComplete="email" autoCapitalize="none" spellCheck={false} placeholder="you@example.com" value={email} aria-invalid={Boolean(fieldErrors.start) || undefined} aria-describedby="signup-start-error" onChange={(e) => { setEmail(e.target.value); setFieldErrors({}); }} />
                        {fieldErrors.start && <CircleAlert className="al-bang" aria-hidden="true" />}
                      </div>
                      <FieldError id="signup-start-error" message={fieldErrors.start ?? ""} />
                      <FieldError id="signup-error" message={error} />
                      <Next />
                    </form>
                  </>
                )}
              </div>
              <div className="al-or">or continue with</div>
              <div className="al-social">
                {LOGIN_GOOGLE ? (
                  <GoogleCircle onCredential={onGoogle} disabled={cta !== "idle"} />
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
                {note}
              </p>
              <p className="al-help">
                Already have an account?{" "}
                <button type="button" className="al-link" onClick={onSignIn}>
                  Sign in
                </button>
              </p>
            </section>
            <p className="al-aside">
              Hiring for a company?{" "}
              <Link href="/auth?mode=signup&as=company" className="al-link">
                Create a company account
              </Link>
            </p>
          </div>
        </>
      )}

      {step === "otp" && (
        <div className="al-recover al-in" style={at(1)}>
          <h1 className="al-h1 al-h1-sm">
            Verify
            <br />
            your number
          </h1>
          <p className="al-lede">
            We&apos;ve sent a 6-digit code to
            <br />
            +91 {digits.slice(0, 5)} {digits.slice(5)}
          </p>
          <form className="al-form al-center" method="post" noValidate onSubmit={verify}>
            <OtpBoxes value={code} onChange={setCode} invalid={Boolean(error)} label="6-digit code" describedBy="signup-error" />
            <FieldError id="signup-error" message={error} />
            <p className="al-resend">
              Didn&apos;t receive the code?
              <br />
              <button type="button" className="al-link" disabled={resendIn > 0} onClick={resend}>
                {resendIn > 0 ? `Resend in ${mm}:${ss}` : "Resend code"}
              </button>
            </p>
            <Next state={cta} disabled={code.length !== 6}>
              {cta === "loading" ? "Verifying..." : "Verify & continue"}
            </Next>
            <button type="button" className="al-link al-link-plain" onClick={() => go("start")}>
              Change number
            </button>
          </form>
        </div>
      )}

      {step === "about" && (
        <div className="al-recover al-in" style={at(1)}>
          <h1 className="al-h2">What&apos;s your name?</h1>
          <p className="al-lede">This is how people will see you in Arena.</p>
          <form className="al-form" method="post" noValidate onSubmit={submitAbout}>
            <label className="al-lfield" data-state={fieldErrors.name ? "error" : undefined}>
              <User aria-hidden="true" />
              <span>
                <small>Full name</small>
                <input id="signup-name" autoComplete="name" value={name} aria-invalid={Boolean(fieldErrors.name) || undefined} aria-describedby="signup-name-error" onChange={(e) => { setName(e.target.value); clear("name"); }} />
              </span>
            </label>
            <FieldError id="signup-name-error" message={fieldErrors.name ?? ""} />
            {showEmail && (
              <>
                <label className="al-lfield" data-state={fieldErrors.email ? "error" : undefined}>
                  <Mail aria-hidden="true" />
                  <span>
                    <small>Email address</small>
                    <input id="signup-email" type="email" inputMode="email" autoComplete="email" autoCapitalize="none" spellCheck={false} value={email} readOnly={emailLocked} aria-invalid={Boolean(fieldErrors.email) || undefined} aria-describedby="signup-email-error" onChange={(e) => { setEmail(e.target.value); clear("email"); }} />
                  </span>
                </label>
                <FieldError id="signup-email-error" message={fieldErrors.email ?? ""} />
              </>
            )}
            {needsPassword && (
              <>
                <label className="al-lfield" data-state={fieldErrors.password ? "error" : undefined}>
                  <Lock aria-hidden="true" />
                  <span>
                    <small>Create a password</small>
                    <input id="signup-password" type={showPassword ? "text" : "password"} autoComplete="new-password" value={password} aria-invalid={Boolean(fieldErrors.password) || undefined} aria-describedby="signup-password-error signup-password-rules" onChange={(e) => { setPassword(e.target.value); clear("password"); }} />
                  </span>
                  <button type="button" className="al-eye" aria-label={showPassword ? "Hide the characters" : "Show the characters"} aria-pressed={showPassword} onClick={() => setShowPassword((v) => !v)}>
                    {showPassword ? <EyeOff aria-hidden="true" /> : <Eye aria-hidden="true" />}
                  </button>
                </label>
                <FieldError id="signup-password-error" message={fieldErrors.password ?? ""} />
                <ul id="signup-password-rules" className="al-rules">
                  {PASSWORD_RULES.map((r) => (
                    <li key={r.label} data-ok={r.test(password) || undefined}>
                      <span aria-hidden="true">
                        <Check />
                      </span>
                      {r.label}
                      <span className="al-sr">{r.test(password) ? " (met)" : " (not met yet)"}</span>
                    </li>
                  ))}
                </ul>
              </>
            )}
            <label className="al-lfield" data-state={fieldErrors.dob ? "error" : undefined}>
              <Calendar aria-hidden="true" />
              <span>
                <small>Date of birth</small>
                <input id="signup-dob" type="date" max={today} autoComplete="bday" value={dob} aria-invalid={Boolean(fieldErrors.dob) || undefined} aria-describedby="signup-dob-error signup-dob-hint" onChange={(e) => { setDob(e.target.value); clear("dob"); }} />
              </span>
            </label>
            <FieldError id="signup-dob-error" message={fieldErrors.dob ?? ""} />
            <p id="signup-dob-hint" className="al-hint">
              Arena connects neighbors in person, so you need to be 18 or older.
            </p>
            <Next />
          </form>
        </div>
      )}

      {step === "photo" && (
        <div className="al-recover al-in" style={at(1)}>
          <h1 className="al-h2">Add a profile photo</h1>
          <p className="al-lede">A photo helps people recognize and connect with you.</p>
          <form className="al-form al-center" method="post" noValidate onSubmit={(e) => { e.preventDefault(); go("location"); }}>
            <input ref={fileInput} type="file" accept="image/jpeg,image/png" hidden onChange={(e) => { void pickPhoto(e.target.files?.[0]); e.target.value = ""; }} />
            <button type="button" className="al-avatar" aria-label={photo ? "Change photo" : "Add a photo"} onClick={() => fileInput.current?.click()}>
              {/* eslint-disable-next-line @next/next/no-img-element -- a local data URL */}
              {photo ? <img src={photo} alt="" /> : <User aria-hidden="true" />}
              <span aria-hidden="true">
                <Camera />
              </span>
            </button>
            <button type="button" className="al-ghost al-ghost-pill" onClick={() => fileInput.current?.click()}>
              <Upload aria-hidden="true" />
              {photo ? "Change photo" : "Upload photo"}
            </button>
            <p className="al-hint al-hint-center">JPG, PNG up to 5MB</p>
            <FieldError id="signup-error" message={error} />
            <Next />
          </form>
        </div>
      )}

      {step === "location" && (
        <div className="al-recover al-in" style={at(1)}>
          <h1 className="al-h2">Where are you located?</h1>
          <p className="al-lede">This helps you discover people, places and opportunities near you.</p>
          <form className="al-form" method="post" noValidate onSubmit={(e) => { e.preventDefault(); go("interests"); }}>
            <label htmlFor="signup-area" className="al-sr">
              Your city or area
            </label>
            <div className="al-field">
              <MapPin aria-hidden="true" />
              <input id="signup-area" autoComplete="address-level2" placeholder="Hyderabad, India" value={useCurrent ? "Using your current location" : area} readOnly={useCurrent} onChange={(e) => setArea(e.target.value)} />
              {(area || useCurrent) && (
                <button type="button" className="al-eye" aria-label="Clear location" onClick={() => { setArea(""); setUseCurrent(false); }}>
                  <X aria-hidden="true" />
                </button>
              )}
            </div>
            <button type="button" className="al-rowbtn" onClick={() => void shareLocation()} disabled={locating}>
              <MapPin aria-hidden="true" />
              <span>{locating ? "Finding you..." : "Use current location"}</span>
              <ChevronRight aria-hidden="true" />
            </button>
            <FieldError id="signup-error" message={error} />
            <p className="al-hint">Your location is only used to show relevant local content.</p>
            <Next />
          </form>
        </div>
      )}

      {step === "interests" && (
        <div className="al-recover al-in" style={at(1)}>
          <h1 className="al-h2">What are you interested in?</h1>
          <p className="al-lede">Choose a few to personalize your experience.</p>
          <form className="al-form" method="post" noValidate onSubmit={(e) => { e.preventDefault(); go("details"); }}>
            <label htmlFor="signup-interest-search" className="al-sr">
              Search interests
            </label>
            <div className="al-field">
              <Search aria-hidden="true" />
              <input id="signup-interest-search" type="search" placeholder="Search interests..." value={query} onChange={(e) => setQuery(e.target.value)} />
            </div>
            <div className="al-chips" role="group" aria-label="Interests">
              {INTERESTS.filter((i) => i.label.toLowerCase().includes(query.trim().toLowerCase())).map((i) => {
                const on = picks.includes(i.label);
                return (
                  <button key={i.label} type="button" className="al-chip" aria-pressed={on} onClick={() => setPicks((p) => (on ? p.filter((x) => x !== i.label) : [...p, i.label]))}>
                    {i.icon}
                    {i.label}
                  </button>
                );
              })}
            </div>
            <Next />
          </form>
        </div>
      )}

      {step === "details" && (
        <div className="al-recover al-in" style={at(1)}>
          <h1 className="al-h2">Add optional details</h1>
          <p className="al-lede">These help us suggest better opportunities for you.</p>
          <form className="al-form" method="post" noValidate onSubmit={(e) => { e.preventDefault(); go("review"); }}>
            <label className="al-lfield">
              <Wrench aria-hidden="true" />
              <span>
                <small>Skills</small>
                <input id="signup-skills" placeholder="For example: design, cooking, Java" value={skills} onChange={(e) => setSkills(e.target.value)} />
              </span>
            </label>
            <p className="al-hint">Separate skills with commas.</p>
            <label className="al-lfield al-lfield-area">
              <User aria-hidden="true" />
              <span>
                <small>About you (optional)</small>
                <textarea id="signup-intro" rows={3} maxLength={INTRO_MAX} placeholder="Tell us about yourself" value={intro} onChange={(e) => setIntro(e.target.value)} />
              </span>
            </label>
            <p className="al-hint">
              {intro.length}/{INTRO_MAX}
            </p>
            <Next />
          </form>
        </div>
      )}

      {step === "review" && (
        <div className="al-recover al-in" style={at(1)}>
          <h1 className="al-h2">Review your details</h1>
          <p className="al-lede">Make sure everything looks good before creating your account.</p>
          <form className="al-form" method="post" noValidate onSubmit={create}>
            <ul className="al-review">
              <li>
                {/* eslint-disable-next-line @next/next/no-img-element -- a local data URL */}
                {photo ? <img src={photo} alt="" /> : <User aria-hidden="true" />}
                <span>{name.trim()}</span>
                <button type="button" className="al-eye" aria-label="Edit name" onClick={() => go("about")}>
                  <Pencil aria-hidden="true" />
                </button>
              </li>
              {showEmail && (
                <li>
                  <Mail aria-hidden="true" />
                  <span>{email.trim()}</span>
                  <button type="button" className="al-link" aria-label="Edit email" onClick={() => go("about")}>
                    Edit
                  </button>
                </li>
              )}
              <li>
                <MapPin aria-hidden="true" />
                <span data-empty={!locationLabel || undefined}>{locationLabel || "No location added"}</span>
                <button type="button" className="al-link" aria-label="Edit location" onClick={() => go("location")}>
                  Edit
                </button>
              </li>
              <li>
                <Sparkles aria-hidden="true" />
                <span data-empty={!picks.length || undefined}>{picks.length ? picks.join(", ") : "No interests chosen"}</span>
                <button type="button" className="al-link" aria-label="Edit interests" onClick={() => go("interests")}>
                  Edit
                </button>
              </li>
              {(skills.trim() || intro.trim()) && (
                <li>
                  <Wrench aria-hidden="true" />
                  <span>{skills.trim() || intro.trim()}</span>
                  <button type="button" className="al-link" aria-label="Edit details" onClick={() => go("details")}>
                    Edit
                  </button>
                </li>
              )}
            </ul>
            <p className="al-terms">
              By creating an account, you agree to our{" "}
              <Link href="/terms" target="_blank" rel="noopener noreferrer" className="al-link">
                Terms of Service
              </Link>{" "}
              and{" "}
              <Link href="/privacy" target="_blank" rel="noopener noreferrer" className="al-link">
                Privacy Policy
              </Link>
              .
            </p>
            <FieldError id="signup-error" message={error} />
            <Next state={cta}>{cta === "loading" ? "Creating your account..." : "Create account"}</Next>
          </form>
        </div>
      )}
    </LoginFrame>
  );
}
