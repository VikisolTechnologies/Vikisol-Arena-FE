/**
 * Feed/Discover domain for B+ screens — the existing feed, search, trending and nearby calls,
 * unchanged shapes, plus the honest derivations the cards need (distance, "when", going).
 */
import { getFeedItems } from "@/lib/api/feed";
import { getNearby, getTrending } from "@/lib/api/posts";
import { search } from "@/lib/api/search";
import type { FeedItem, Post } from "@/lib/types";

export { getFeedItems, getNearby, getTrending, search };
export type { FeedItem, Post };

export type FeedFilter = "nearby" | "week" | "all";

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

export function filterFeed(items: FeedItem[], filter: FeedFilter, now = Date.now()): FeedItem[] {
  if (filter === "all") return items;
  if (filter === "nearby") return items.filter((i) => i.locationText || (i.approxLat != null && i.approxLng != null));
  return items.filter((i) => {
    const t = new Date(i.startsAt ?? i.createdAt).getTime();
    return Number.isFinite(t) && Math.abs(t - now) <= WEEK_MS;
  });
}

/** Great-circle km between two approximate points, or null when either is unknown. */
export function distanceKm(a?: { lat?: number; lng?: number } | null, b?: { lat?: number; lng?: number } | null): number | null {
  if (a?.lat == null || a?.lng == null || b?.lat == null || b?.lng == null) return null;
  const R = 6371;
  const rad = (d: number) => (d * Math.PI) / 180;
  const dLat = rad(b.lat - a.lat);
  const dLng = rad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

export function formatKm(km: number) {
  return km < 1 ? `${Math.max(0.1, Math.round(km * 10) / 10)} km away` : `${Math.round(km * 10) / 10} km away`;
}

/** Relative, computed dates: "Today · 6:30 AM", "Tomorrow", "Sat, 12 Oct" (never a stored year). */
export function whenLabel(iso?: string, now = new Date()): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  const day = (x: Date) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
  const diff = Math.round((day(d) - day(now)) / 86_400_000);
  const time = d.toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit" }).toUpperCase();
  if (diff === 0) return `Today · ${time}`;
  if (diff === 1) return `Tomorrow · ${time}`;
  if (diff === -1) return "Yesterday";
  if (diff > 1 && diff < 7) return `${d.toLocaleDateString("en-IN", { weekday: "short" })} · ${time}`;
  return d.toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" });
}

export function goingLabel(item: { spotsFilled?: number; capacity?: number }) {
  if (item.spotsFilled == null || item.spotsFilled <= 0) return null;
  return `${item.spotsFilled} going`;
}

export function spotsLeft(item: { spotsFilled?: number; capacity?: number }) {
  if (item.capacity == null || item.spotsFilled == null) return null;
  const left = item.capacity - item.spotsFilled;
  return left > 0 ? `${left} ${left === 1 ? "spot" : "spots"} left` : "Full";
}

export function hrefFor(item: Pick<FeedItem, "id" | "itemType">) {
  if (item.itemType === "job") return `/jobs/${item.id}`;
  if (item.itemType === "project") return `/marketplace/${item.id}`;
  return `/feed/${item.id}`;
}

export function isDemo(item: object) {
  return "demoContent" in item && (item as { demoContent?: boolean }).demoContent === true;
}
