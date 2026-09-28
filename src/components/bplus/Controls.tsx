"use client";

import { useId, type ComponentType, type ReactNode } from "react";
import { m } from "motion/react";
import { Check, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { duration, ease, press, spring } from "@/lib/motion";

type Icon = ComponentType<{ className?: string; strokeWidth?: number; "aria-hidden"?: boolean }>;

/** Custom-drawn box over a real (visually hidden) checkbox: native semantics, keyboard and
 *  form behaviour; the 44px hit area is the whole label row. The check draws itself. */
export function Checkbox({
  checked,
  onChange,
  children,
  error,
  id: idProp,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  children: ReactNode;
  error?: string;
  id?: string;
}) {
  const auto = useId();
  const id = idProp ?? auto;
  return (
    <div>
      <label htmlFor={id} className="flex min-h-11 cursor-pointer items-start gap-3 py-1.5">
        <input
          id={id}
          type="checkbox"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? `${id}-error` : undefined}
          className="peer sr-only"
        />
        <span
          aria-hidden
          className={cn(
            "mt-0.5 grid size-[22px] shrink-0 place-items-center rounded-[6px] border-[1.5px] transition-colors duration-200 peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-primary",
            checked ? "border-primary bg-primary" : error ? "border-danger" : "border-field-line",
          )}
        >
          <svg viewBox="0 0 16 16" className="size-3.5 text-white" fill="none">
            <m.path
              d="M3.5 8.5l3 3 6-7"
              stroke="currentColor"
              strokeWidth={2.25}
              strokeLinecap="round"
              strokeLinejoin="round"
              initial={false}
              animate={{ pathLength: checked ? 1 : 0, opacity: checked ? 1 : 0 }}
              transition={{ duration: duration.base, ease: ease.out }}
            />
          </svg>
        </span>
        <span className="text-[14px] leading-snug text-foreground/90">{children}</span>
      </label>
      {error && (
        <p id={`${id}-error`} className="ml-[34px] text-[13px] text-danger">
          {error}
        </p>
      )}
    </div>
  );
}

/** Native <select> (best on phones: the OS picker), styled like the text fields. */
export function SelectField({
  label,
  value,
  onChange,
  options,
  placeholder,
  icon: IconCmp,
  id: idProp,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: readonly string[];
  placeholder: string;
  icon?: Icon;
  id?: string;
}) {
  const auto = useId();
  const id = idProp ?? auto;
  return (
    <div>
      <label htmlFor={id} className="mb-2 block text-[15px] font-semibold text-foreground">
        {label}
      </label>
      <div className="relative flex h-14 items-center rounded-button border border-field-line bg-surface transition-colors duration-200 focus-within:border-primary">
        {IconCmp && <IconCmp className="pointer-events-none absolute left-4 size-5 text-faint" strokeWidth={1.75} aria-hidden />}
        <select
          id={id}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={cn(
            "h-full w-full appearance-none bg-transparent pr-11 text-[16px] outline-none",
            IconCmp ? "pl-12" : "pl-4",
            value ? "text-foreground" : "text-faint",
          )}
        >
          <option value="">{placeholder}</option>
          {options.map((o) => (
            <option key={o} value={o}>
              {o}
            </option>
          ))}
        </select>
        <ChevronDown className="pointer-events-none absolute right-4 size-5 text-faint" strokeWidth={1.75} aria-hidden />
      </div>
    </div>
  );
}

/** Selectable chip. Visual height 36px; the ::after extends the hit area to 44px. Selection
 *  is shown by colour AND a check, never colour alone. */
export function Chip({
  selected,
  onToggle,
  children,
  icon: IconCmp,
}: {
  selected: boolean;
  onToggle: () => void;
  children: ReactNode;
  icon?: Icon;
}) {
  return (
    <m.button
      type="button"
      aria-pressed={selected}
      onClick={onToggle}
      whileTap={press}
      transition={spring.snappy}
      className={cn(
        "relative inline-flex h-9 items-center gap-1.5 rounded-full border px-3.5 text-[14px] font-medium outline-none transition-colors duration-200 after:absolute after:-inset-y-1 after:inset-x-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary",
        selected ? "border-primary bg-primary/15 text-foreground" : "border-field-line text-foreground/90 hover:border-foreground/60",
      )}
    >
      {selected ? <Check className="size-3.5 text-primary" strokeWidth={2.75} aria-hidden /> : IconCmp ? <IconCmp className="size-4" strokeWidth={1.75} aria-hidden /> : null}
      {children}
    </m.button>
  );
}

export function Toggle({
  checked,
  onChange,
  label,
  description,
  id: idProp,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
  description?: ReactNode;
  id?: string;
}) {
  const auto = useId();
  const id = idProp ?? auto;
  return (
    <div className="flex min-h-11 items-center justify-between gap-4">
      <div className="min-w-0">
        <p id={`${id}-label`} className="text-[15px] text-foreground">
          {label}
        </p>
        {description}
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-labelledby={`${id}-label`}
        onClick={() => onChange(!checked)}
        className={cn(
          "relative h-[31px] w-[51px] shrink-0 rounded-full outline-none transition-colors duration-200 after:absolute after:-inset-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary",
          checked ? "bg-primary" : "bg-field-line",
        )}
      >
        <m.span
          aria-hidden
          className="absolute left-[2px] top-[2px] size-[27px] rounded-full bg-white shadow-sm"
          initial={false}
          animate={{ x: checked ? 20 : 0 }}
          transition={spring.snappy}
        />
      </button>
    </div>
  );
}

/** Honest progress: dots for the eye, "Step n of total" for screen readers. */
export function StepperDots({ step, total }: { step: number; total: number }) {
  return (
    <div className="flex items-center gap-2">
      <span className="sr-only">
        Step {step} of {total}
      </span>
      {Array.from({ length: total }, (_, i) => (
        <span key={i} aria-hidden className="relative block size-2 overflow-hidden rounded-full bg-field-line">
          <m.span
            className="absolute inset-0 rounded-full bg-primary"
            initial={false}
            animate={{ scale: i < step ? 1 : 0 }}
            transition={spring.snappy}
          />
        </span>
      ))}
    </div>
  );
}
