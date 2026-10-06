"use client";

import { useEffect, useId, useState, type ComponentType, type InputHTMLAttributes, type ReactNode } from "react";
import { AnimatePresence, m, useAnimate, useReducedMotion } from "motion/react";
import { Eye, EyeOff } from "lucide-react";
import { cn } from "@/lib/utils";
import { errorIn, shake } from "@/lib/motion";

type Icon = ComponentType<{ className?: string; strokeWidth?: number; "aria-hidden"?: boolean }>;

type FieldProps = Omit<InputHTMLAttributes<HTMLInputElement>, "onChange" | "value" | "size"> & {
  label: string;
  value: string;
  onChange: (value: string) => void;
  icon?: Icon;
  /** Shown only when non-empty; the caller decides when (after blur, or after a submit). */
  error?: string;
  hint?: ReactNode;
  /** "floating": the label sits inside the field where a placeholder would be and rises on
   *  focus/fill (sign in/up, matching the boards). "stacked": label above, example placeholder
   *  inside (identity form). Both keep a real, always-visible <label>. */
  labelStyle?: "floating" | "stacked";
  /** Increment on a failed submit: a field that has an error shakes once. */
  shakeSignal?: number;
  trailing?: ReactNode;
};

const shell =
  "relative flex h-14 items-center rounded-button border bg-surface transition-colors duration-200 focus-within:border-primary";

export function TextField({
  label,
  value,
  onChange,
  icon: IconCmp,
  error,
  hint,
  labelStyle = "floating",
  shakeSignal = 0,
  trailing,
  className,
  id: idProp,
  placeholder,
  ...input
}: FieldProps) {
  const auto = useId();
  const id = idProp ?? auto;
  const errorId = `${id}-error`;
  const hintId = `${id}-hint`;
  const [scope, animate] = useAnimate();
  const reduced = useReducedMotion();

  useEffect(() => {
    if (shakeSignal > 0 && error && !reduced && scope.current) void animate(scope.current, { x: shake.x }, shake.transition);
    // Only a new submit attempt should shake, not every re-render with an error.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shakeSignal]);

  const describedBy = [error ? errorId : null, hint ? hintId : null].filter(Boolean).join(" ") || undefined;
  const floating = labelStyle === "floating";

  return (
    <div className={className}>
      {!floating && (
        <label htmlFor={id} className="mb-2 block text-[14px] font-medium text-foreground">
          {label}
        </label>
      )}
      <div ref={scope} className={cn(shell, error ? "border-danger" : "border-field-line")}>
        {IconCmp && <IconCmp className="ml-4 size-5 shrink-0 text-faint" strokeWidth={1.75} aria-hidden />}
        <div className="relative h-full min-w-0 flex-1">
          <input
            id={id}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={floating ? " " : placeholder}
            aria-invalid={error ? true : undefined}
            aria-describedby={describedBy}
            className={cn(
              "peer h-full w-full bg-transparent px-3.5 text-[16px] text-foreground outline-none placeholder:text-faint",
              floating && "pt-4",
              !IconCmp && "pl-4",
            )}
            {...input}
          />
          {floating && (
            <label
              htmlFor={id}
              className={cn(
                "pointer-events-none absolute top-1/2 origin-left -translate-y-1/2 text-[16px] text-faint transition-all duration-200",
                IconCmp ? "left-3.5" : "left-4",
                "peer-focus:top-[14px] peer-focus:text-[12px] peer-focus:text-foreground/80",
                "peer-[:not(:placeholder-shown)]:top-[14px] peer-[:not(:placeholder-shown)]:text-[12px]",
              )}
            >
              {label}
            </label>
          )}
        </div>
        {trailing}
      </div>
      <AnimatePresence initial={false}>
        {error && (
          <m.p
            key="error"
            id={errorId}
            variants={errorIn}
            initial="hidden"
            animate="shown"
            exit="hidden"
            className="mt-1.5 text-[13px] text-danger"
          >
            {error}
          </m.p>
        )}
      </AnimatePresence>
      {hint && !error && (
        <p id={hintId} className="mt-1.5 text-[13px] text-faint">
          {hint}
        </p>
      )}
    </div>
  );
}

export function PasswordField(props: Omit<FieldProps, "type" | "trailing">) {
  const [shown, setShown] = useState(false);
  return (
    <TextField
      {...props}
      type={shown ? "text" : "password"}
      trailing={
        <button
          type="button"
          onClick={() => setShown((v) => !v)}
          aria-pressed={shown}
          // Deliberately not "Show password": the existing e2e sign-in finds the input with
          // getByLabel("Password"), which would also match this button.
          aria-label={shown ? "Hide the characters" : "Show the characters"}
          className="relative mr-1 grid size-11 shrink-0 place-items-center rounded-xl text-faint outline-none hover:text-foreground focus-visible:outline-2 focus-visible:outline-primary"
        >
          <Eye className={cn("absolute size-5 transition-opacity duration-200", shown ? "opacity-0" : "opacity-100")} strokeWidth={1.75} aria-hidden />
          <EyeOff className={cn("absolute size-5 transition-opacity duration-200", shown ? "opacity-100" : "opacity-0")} strokeWidth={1.75} aria-hidden />
        </button>
      }
    />
  );
}

export function TextArea({
  label,
  value,
  onChange,
  maxLength,
  placeholder,
  id: idProp,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  maxLength: number;
  placeholder?: string;
  id?: string;
}) {
  const auto = useId();
  const id = idProp ?? auto;
  return (
    <div>
      <label htmlFor={id} className="mb-2 block text-[14px] font-medium text-foreground">
        {label}
      </label>
      <div className="rounded-button border border-field-line bg-surface transition-colors duration-200 focus-within:border-primary">
        <textarea
          id={id}
          value={value}
          maxLength={maxLength}
          rows={3}
          placeholder={placeholder}
          onChange={(e) => onChange(e.target.value)}
          aria-describedby={`${id}-count`}
          className="block w-full resize-none bg-transparent px-4 pt-3.5 text-[16px] leading-relaxed text-foreground outline-none placeholder:text-faint"
        />
        <p id={`${id}-count`} className="px-4 pb-2.5 text-right text-[12px] text-faint" aria-live="polite">
          {value.length}/{maxLength}
        </p>
      </div>
    </div>
  );
}
