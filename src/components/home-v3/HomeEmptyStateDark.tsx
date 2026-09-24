import Link from "next/link";
import { Users, HelpCircle, Briefcase, MessageCircle, type LucideIcon } from "lucide-react";
import type { Post } from "@/lib/types";

// Dark re-theme of the shared HomeEmptyState - forked rather than edited in place because that
// component is also used by /map (still on the light theme, out of scope for this pass). Same
// real content and behavior (same four real intents, same real "no fake activity" rule), just
// var(--card)/var(--border)/var(--primary) instead of white cards on an ivory page.
const SUGGESTIONS: { icon: LucideIcon; label: string; description: string; intent?: Exclude<Post["intentType"], "company">; href?: string }[] = [
  { icon: Users, label: "An activity", description: "Something happening at a time and place", intent: "activity" },
  { icon: HelpCircle, label: "A need", description: "Ask for help, skills or people", intent: "ask" },
  { icon: Briefcase, label: "A project or job", description: "Paid work others can bid on", href: "/marketplace" },
  { icon: MessageCircle, label: "An update", description: "Share something with your network", intent: "update" },
];

export function HomeEmptyStateDark({
  headline,
  description,
  primaryActionLabel,
  onPrimaryAction,
  onStartIntent,
}: {
  headline: string;
  description: string;
  primaryActionLabel: string;
  onPrimaryAction: () => void;
  onStartIntent: (intent: Exclude<Post["intentType"], "company">) => void;
}) {
  return (
    <div className="mb-3">
      <div
        className="mb-3.5 rounded-2xl px-5 py-6 text-center"
        style={{ background: "var(--card)", border: "1px solid var(--border)" }}
      >
        <p className="mb-2 text-[15px] font-medium" style={{ color: "var(--foreground)" }}>{headline}</p>
        <p className="mb-4.5 text-[13px] leading-relaxed" style={{ color: "var(--muted-foreground)" }}>{description}</p>
        <button
          type="button"
          onClick={onPrimaryAction}
          className="rounded-full px-6 py-2.5 text-[13px] font-semibold"
          style={{ background: "var(--primary)", color: "var(--primary-foreground)" }}
        >
          {primaryActionLabel}
        </button>
      </div>

      <p className="mb-2 pl-0.5 text-[10px] tracking-[3px]" style={{ color: "var(--muted-foreground)" }}>OR START SOMETHING</p>
      {SUGGESTIONS.map((s) => {
        const Icon = s.icon;
        const content = (
          <div className="flex items-center gap-3">
            <Icon size={21} strokeWidth={1.75} color="var(--foreground)" className="shrink-0" />
            <div className="min-w-0 flex-1">
              <p className="text-[14px]" style={{ color: "var(--foreground)" }}>{s.label}</p>
              <p className="mt-0.5 text-[12px]" style={{ color: "var(--muted-foreground)" }}>{s.description}</p>
            </div>
          </div>
        );
        const shellClass = "mb-2.5 block rounded-2xl p-4";
        const shellStyle = { background: "var(--card)", border: "1px solid var(--border)" };
        return s.href ? (
          <Link key={s.label} href={s.href} className={shellClass} style={shellStyle}>
            {content}
          </Link>
        ) : (
          <button
            key={s.label}
            type="button"
            onClick={() => onStartIntent(s.intent!)}
            className={`${shellClass} w-full text-left`}
            style={shellStyle}
          >
            {content}
          </button>
        );
      })}
    </div>
  );
}
