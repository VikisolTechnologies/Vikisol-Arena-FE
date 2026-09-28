"use client";

import { useEffect, useId, type ComponentType, type ReactNode } from "react";
import { AnimatePresence, m, useAnimate, useReducedMotion } from "motion/react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { errorIn, shake } from "@/lib/motion";

type Icon = ComponentType<{ className?: string; strokeWidth?: number; "aria-hidden"?: boolean }>;

/** Form fields for cream (paper) surfaces — the boards' Post a Need / Mark as completed forms.
 *  Same behaviour as the kit's dark fields: real labels, error after blur, one shake per failed
 *  submit. White field on cream; border ≥3:1. */
const box = "relative flex items-center rounded-button border bg-white transition-colors duration-200 focus-within:border-primary-on-paper";

function FieldError({ id, error }: { id: string; error?: string }) {
  return (
    <AnimatePresence initial={false}>
      {error && (
        <m.p key="e" id={id} variants={errorIn} initial="hidden" animate="shown" exit="hidden" className="mt-1.5 text-[13px] text-danger-on-paper">
          {error}
        </m.p>
      )}
    </AnimatePresence>
  );
}

function useShake(signal: number, error?: string) {
  const [scope, animate] = useAnimate();
  const reduced = useReducedMotion();
  useEffect(() => {
    if (signal > 0 && error && !reduced && scope.current) void animate(scope.current, { x: shake.x }, shake.transition);
    // Only a new submit attempt shakes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [signal]);
  return scope;
}

export function PaperInput({
  label,
  value,
  onChange,
  onBlur,
  icon: IconCmp,
  maxLength,
  placeholder,
  error,
  hint,
  shakeSignal = 0,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  onBlur?: () => void;
  icon?: Icon;
  maxLength?: number;
  placeholder?: string;
  error?: string;
  hint?: ReactNode;
  shakeSignal?: number;
}) {
  const id = useId();
  const scope = useShake(shakeSignal, error);
  const described = [error && `${id}-e`, hint && `${id}-h`, maxLength && `${id}-c`].filter(Boolean).join(" ") || undefined;
  return (
    <div>
      <label htmlFor={id} className="mb-2 block text-[15px] font-semibold">{label}</label>
      <div ref={scope} className={cn(box, "h-[52px]", error ? "border-danger-on-paper" : "border-field-line")}>
        {IconCmp && <IconCmp className="ml-4 size-5 shrink-0 text-paper-ink-muted" strokeWidth={1.75} aria-hidden />}
        <input
          id={id}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onBlur={onBlur}
          maxLength={maxLength}
          placeholder={placeholder}
          aria-invalid={error ? true : undefined}
          aria-describedby={described}
          className={cn("h-full min-w-0 flex-1 bg-transparent pr-4 text-[16px] text-paper-ink outline-none placeholder:text-paper-ink-muted", IconCmp ? "pl-3" : "pl-4")}
        />
      </div>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <FieldError id={`${id}-e`} error={error} />
          {hint && !error && <p id={`${id}-h`} className="mt-1.5 text-[13px] text-paper-ink-muted">{hint}</p>}
        </div>
        {maxLength && <p id={`${id}-c`} className="mt-1.5 shrink-0 text-[12px] text-paper-ink-muted">{value.length}/{maxLength}</p>}
      </div>
    </div>
  );
}

export function PaperTextArea({ label, value, onChange, maxLength, placeholder }: { label: string; value: string; onChange: (v: string) => void; maxLength: number; placeholder?: string }) {
  const id = useId();
  return (
    <div>
      <label htmlFor={id} className="mb-2 block text-[15px] font-semibold">{label}</label>
      <div className={cn(box, "block border-field-line")}>
        <textarea
          id={id}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          maxLength={maxLength}
          rows={3}
          placeholder={placeholder}
          aria-describedby={`${id}-c`}
          className="block w-full resize-none bg-transparent px-4 pt-3 text-[16px] leading-relaxed text-paper-ink outline-none placeholder:text-paper-ink-muted"
        />
        <p id={`${id}-c`} className="px-4 pb-2 text-right text-[12px] text-paper-ink-muted">{value.length}/{maxLength}</p>
      </div>
    </div>
  );
}

export function PaperSelect({
  label,
  value,
  onChange,
  onBlur,
  options,
  placeholder,
  icon: IconCmp,
  error,
  hint,
  shakeSignal = 0,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  onBlur?: () => void;
  options: readonly { value: string; label: string }[];
  placeholder?: string;
  icon?: Icon;
  error?: string;
  hint?: ReactNode;
  shakeSignal?: number;
}) {
  const id = useId();
  const scope = useShake(shakeSignal, error);
  const described = [error && `${id}-e`, hint && `${id}-h`].filter(Boolean).join(" ") || undefined;
  return (
    <div>
      <label htmlFor={id} className="mb-2 block text-[15px] font-semibold">{label}</label>
      <div ref={scope} className={cn(box, "h-[52px]", error ? "border-danger-on-paper" : "border-field-line")}>
        {IconCmp && <IconCmp className="pointer-events-none absolute left-4 size-5 text-paper-ink-muted" strokeWidth={1.75} aria-hidden />}
        <select
          id={id}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onBlur={onBlur}
          aria-invalid={error ? true : undefined}
          aria-describedby={described}
          className={cn("h-full w-full appearance-none bg-transparent pr-11 text-[16px] outline-none", IconCmp ? "pl-12" : "pl-4", value ? "text-paper-ink" : "text-paper-ink-muted")}
        >
          {placeholder && <option value="">{placeholder}</option>}
          {options.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
        <ChevronDown className="pointer-events-none absolute right-4 size-5 text-paper-ink-muted" strokeWidth={1.75} aria-hidden />
      </div>
      <FieldError id={`${id}-e`} error={error} />
      {hint && !error && <p id={`${id}-h`} className="mt-1.5 text-[13px] text-paper-ink-muted">{hint}</p>}
    </div>
  );
}
