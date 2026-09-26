import Link from "next/link";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function ArenaMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={cn("size-8 shrink-0", className)} aria-hidden>
      <path fill="#ff6b35" d="M16 2.5 29.5 28h-6.2L16 12.2 8.7 28H2.5L16 2.5Z" />
      <path fill="#ffb38a" d="M16 14.2 20.6 24h-9.2L16 14.2Z" />
    </svg>
  );
}

export function ArenaBrand({ href = "/auth", className }: { href?: string; className?: string }) {
  return (
    <Link href={href} className={cn("inline-flex min-h-11 items-center gap-2 self-start", className)}>
      <ArenaMark />
      <span className="font-display text-lg font-semibold tracking-tight">Arena</span>
    </Link>
  );
}

export function EntryShell({
  children,
  aside,
  wide,
}: {
  children: ReactNode;
  aside?: ReactNode;
  wide?: boolean;
}) {
  return (
    <div className="min-h-svh bg-background text-foreground">
      <div
        className={cn(
          "mx-auto flex min-h-svh w-full flex-col px-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-[max(1rem,env(safe-area-inset-top))]",
          wide ? "max-w-5xl lg:flex-row lg:items-center lg:gap-14 lg:px-10" : "max-w-lg",
        )}
      >
        {aside && <div className="mb-8 hidden lg:block lg:mb-0 lg:flex-1">{aside}</div>}
        <div className={cn("flex min-w-0 flex-1 flex-col", wide && "lg:max-w-[26rem]")}>{children}</div>
      </div>
    </div>
  );
}

export function EntryHero({ title, lede }: { title: string; lede?: string }) {
  return (
    <header className="max-w-[22rem]">
      <h1 className="font-editorial text-[1.7rem] font-medium leading-[1.15] tracking-tight">{title}</h1>
      {lede && <p className="mt-2 text-[15px] leading-relaxed text-muted-foreground">{lede}</p>}
    </header>
  );
}

export function EntryCard({ children, className, ivory }: { children: ReactNode; className?: string; ivory?: boolean }) {
  return (
    <section
      className={cn(
        "rounded-[24px] border p-4 shadow-[0_10px_28px_rgba(0,0,0,0.28)] motion-safe:animate-[entry-sheet_260ms_ease]",
        ivory ? "border-[#e4d8c8] bg-[#f4efe6] text-[#1c140f]" : "border-white/10 bg-[#16161a]",
        className,
      )}
    >
      {children}
    </section>
  );
}

export const entryFieldClass =
  "h-11 w-full rounded-2xl border border-white/12 bg-[#1c1c21] px-3 text-sm text-foreground outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary";

export function EntryField({
  id,
  label,
  value,
  onChange,
  type = "text",
  autoComplete,
  placeholder,
  inputMode,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  autoComplete?: string;
  placeholder?: string;
  inputMode?: "text" | "email" | "numeric";
}) {
  return (
    <label className="block text-[13px] font-medium" htmlFor={id}>
      {label}
      <input
        id={id}
        type={type}
        autoComplete={autoComplete}
        placeholder={placeholder}
        inputMode={inputMode}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={`${entryFieldClass} mt-1.5`}
      />
    </label>
  );
}

export function PasswordField({
  id,
  label,
  value,
  onChange,
  shown,
  onToggle,
  autoComplete,
  hint,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  shown: boolean;
  onToggle: () => void;
  autoComplete: string;
  hint?: string;
}) {
  return (
    <div>
      <label className="text-[13px] font-medium" htmlFor={id}>{label}</label>
      <div className="relative mt-1.5">
        <input
          id={id}
          type={shown ? "text" : "password"}
          autoComplete={autoComplete}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={`${entryFieldClass} pr-16`}
        />
        <button
          type="button"
          aria-pressed={shown}
          onClick={onToggle}
          className="absolute inset-y-1 right-1 min-h-11 min-w-11 rounded-xl px-2 text-[13px] text-muted-foreground"
        >
          {shown ? "Hide" : "Show"}
        </button>
      </div>
      {hint && <p className="mt-1.5 text-[13px] text-muted-foreground">{hint}</p>}
    </div>
  );
}

export function StepProgress({ step, steps, label }: { step: number; steps: number; label: string }) {
  return (
    <div className="mb-4" aria-label={`Step ${step + 1} of ${steps}: ${label}`}>
      <p className="text-[13px] text-muted-foreground">Step {step + 1} of {steps}</p>
      <div className="mt-2 flex gap-1.5">
        {Array.from({ length: steps }, (_, i) => (
          <span
            key={i}
            className={cn("h-1.5 flex-1 rounded-full transition-colors duration-150", i < step ? "bg-primary" : i === step ? "bg-primary-soft" : "bg-white/12")}
          />
        ))}
      </div>
    </div>
  );
}

