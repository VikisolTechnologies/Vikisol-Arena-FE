"use client";

import { useEffect, useState } from "react";
import { m } from "motion/react";
import { Check, CreditCard, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import { rise } from "@/lib/motion";
import { CompanyAdminShell } from "@/components/app/CompanyAdminShell";
import { Skeleton } from "@/components/bplus/Primitives";
import { Panel, Stat } from "@/components/dash/Parts";
import { getBilling, type Billing } from "@/lib/api/companyAdmin";

const PLANS: { key: Billing["plan"]; name: string; price: string; seats: string; credits: string }[] = [
  { key: "free", name: "Free", price: "₹0", seats: "3 seats", credits: "25 credits" },
  { key: "pro", name: "Pro", price: "₹4,999 / month", seats: "10 seats", credits: "50 credits" },
  { key: "enterprise", name: "Enterprise", price: "Custom", seats: "50 seats", credits: "200 credits" },
];

/** Company settings — Billing & plan. Flow §8 says **display only**: plans are shown, the
 *  in-page plan switch was removed (no payment step exists). `getBilling` unchanged. */
export default function BillingPage() {
  const [billing, setBilling] = useState<Billing | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    getBilling().then(setBilling).catch(() => setError(true));
  }, []);

  return (
    <CompanyAdminShell title="Billing & plan">
      {error && <p role="alert" className="mb-4 rounded-xl bg-danger/12 px-3.5 py-2.5 text-[14px]">Billing didn&apos;t load. Refresh to try again.</p>}
      {!billing ? (
        !error && <Skeleton className="h-72" />
      ) : (
        <m.div initial="hidden" animate="shown" className="space-y-5">
          <m.div variants={rise} className="grid grid-cols-2 gap-3 lg:max-w-[560px]">
            <Stat icon={Users} value={billing.seatsUsed} label={`of ${billing.seatsTotal} seats used`} />
            <Stat icon={CreditCard} value={billing.creditsTotal - billing.creditsUsed} label={`of ${billing.creditsTotal} credits left`} tone="warning" />
          </m.div>
          <m.div variants={rise} custom={1}>
            <Panel title="Plans">
              <ul className="grid gap-3 sm:grid-cols-3">
                {PLANS.map((p) => {
                  const current = billing.plan === p.key;
                  return (
                    <li key={p.key} className={cn("rounded-tile p-4", current ? "bg-paper text-paper-ink" : "border border-line")}>
                      <p className="flex items-center justify-between text-[17px] font-semibold">{p.name}{current && <span className="inline-flex items-center gap-1 rounded-full bg-white px-2 py-0.5 text-[12px] font-bold text-primary-on-paper"><Check className="size-3.5" aria-hidden /> Your plan</span>}</p>
                      <p className="mt-1 font-display-serif text-[24px]">{p.price}</p>
                      <p className={cn("mt-1 text-[14px]", current ? "text-paper-ink-muted" : "text-faint")}>{p.seats} · {p.credits}</p>
                    </li>
                  );
                })}
              </ul>
              <p className="mt-4 text-[14px] text-faint">Plan changes aren&apos;t self-serve yet — the Arena team changes plans for you.</p>
            </Panel>
          </m.div>
          <m.div variants={rise} custom={2}>
            <Panel title="Invoices">
              {billing.invoices.length === 0 ? (
                <p className="text-[14px] text-faint">No invoices — the Free plan isn&apos;t billed.</p>
              ) : (
                <ul className="divide-y divide-line">
                  {billing.invoices.map((inv) => (
                    <li key={inv.id} className="flex flex-wrap items-center gap-3 py-3 text-[15px]">
                      <span className="min-w-28 text-faint">{inv.date}</span>
                      <span className="font-mono text-[13px] text-faint">{inv.id}</span>
                      <span className="ml-auto font-semibold">{inv.amount}</span>
                      <span className="rounded-full bg-success/15 px-2.5 py-0.5 text-[12px] font-semibold capitalize text-success-on-dark">{inv.status}</span>
                    </li>
                  ))}
                </ul>
              )}
            </Panel>
          </m.div>
        </m.div>
      )}
    </CompanyAdminShell>
  );
}
