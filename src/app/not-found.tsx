import type { Metadata } from "next";
import Link from "next/link";
import { ArenaMark } from "@/components/brand/ArenaLogo";
import { NotFoundBackLink } from "@/components/NotFoundBackLink";

export const metadata: Metadata = { title: "Not found — Arena" };

/**
 * 404 (and /access-denied, which renders this so a gated route looks exactly like a missing one).
 * B+ and server-rendered: it ships with every route's first load, so it carries no animation
 * library and only one tiny client island (performance pass).
 */
export default function NotFound() {
  const button = "inline-flex h-[52px] flex-1 items-center justify-center rounded-button px-6 text-[17px] font-semibold outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary";
  return (
    <main data-theme="bplus" className="flex min-h-svh w-full items-center justify-center bg-background px-5 text-center text-foreground">
      <div className="w-full max-w-[400px]">
        <ArenaMark className="mx-auto size-14" />
        <h1 className="mt-6 font-display-serif text-[30px] font-medium leading-tight">This page isn&apos;t here</h1>
        <p className="mx-auto mt-2 max-w-[32ch] text-[15px] text-faint">It may have moved, or the link is out of date. Nothing you did went wrong.</p>
        <div className="mt-7 flex gap-3">
          <Link href="/home" className={`${button} border border-foreground/70`}>Feed</Link>
          <NotFoundBackLink className={`${button} bg-primary text-[19px] font-bold text-white`} />
        </div>
      </div>
    </main>
  );
}
