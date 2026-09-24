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

export function formatTimeAgo(iso: string): string {
  const minutes = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60_000));
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(iso).toLocaleDateString([], { month: "short", day: "numeric" });
}
