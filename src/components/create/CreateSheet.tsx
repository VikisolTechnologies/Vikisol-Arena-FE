"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type ComponentType } from "react";
import { AnimatePresence, m } from "motion/react";
import { Briefcase, ChevronLeft, ChevronRight, Gift, Heart, Leaf, Sparkles, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import { rise, pageSlide, vibrate } from "@/lib/motion";
import { BottomSheet } from "@/components/bplus/BottomSheet";
import { Button, ButtonLink } from "@/components/bplus/Button";
import { useGuest, useSessionRole } from "@/hooks/use-arena-session";
import { createPost } from "@/lib/api/posts";
import { createMyProject } from "@/lib/api/myProjects";

type Icon = ComponentType<{ className?: string; strokeWidth?: number; "aria-hidden"?: boolean }>;
type Kind = "offer" | "activity" | "project";

const ROWS: { id: Kind | "ask" | "job" | "jenny"; title: string; detail: string; icon: Icon; disc: string }[] = [
  { id: "ask", title: "Post a Need", detail: "Get help from nearby people", icon: Heart, disc: "bg-primary" },
  { id: "offer", title: "Make an Offer", detail: "Share what you can give", icon: Gift, disc: "bg-success" },
  { id: "activity", title: "Create an Activity", detail: "Bring people together", icon: Users, disc: "bg-info" },
  { id: "project", title: "Start a Project", detail: "Collaborate for a bigger impact", icon: Leaf, disc: "bg-success" },
  { id: "job", title: "Post a Job", detail: "Find local talent", icon: Briefcase, disc: "bg-primary" },
  { id: "jenny", title: "Ask Jenny", detail: "Get ideas, draft a post, or find the right people", icon: Sparkles, disc: "bg-[linear-gradient(135deg,var(--primary),var(--primary-soft))]" },
];

const PROMPT: Record<Kind, { title: string; label: string; placeholder: string }> = {
  offer: { title: "Make an Offer", label: "What can you offer?", placeholder: "e.g. Home-cooked meals for two this Saturday" },
  activity: { title: "Create an Activity", label: "What are you organising?", placeholder: "e.g. Sunrise run at Durgam Lake, all levels" },
  project: { title: "Start a Project", label: "What's the project?", placeholder: "e.g. A community garden on our street" },
};

/** Board: "What do you want to make happen?" — six options. Post a Need opens its full form
 *  (`/needs/new`); Offer/Activity/Project keep a short, real composer on the existing endpoints. */
export function CreateSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const router = useRouter();
  const guest = useGuest();
  const role = useSessionRole();
  const [kind, setKind] = useState<Kind | null>(null);

  const choose = (id: (typeof ROWS)[number]["id"]) => {
    if (id === "jenny") {
      onClose();
      router.push("/agent");
      return;
    }
    if (id === "ask") {
      onClose();
      router.push("/needs/new");
      return;
    }
    if (id === "job") {
      onClose();
      router.push(role === "company_admin" || role === "recruiter" ? "/enterprise/postings" : "/identity");
      return;
    }
    setKind(id);
  };

  return (
    <BottomSheet open={open} onClose={onClose} title="Create">
      <AnimatePresence mode="wait" initial={false} custom={kind ? 1 : -1}>
        {kind ? (
          <m.div key="compose" custom={1} variants={pageSlide} initial="enter" animate="center" exit="exit">
            <Composer kind={kind} guest={guest !== false} onBack={() => setKind(null)} onDone={(href) => { onClose(); router.push(href); }} />
          </m.div>
        ) : (
          <m.div key="menu" custom={-1} variants={pageSlide} initial="enter" animate="center" exit="exit">
            <h2 className="mt-3 pr-12 font-display-serif text-[30px] font-medium leading-[1.1]">What do you want to make happen?</h2>
            <p className="mt-2 text-[15px] text-paper-ink-muted">A small step can create a big ripple nearby.</p>
            <m.ul initial="hidden" animate="shown" className="mt-6 space-y-2.5">
              {ROWS.map((row, i) => {
                const IconCmp = row.icon;
                return (
                  <m.li key={row.id} variants={rise} custom={i}>
                    <button
                      type="button"
                      onClick={() => choose(row.id)}
                      className="flex w-full items-center gap-3.5 rounded-tile bg-paper-muted p-3.5 text-left outline-none transition-transform duration-120 active:scale-[0.97] focus-visible:outline-2 focus-visible:outline-primary"
                    >
                      <span className={cn("grid size-12 shrink-0 place-items-center rounded-full text-white", row.disc)}>
                        <IconCmp className="size-6" strokeWidth={1.9} aria-hidden />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block text-[17px] font-semibold">{row.title}</span>
                        <span className="block text-[13px] text-paper-ink-muted">{row.detail}</span>
                      </span>
                      <ChevronRight className="size-5 shrink-0 text-paper-ink-muted" strokeWidth={1.75} aria-hidden />
                    </button>
                  </m.li>
                );
              })}
            </m.ul>
          </m.div>
        )}
      </AnimatePresence>
    </BottomSheet>
  );
}

