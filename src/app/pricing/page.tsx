"use client";

import { useState } from "react";
import Link from "next/link";
import { Check, Sparkles } from "lucide-react";
import { AuraBackground } from "@/components/landing/AuraBackground";
import { Nav } from "@/components/landing/Nav";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { getMyEnterpriseProfile, saveMyEnterpriseProfile } from "@/lib/api/enterprise";
import { getSession, isEnterpriseOnboarded } from "@/lib/session";
import { getTalentPlan, setTalentPlan } from "@/lib/plan";
import { cn } from "@/lib/utils";
import { formatINR } from "@/lib/format";

const TALENT_TIERS: { key: "free" | "pro"; name: string; price: string; period: string; features: string[]; highlight?: boolean }[] = [
  {
    key: "free", name: "Free", price: "₹0", period: "forever",
    features: ["Agent finds + applies to matches", "Identity graph & career health", "Unlimited practice challenges", "Standard support"],
  },
  {
    key: "pro", name: "Pro", price: "₹499", period: "/month",
    features: ["Everything in Free", "Autopilot mode", "Priority in Talent Universe search", "Tailored resume history", "Priority support"],
    highlight: true,
  },
];

export default function PricingPage() {
  const [talentPlan, setTalentPlanState] = useState(() => getTalentPlan());
  // Plan changes are a company_admin action (CA4: Billing & plan) - recruiters share the
  // workspace but don't manage billing.
  const [enterpriseOnboarded] = useState(() => getSession()?.role === "company_admin" && isEnterpriseOnboarded());
  const [seats, setSeats] = useState(3);

  const chooseTalentPlan = (plan: "free" | "pro") => {
    setTalentPlan(plan);
    setTalentPlanState(plan);
  };

  const chooseEnterprisePlan = async (plan: "pro" | "enterprise") => {
    const current = await getMyEnterpriseProfile();
    if (!current) return;
    await saveMyEnterpriseProfile({ ...current, plan, seatsTotal: seats, unlockCreditsTotal: plan === "enterprise" ? 100 : 50 });
  };

  const enterprisePricePerSeat = 799;

  return (
    <div className="relative isolate min-h-svh w-full overflow-hidden bg-background text-foreground">
      <AuraBackground />
      <Nav />

      <section className="relative z-10 mx-auto w-full max-w-[1000px] px-5 pb-20 pt-36 text-center sm:px-6">
        <Badge variant="glass" className="mb-4">
          <Sparkles className="size-3" /> Simple pricing
        </Badge>
        <h1 className="font-display text-4xl font-bold tracking-tight sm:text-5xl">Free for talent. Fair for teams.</h1>
        <p className="mx-auto mt-4 max-w-lg text-muted-foreground">No hidden fees. Cancel anytime. Your agent works the same either way.</p>
      </section>

      <section className="relative z-10 mx-auto grid w-full max-w-[1000px] gap-4 px-5 pb-16 sm:grid-cols-2 sm:px-6">
        {TALENT_TIERS.map((tier) => (
          <div
            key={tier.key}
            className={cn(
              "rounded-[24px] border p-7",
              tier.highlight ? "border-primary/50 bg-primary/[0.06]" : "border-border bg-white/[0.03]",
            )}
          >
            {tier.highlight && <Badge variant="secondary" className="mb-3 bg-primary/15 text-primary-soft">Most popular</Badge>}
            <p className="font-display text-lg font-bold">{tier.name}</p>
            <p className="mt-1 font-display text-3xl font-bold">
              {tier.price} <span className="text-sm font-normal text-muted-foreground">{tier.period}</span>
            </p>
            <ul className="mt-5 space-y-2.5 text-left">
              {tier.features.map((f) => (
                <li key={f} className="flex items-start gap-2 text-sm text-muted-foreground">
                  <Check className="mt-0.5 size-4 shrink-0 text-primary-soft" /> {f}
                </li>
              ))}
            </ul>
            <Button
              variant={tier.highlight ? "primary-gradient" : "ghost-glass"}
              size="cta"
              className="mt-6 w-full"
              disabled={talentPlan === tier.key}
              onClick={() => chooseTalentPlan(tier.key)}
              render={<Link href="/auth" />}
              nativeButton={false}
            >
              {talentPlan === tier.key ? "Current plan" : `Get ${tier.name}`}
            </Button>
          </div>
        ))}
      </section>

      <section className="relative z-10 mx-auto w-full max-w-[1000px] px-5 pb-24 sm:px-6">
        <div className="rounded-[24px] border border-border bg-white/[0.03] p-7">
          <p className="font-display text-lg font-bold">Enterprise</p>
          <p className="mt-1 text-sm text-muted-foreground">Search Talent Universe, unlock candidates, hire on proof.</p>
          <div className="mt-4 flex items-center gap-4">
            <p className="font-display text-3xl font-bold">
              {formatINR(enterprisePricePerSeat)} <span className="text-sm font-normal text-muted-foreground">/seat/month</span>
            </p>
            <div className="ml-auto flex items-center gap-2 text-sm">
              <span className="text-muted-foreground">Seats:</span>
              <button type="button" onClick={() => setSeats((s) => Math.max(1, s - 1))} className="flex size-7 items-center justify-center rounded-full border border-border">-</button>
              <span className="w-6 text-center font-semibold">{seats}</span>
              <button type="button" onClick={() => setSeats((s) => s + 1)} className="flex size-7 items-center justify-center rounded-full border border-border">+</button>
            </div>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">≈ {formatINR(enterprisePricePerSeat * seats)}/month total</p>

          <div className="mt-5 grid gap-2.5 sm:grid-cols-2">
            {["Unlimited Talent Universe search", "50 candidate unlocks/month", "Applicant pipeline + postings", "Priority support"].map((f) => (
              <div key={f} className="flex items-center gap-2 text-sm text-muted-foreground"><Check className="size-4 shrink-0 text-primary-soft" /> {f}</div>
            ))}
          </div>

          {enterpriseOnboarded ? (
            <Button variant="primary-gradient" size="cta" className="mt-6 w-full sm:w-auto" onClick={() => chooseEnterprisePlan("enterprise")}>
              Upgrade to Enterprise
            </Button>
          ) : (
            <Button variant="primary-gradient" size="cta" className="mt-6 w-full sm:w-auto" render={<Link href="/auth" />} nativeButton={false}>
              Get started
            </Button>
          )}
        </div>
      </section>
    </div>
  );
}
