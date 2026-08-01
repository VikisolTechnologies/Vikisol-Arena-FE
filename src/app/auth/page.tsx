"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Loader2, Building2, User } from "lucide-react";
import { AuraBackground } from "@/components/landing/AuraBackground";
import { AgentOrb } from "@/components/landing/AgentOrb";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { signIn, signUp } from "@/lib/api/auth";
import { isOnboarded } from "@/lib/session";
import type { Role } from "@/lib/types";

const ROLES: { key: Role; label: string; desc: string; icon: typeof User }[] = [
  { key: "talent", label: "Talent", desc: "Find opportunities", icon: User },
  { key: "enterprise", label: "Enterprise", desc: "Find candidates", icon: Building2 },
];

export default function AuthPage() {
  const router = useRouter();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [role, setRole] = useState<Role>("talent");
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!form.email || !form.password) {
      setError("Email and password are required");
      return;
    }
    if (mode === "signup" && !form.name) {
      setError("Name is required");
      return;
    }
    setSubmitting(true);
    try {
      if (mode === "signin") await signIn(form.email, form.password, role);
      else await signUp(form.name, form.email, form.password, role);

      if (role === "enterprise") router.push("/enterprise");
      else router.push(isOnboarded() ? "/dashboard" : "/onboarding");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="relative isolate min-h-svh w-full overflow-hidden bg-background text-foreground">
      <AuraBackground />

      <div className="relative z-10 mx-auto grid min-h-svh w-full max-w-[1240px] items-center gap-8 px-5 py-16 sm:px-6 lg:grid-cols-2">
        {/* Branding panel */}
        <div className="order-2 hidden flex-col items-center text-center lg:order-1 lg:flex">
          <AgentOrb />
          <p className="mt-4 max-w-sm font-display text-2xl font-bold tracking-tight">
            Your agent is ready to work.
          </p>
          <p className="mt-2 max-w-sm text-sm text-muted-foreground">
            Sign in to keep it hunting openings, applying, and booking interviews for you.
          </p>
        </div>

        {/* Form panel */}
        <div className="order-1 mx-auto w-full max-w-md lg:order-2">
          <Link href="/" className="mb-8 flex items-center gap-2.5">
            <span className="font-display text-lg font-bold tracking-wide">
              ARENA<span className="text-primary">.</span>
            </span>
          </Link>

          <div className="rounded-[24px] border border-border bg-white/5 p-7 backdrop-blur-[18px]">
            <Tabs value={mode} onValueChange={(v) => setMode(v as "signin" | "signup")}>
              <TabsList className="mb-6 grid w-full grid-cols-2 rounded-full bg-white/5 p-1">
                <TabsTrigger value="signin" className="rounded-full data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                  Sign in
                </TabsTrigger>
                <TabsTrigger value="signup" className="rounded-full data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                  Sign up
                </TabsTrigger>
              </TabsList>
            </Tabs>

            <div className="mb-6 grid grid-cols-2 gap-3">
              {ROLES.map(({ key, label, desc, icon: Icon }) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setRole(key)}
                  className={cn(
                    "flex flex-col items-center gap-1.5 rounded-2xl border px-3 py-3.5 text-center transition-colors",
                    role === key
                      ? "border-primary/60 bg-primary/10 text-primary-soft"
                      : "border-border bg-white/[0.03] text-muted-foreground hover:border-white/20",
                  )}
                >
                  <Icon className="size-5" />
                  <span className="text-sm font-semibold">{label}</span>
                  <span className="text-[11px] text-muted-foreground">{desc}</span>
                </button>
              ))}
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {mode === "signup" && (
                <div className="space-y-1.5">
                  <Label htmlFor="name">Full name</Label>
                  <Input
                    id="name"
                    value={form.name}
                    onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                    className="h-11 rounded-xl border-border bg-white/[0.03]"
                  />
                </div>
              )}
              <div className="space-y-1.5">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                  className="h-11 rounded-xl border-border bg-white/[0.03]"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  value={form.password}
                  onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                  className="h-11 rounded-xl border-border bg-white/[0.03]"
                />
              </div>

              {error && <p className="text-sm text-red-400">{error}</p>}

              <Button type="submit" variant="primary-gradient" size="cta" className="w-full" disabled={submitting}>
                {submitting && <Loader2 className="size-4 animate-spin" />}
                {submitting ? "Working…" : mode === "signin" ? "Sign in" : "Create account"}
              </Button>
              <p className="text-center text-xs text-muted-foreground">
                Any email and password works here — this is a design preview, no real account is created.
              </p>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