function Composer({ kind, guest, onBack, onDone }: { kind: Kind; guest: boolean; onBack: () => void; onDone: (href: string) => void }) {
  const prompt = PROMPT[kind];
  const [text, setText] = useState("");
  const [budgetMin, setBudgetMin] = useState("");
  const [budgetMax, setBudgetMax] = useState("");
  const [weeks, setWeeks] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  const publish = async () => {
    setError("");
    if (text.trim().length < 3) return setError("Add a few words so neighbours know what this is.");
    setBusy(true);
    try {
      if (kind === "project") {
        const min = Number(budgetMin);
        const max = Number(budgetMax);
        const durationWeeks = Number(weeks);
        if (!(min >= 0) || !(max >= min) || !(durationWeeks >= 1)) {
          setBusy(false);
          return setError("Enter a minimum budget, a maximum at least that high, and a duration in weeks.");
        }
        const project = await createMyProject({ title: text.trim().slice(0, 80), description: text.trim(), budgetMin: min, budgetMax: max, durationWeeks, skills: [] });
        setDone(true);
        vibrate();
        window.setTimeout(() => onDone(`/marketplace/${project.id}`), 380);
        return;
      }
      const post = await createPost({ intentType: kind, body: text.trim(), title: text.trim().slice(0, 80), audience: "global", visibility: "public" });
      setDone(true);
      vibrate();
      window.setTimeout(() => onDone(`/feed/${post.id}`), 380);
    } catch (err) {
      setError(err instanceof Error && err.message ? err.message : "That didn't publish. Nothing was posted — try again.");
      setBusy(false);
    }
  };

  const field = "w-full rounded-button border border-paper-ink/55 bg-white px-4 py-3 text-[16px] text-paper-ink outline-none placeholder:text-paper-ink-muted focus:border-primary-on-paper";

  return (
    <div className="pt-1">
      <button type="button" onClick={onBack} className="-ml-2.5 grid size-11 place-items-center rounded-full outline-none hover:bg-paper-muted focus-visible:outline-2 focus-visible:outline-primary" aria-label="Back to options">
        <ChevronLeft className="size-6" strokeWidth={1.75} aria-hidden />
      </button>
      <h2 className="mt-1 font-display-serif text-[28px] font-medium">{prompt.title}</h2>
      {guest ? (
        <div className="mt-4">
          <p className="text-[15px] text-paper-ink-muted">Sign in to post. Browsing stays open to everyone.</p>
          <ButtonLink href="/auth?mode=signin" className="mt-5">Sign in</ButtonLink>
          <Link href="/auth?mode=signup" className="mt-2 flex min-h-11 items-center justify-center text-[15px] font-semibold text-primary-on-paper">Create an account</Link>
        </div>
      ) : (
        <div className="mt-4 space-y-4">
          <label className="block">
            <span className="mb-2 block text-[14px] font-medium">{prompt.label}</span>
            <textarea value={text} onChange={(e) => setText(e.target.value)} rows={4} maxLength={1000} placeholder={prompt.placeholder} className={cn(field, "resize-none leading-relaxed")} />
          </label>
          {kind === "project" && (
            <div className="grid grid-cols-3 gap-2">
              <label className="text-[13px] font-medium">Min budget (₹)<input inputMode="numeric" value={budgetMin} onChange={(e) => setBudgetMin(e.target.value)} className={cn(field, "mt-1.5")} /></label>
              <label className="text-[13px] font-medium">Max budget (₹)<input inputMode="numeric" value={budgetMax} onChange={(e) => setBudgetMax(e.target.value)} className={cn(field, "mt-1.5")} /></label>
              <label className="text-[13px] font-medium">Weeks<input inputMode="numeric" value={weeks} onChange={(e) => setWeeks(e.target.value)} className={cn(field, "mt-1.5")} /></label>
            </div>
          )}
          <p className="text-[13px] text-paper-ink-muted">Shown to nearby people. Your exact location is never shared.</p>
          {error && <p role="alert" className="rounded-xl bg-danger/12 px-3.5 py-2.5 text-[14px] text-paper-ink">{error}</p>}
          <Button onClick={publish} loading={busy && !done} success={done}>Post</Button>
        </div>
      )}
    </div>
  );
}
