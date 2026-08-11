import type { Metadata } from "next";

// ARENA-INVENTORY-FIXES.md FIX 1 - Discover is a documented-public route (ROUTES.md) and now
// renders logged-out (see page.tsx); this sibling layout is the standard Next.js way to attach
// metadata to a route whose page.tsx is a client component ("use client" files can't export
// `metadata` themselves) without touching that file at all.
export const metadata: Metadata = {
  title: "Discover jobs — Arena",
  description: "Swipe through open roles matched to your skills. No account needed to browse.",
  openGraph: {
    title: "Discover jobs on Arena",
    description: "Swipe through open roles matched to your skills.",
    url: "/discover",
  },
};

export default function DiscoverLayout({ children }: { children: React.ReactNode }) {
  return children;
}