function Glyph({ d }: { d: string }) {
  return (
    <svg viewBox="0 0 24 24" className="size-5 shrink-0" fill="none" aria-hidden>
      <path d={d} stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function IntentOption({
  on,
  label,
  detail,
  icon,
  onClick,
}: {
  on: boolean;
  label: string;
  detail?: string;
  icon: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-pressed={on}
      onClick={onClick}
      className={cn(
        "flex min-h-11 w-full items-start gap-2.5 rounded-2xl border px-3 py-2.5 text-left transition-[background-color,border-color,transform] duration-150 motion-reduce:transition-none motion-reduce:active:scale-100 active:scale-[0.98]",
        "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary",
        on ? "border-primary/80 bg-[#2a1812] text-foreground" : "border-white/10 bg-[#1c1c21]",
      )}
    >
      <span className={cn("mt-0.5", on ? "text-primary-soft" : "text-muted-foreground")}><Glyph d={icon} /></span>
      <span className="min-w-0">
        <span className="block text-[13px] font-medium leading-snug">{label}</span>
        {detail && <span className="mt-0.5 block text-[13px] leading-snug text-muted-foreground">{detail}</span>}
      </span>
      <span className={cn("ml-auto mt-0.5 grid size-5 shrink-0 place-items-center rounded-full border text-[11px]", on ? "border-primary bg-primary text-primary-foreground" : "border-white/20")} aria-hidden>
        {on ? "✓" : ""}
      </span>
    </button>
  );
}

export function WelcomeComposition() {
  const cards = [
    { title: "Activities", detail: "Games, walks, and gatherings people post." },
    { title: "Needs", detail: "Ask for help, or offer something you can do." },
    { title: "Work", detail: "Only when you decide to look." },
  ];
  return (
    <div className="rounded-[28px] border border-white/10 bg-[#121214] p-4 shadow-[0_16px_40px_rgba(0,0,0,0.35)]">
      <p className="font-editorial text-[1.35rem] leading-tight text-[#f4efe6]">A kinder neighborhood starts with one real thing.</p>
      <div className="mt-3 grid gap-1.5">
        {cards.map((card) => (
          <div key={card.title} className="rounded-2xl border border-white/10 bg-[#1c1c21] px-3 py-2">
            <p className="text-[13px] font-medium text-primary-soft">{card.title}</p>
            <p className="mt-1 text-[13px] leading-snug text-muted-foreground">{card.detail}</p>
          </div>
        ))}
      </div>
      <p className="mt-3 text-[13px] text-muted-foreground">Nothing here is a live post. Arena shows people and activities only after someone publishes them.</p>
    </div>
  );
}

export function PrivacyPreviewCard({
  name,
  location,
  skills,
  careerPublic,
  onCareer,
}: {
  name: string;
  location: string;
  skills: string;
  careerPublic: boolean;
  onCareer: (value: boolean) => void;
}) {
  return (
    <EntryCard ivory>
      <p className="text-[13px] font-medium uppercase tracking-[0.14em] text-[#8a5a3a]">What nearby people see</p>
      <p className="mt-2 font-editorial text-[1.6rem] leading-tight">{name}</p>
      <dl className="mt-4 space-y-3 text-[13px]">
        <div>
          <dt className="font-medium">Visible now</dt>
          <dd className="mt-1 text-[#5c5148]">{location}</dd>
          <dd className="text-[#5c5148]">{skills}</dd>
        </div>
        <div>
          <dt className="font-medium">Private</dt>
          <dd className="mt-1 text-[#5c5148]">Your introduction, availability, interests, and photo are not published. There is no profile field for them yet.</dd>
        </div>
        <div>
          <dt className="font-medium">After you turn career on</dt>
          <dd className="mt-1 text-[#5c5148]">{careerPublic ? "Career information will be visible to companies because you turned that on." : "Career information stays private."}</dd>
        </div>
      </dl>
      <label className="mt-4 flex min-h-11 items-center justify-between gap-3 rounded-2xl bg-white/70 px-3 text-[13px]">
        <span>Let companies see career information</span>
        <input type="checkbox" checked={careerPublic} onChange={(e) => onCareer(e.target.checked)} className="size-5" />
      </label>
    </EntryCard>
  );
}

export function ReadySummary({
  intents,
  location,
  priority,
}: {
  intents: string[];
  location: string;
  priority: string;
}) {
  return (
    <div className="space-y-3">
      <EntryCard>
        <p className="text-[13px] font-medium text-primary-soft">What you chose</p>
        <p className="mt-2 text-[15px] leading-relaxed">{intents.length ? intents.join(" · ") : "No focus yet. Arena will stay balanced."}</p>
        <p className="mt-3 text-[13px] text-muted-foreground">{location}</p>
      </EntryCard>
      <EntryCard>
        <p className="text-[13px] font-medium text-primary-soft">What Arena will look for</p>
        <p className="mt-2 text-[15px] leading-relaxed">{priority}</p>
        <p className="mt-3 text-[13px] leading-relaxed text-muted-foreground">Career information stays private until you turn it on. Arena will not invent people, activities, or a job title to fill the feed.</p>
      </EntryCard>
    </div>
  );
}

export function HonestEmptyState({
  title,
  detail,
  showArea,
}: {
  title: string;
  detail: string;
  showArea: boolean;
}) {
  return (
    <EntryCard>
      <div className="mx-auto grid size-12 place-items-center rounded-2xl bg-[#2a1812] text-primary-soft" aria-hidden>
        <Glyph d="M4 18 V8 M4 18 H20 M8 18 V11 M12 18 V6 M16 18 V13" />
      </div>
      <p className="mt-4 text-center font-editorial text-[1.45rem] leading-tight">{title}</p>
      <p className="mx-auto mt-2 max-w-sm text-center text-[15px] leading-relaxed text-muted-foreground">{detail}</p>
      <div className="mt-5 grid gap-2">
        <Link href="/discover" className="inline-flex min-h-11 items-center justify-center rounded-full bg-primary px-4 text-sm font-semibold text-primary-foreground">Discover nearby</Link>
        <button
          type="button"
          className="inline-flex min-h-11 items-center justify-center rounded-full border border-white/15 px-4 text-sm font-semibold"
          onClick={() => window.dispatchEvent(new Event("arena-open-create"))}
        >
          Create the first activity or need
        </button>
        {showArea && (
          <Link href="/onboarding" className="inline-flex min-h-11 items-center justify-center text-[13px] text-muted-foreground underline-offset-4 hover:underline">
            Add your area
          </Link>
        )}
      </div>
    </EntryCard>
  );
}
