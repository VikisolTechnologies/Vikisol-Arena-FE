import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api/httpClient";

/** An industry is a plain string everywhere (the label, e.g. "Engineering"). The list is staff-managed. */
export type IndustryOption = { key: string; label: string };

/** Fallback shown until GET /public/industries (active only, in display order) loads. */
export const PREVIEW_INDUSTRIES: IndustryOption[] = ["Engineering", "Design", "Sales", "Healthcare", "Logistics"].map((label) => ({ key: label.toUpperCase(), label }));

let cached: Promise<IndustryOption[]> | null = null;

export function loadIndustries(): Promise<IndustryOption[]> {
  cached ??= apiFetch<IndustryOption[]>("/public/industries", { auth: false }).catch((err) => {
    cached = null; // retry next time rather than remembering a failure
    throw err;
  });
  return cached;
}

/** Labels to offer in a picker. A retired value that a record already has is kept (shown as-is) so it doesn't vanish. */
export function withCurrent(labels: string[], current?: string): string[] {
  return current && !labels.some((l) => l.toLowerCase() === current.toLowerCase()) ? [...labels, current] : labels;
}

/** Picker options: active industries, plus `current` when it has since been retired. Preview values until the list loads. */
export function useIndustries(current?: string): string[] {
  const [labels, setLabels] = useState<string[]>(PREVIEW_INDUSTRIES.map((i) => i.label));
  useEffect(() => {
    let live = true;
    loadIndustries()
      .then((all) => live && setLabels(all.map((i) => i.label)))
      .catch(() => {});
    return () => {
      live = false;
    };
  }, []);
  return withCurrent(labels, current);
}
