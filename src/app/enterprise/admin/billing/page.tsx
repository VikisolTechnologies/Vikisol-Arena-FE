"use client";

import { useEffect, useState } from "react";
import { Check } from "lucide-react";
import { CompanyAdminShell } from "@/components/app/CompanyAdminShell";
import { OrbLoader } from "@/components/ui/orb-loader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getBilling, changePlan, type Billing } from "@/lib/api/companyAdmin";

const PLANS: { key: Billing["plan"]; name: string; price: string; seats: string; credits: string }[] = [
  { key: "free", name: "Free", price: "₹0", seats: "3 seats", credits: "25 credits" },
  { key: "pro", name: "Pro", price: "₹4,999/mo", seats: "10 seats", credits: "50 credits" },
  { key: "enterprise", name: "Enterprise", price: "Custom", seats: "50 seats", credits: "200 credits" },
];

export default function BillingPage() {
  const [billing, setBilling] = useState<Billing | null>(null);
  const [changing, setChanging] = useState<string | null>(null);

  const load = () => { getBilling().then(setBilling); };
  useEffect(load, []);

  const doChangePlan = async (plan: Billing["plan"]) => {
    setChanging(plan);
    try {
      await changePlan(plan);
      load();
    } finally {
      setChanging(null);
    }
  };

  if (!billing) {
    return (
      <CompanyAdminShell title="Billing & plan">
        <OrbLoader className="h-96" />
      </CompanyAdminShell>
    );
  }

  return (
    <CompanyAdminShell title="Billing & plan">
      <div className="mb-6 grid gap-4 sm:grid-cols-2">
        <div className="rounded-2xl border border-border bg-white/[0.02] p-4">
          <p className="text-xs text-muted-foreground">Seats</p>
          <p className="mt-1 font-display text-xl font-bold">{billing.seatsUsed}/{billing.seatsTotal}</p>
        </div>
        <div className="rounded-2xl border border-border bg-white/[0.02] p-4">
          <p className="text-xs text-muted-foreground">Unlock credits</p>
          <p className="mt-1 font-display text-xl font-bold">{billing.creditsTotal - billing.creditsUsed}/{billing.creditsTotal}</p>
        </div>
      </div>

      <p className="mb-3 font-display text-sm font-bold">Plan</p>
      <div className="mb-8 grid gap-4 sm:grid-cols-3">
        {PLANS.map((p) => {
          const isCurrent = billing.plan === p.key;
          return (
            <div key={p.key} className={`rounded-[24px] border p-5 ${isCurrent ? "border-primary/50 bg-primary/[0.05]" : "border-border bg-white/[0.03]"}`}>
              <div className="flex items-center justify-between">
                <p className="font-display text-lg font-bold">{p.name}</p>
                {isCurrent && <Badge variant="secondary" className="gap-1 bg-primary/15 text-primary-soft"><Check className="size-3" /> Current</Badge>}
              </div>
              <p className="mt-1 text-2xl font-bold text-primary-soft">{p.price}</p>
              <p className="mt-2 text-xs text-muted-foreground">{p.seats} · {p.credits}</p>
              {!isCurrent && (
                <Button
                  variant="primary-gradient" size="sm" className="mt-4 w-full"
                  disabled={changing === p.key}
                  onClick={() => doChangePlan(p.key)}
                >
                  {changing === p.key ? "Switching…" : `Switch to ${p.name}`}
                </Button>
              )}
            </div>
          );
        })}
      </div>

      <p className="mb-3 font-display text-sm font-bold">Invoices</p>
      <div className="space-y-2">
        {billing.invoices.map((inv) => (
          <div key={inv.id} className="flex items-center justify-between rounded-2xl border border-border bg-white/[0.02] px-4 py-3 text-sm">
            <span className="text-muted-foreground">{inv.date}</span>
            <span className="font-mono text-xs">{inv.id}</span>
            <span className="font-semibold">{inv.amount}</span>
            <Badge variant="secondary" className="bg-emerald-500/15 text-emerald-400 capitalize">{inv.status}</Badge>
          </div>
        ))}
        {billing.invoices.length === 0 && (
          <p className="rounded-2xl border border-dashed border-border-strong px-6 py-8 text-center text-sm text-muted-foreground">
            No invoices on the Free plan.
          </p>
        )}
      </div>
    </CompanyAdminShell>
  );
}
