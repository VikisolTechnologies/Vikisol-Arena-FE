import type { Metadata } from "next";
import { serverApiOrigin, serverApiHeaders } from "@/lib/api/serverApiOrigin";

// ARENA-INVENTORY-FIXES.md FIX 1 - same reasoning as people/[id]/layout.tsx: a shared company
// link needs a real preview. GET /companies/{id} is permitAll now, no bearer auth header
// needed. Calls arena-api directly server-side (GOLIVE-PROXY.md F-PROXY) with the proxy
// secret, same as that file.
type CompanyShape = { name?: string; industry?: string; openJobCount?: number };

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const fallback: Metadata = {
    title: "Company — Arena",
    description: "View this company's open roles on Arena.",
  };
  try {
    const res = await fetch(`${serverApiOrigin()}/api/v1/companies/${id}`, {
      headers: serverApiHeaders(),
      next: { revalidate: 300 },
    });
    if (!res.ok) return fallback;
    const json = (await res.json()) as { data?: CompanyShape };
    const c = json.data;
    if (!c?.name) return fallback;
    const title = `${c.name} — Arena`;
    const roles = c.openJobCount ? `${c.openJobCount} open role${c.openJobCount === 1 ? "" : "s"}` : "Open roles";
    const description: string = [c.industry, roles].filter(Boolean).join(" · ");
    return {
      title,
      description,
      openGraph: { title, description, url: `/companies/${id}`, images: [`https://picsum.photos/seed/${encodeURIComponent(id)}/1200/630`] },
    };
  } catch {
    return fallback;
  }
}

export default function CompanyLayout({ children }: { children: React.ReactNode }) {
  return children;
}
