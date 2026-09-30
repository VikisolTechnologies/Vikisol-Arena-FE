import type { Metadata } from "next";
import { notFound } from "next/navigation";

export const metadata: Metadata = { title: "Build progress · Arena", robots: { index: false, follow: false } };

/** Dev and preview only: the build tracker never exists in production. */
export default function DevLayout({ children }: { children: React.ReactNode }) {
  if (process.env.VERCEL_ENV === "production") notFound();
  return (
    <div data-theme="bplus" className="min-h-svh bg-background text-foreground">
      {children}
    </div>
  );
}
