"use client";

import { useState } from "react";
import Link from "next/link";
import { AccountPage } from "@/components/account/AccountPage";
import { getHelpTopics } from "@/components/account/draft";
import { rise } from "@/lib/motion";
import { m } from "motion/react";

export default function HelpSafetyPage() {
  const topics = getHelpTopics();
  const [openId, setOpenId] = useState<string | null>(topics[0]?.id ?? null);

  return (
    <AccountPage title="Help & safety" lede="A kinder neighbourhood starts with clear rules and a way to get help.">
      <ul className="space-y-3">
        {topics.map((t, i) => {
          const open = openId === t.id;
          return (
            <m.li key={t.id} variants={rise} custom={i} initial="hidden" animate="shown" className="overflow-hidden rounded-tile bg-paper text-paper-ink">
              <button
                type="button"
                aria-expanded={open}
                onClick={() => setOpenId(open ? null : t.id)}
                className="flex min-h-14 w-full items-center justify-between px-4 py-3 text-left text-[16px] font-semibold outline-none focus-visible:outline-2 focus-visible:outline-primary"
              >
                {t.title}
                <span className="text-paper-ink-muted" aria-hidden>
                  {open ? "–" : "+"}
                </span>
              </button>
              {open && <p className="border-t border-paper-ink/10 px-4 py-3 text-[14px] leading-relaxed text-paper-ink-muted">{t.body}</p>}
            </m.li>
          );
        })}
      </ul>
      <p className="mt-6 text-[14px] text-paper-ink-muted">
        Need to report something now? Use Report on any chat or post, or read our{" "}
        <Link href="/aup" className="font-semibold text-primary-on-paper underline-offset-2 hover:underline">
          Acceptable Use Policy
        </Link>
        .
      </p>
    </AccountPage>
  );
}
