/** Shared formatting helpers (ARENA-DEEP-AUDIT.md Phase 3) - consolidates what was 17
 * independent, inconsistent ad-hoc implementations across the app (some used
 * `.toLocaleString("en-IN")`, several didn't format at all, e.g. jobs/[id] rendered raw
 * `₹{salaryMin}` with no thousands separator on large numbers). */

export function formatINR(amount: number): string {
  return `₹${amount.toLocaleString("en-IN")}`;
}

export function formatINRRange(min: number, max: number, suffix = ""): string {
  return `${formatINR(min)}–${formatINR(max)}${suffix ? ` ${suffix}` : ""}`;
}

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString();
}

export function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString();
}

export function formatFriendlyDateTime(iso: string): string {
  return new Date(iso).toLocaleString([], { weekday: "long", hour: "2-digit", minute: "2-digit", month: "short", day: "numeric" });
}
