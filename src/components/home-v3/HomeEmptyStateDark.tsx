// Dark re-theme of the shared HomeEmptyState - forked rather than edited in place because that
// component is also used by /map (still on the light theme, out of scope for this pass).
//
// Deliberately smaller than the original: that version repeated the four "start something"
// intents as a full card list right below the primary button - redundant with the "+" already
// sitting in the sidebar/tab bar, and too heavy to be the first thing a visitor sees before any
// real content. This keeps just the one message and the one real action.
export function HomeEmptyStateDark({
  headline,
  description,
  primaryActionLabel,
  onPrimaryAction,
}: {
  headline: string;
  description: string;
  primaryActionLabel: string;
  onPrimaryAction: () => void;
}) {
  return (
    <div
      className="mb-3 rounded-2xl px-5 py-6 text-center"
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
  );
}
