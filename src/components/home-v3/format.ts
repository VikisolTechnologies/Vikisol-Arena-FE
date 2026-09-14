// Compact "TODAY · 4:00 PM" / "FRIDAY · 4:00 PM" eyebrow format, per the mockups' own examples
// ("ACTIVITY · 4:00 PM", "ACTIVITY · TODAY 4:00 PM"). lib/format.ts's formatFriendlyDateTime()
// is deliberately not reused here - it's a longer form built for post-detail/Map's own
// distance+time line, not this eyebrow's tight rhythm.
export function formatEyebrowWhen(iso: string): string {
  const date = new Date(iso);
  const now = new Date();
  const time = date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  const dayDiff = Math.round((startOfDay(date).getTime() - startOfDay(now).getTime()) / 86_400_000);
  if (dayDiff === 0) return `TODAY ${time}`;
  if (dayDiff === 1) return `TOMORROW ${time}`;
  const weekday = date.toLocaleDateString([], { weekday: "long" }).toUpperCase();
  return `${weekday} ${time}`;
}

function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}
