import Link from "next/link";
import { SCREENS } from "@/lib/dev/screens";
import { Pair } from "../Pair";

export default function CompareAllPage() {
  const done = SCREENS.filter((s) => s.status !== "not-started");
  return (
    <main className="mx-auto max-w-[900px] px-5 py-6">
      <Link href="/dev/progress" className="text-[14px] underline underline-offset-2">← Progress</Link>
      <h1 className="mt-3 font-display-serif text-[32px] font-medium">Every built screen, board vs live</h1>
      <div className="mt-8 space-y-14">
        {done.map((s) => <Pair key={s.id} screen={s} />)}
      </div>
    </main>
  );
}
