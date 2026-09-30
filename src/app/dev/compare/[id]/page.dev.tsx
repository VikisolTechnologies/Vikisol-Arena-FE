import Link from "next/link";
import { notFound } from "next/navigation";
import { SCREENS } from "@/lib/dev/screens";
import { Pair } from "../Pair";

export function generateStaticParams() {
  return SCREENS.map((s) => ({ id: s.id }));
}

export default async function ComparePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const i = SCREENS.findIndex((s) => s.id === id);
  if (i < 0) notFound();
  const prev = SCREENS[i - 1];
  const next = SCREENS[i + 1];
  return (
    <main className="mx-auto max-w-[900px] px-5 py-6">
      <nav className="mb-5 flex flex-wrap items-center gap-4 text-[14px]">
        <Link href="/dev/progress" className="underline underline-offset-2">← Progress</Link>
        {prev && <Link href={`/dev/compare/${prev.id}`} className="underline underline-offset-2">‹ {prev.title}</Link>}
        {next && <Link href={`/dev/compare/${next.id}`} className="underline underline-offset-2">{next.title} ›</Link>}
      </nav>
      <Pair screen={SCREENS[i]} />
    </main>
  );
}
