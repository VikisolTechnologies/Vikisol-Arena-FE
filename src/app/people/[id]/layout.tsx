import type { Metadata } from "next";
import { serverApiOrigin, serverApiHeaders } from "@/lib/api/serverApiOrigin";

// ARENA-INVENTORY-FIXES.md FIX 1 - a shared profile link is the growth loop; it needs to
// preview correctly on WhatsApp/LinkedIn instead of showing generic Arena boilerplate. This
// sibling layout is the standard way to attach dynamic per-route metadata to a route whose
// page.tsx is a client component. Plain fetch() here, not the browser-oriented apiFetch
// wrapper (localStorage token reads etc. don't apply server-side) - GET /profile/{id} is
// permitAll now, so no bearer auth header is needed. This runs server-side, so it calls
// arena-api directly via `serverApiOrigin()` (GOLIVE-PROXY.md F-PROXY) rather than the
// browser-only relative `/api/v1` path, and carries the proxy secret the same way the Vercel
// rewrite would.
type PublicProfileShape = { name?: string; title?: string; industry?: string; bio?: string };

const FALLBACK_TITLE = "Profile · Arena";
const FALLBACK_DESCRIPTION = "View this Arena member's profile.";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const fallback: Metadata = { title: FALLBACK_TITLE, description: FALLBACK_DESCRIPTION };
  try {
    const res = await fetch(`${serverApiOrigin()}/api/v1/profile/${id}`, {
      headers: serverApiHeaders(),
      next: { revalidate: 300 },
    });
    if (!res.ok) return fallback;
    const json = (await res.json()) as { data?: PublicProfileShape };
    const p = json.data;
    if (!p?.name) return fallback;
    const title = `${p.name} — Arena`;
    const description: string = p.bio || [p.title, p.industry].filter(Boolean).join(" · ") || FALLBACK_DESCRIPTION;
    return {
      title,
      description,
      openGraph: { title, description, url: `/people/${id}`, images: [`https://picsum.photos/seed/${encodeURIComponent(id)}-cover/1200/630`] },
    };
  } catch {
    return fallback;
  }
}

export default function PersonLayout({ children }: { children: React.ReactNode }) {
  return children;
}
