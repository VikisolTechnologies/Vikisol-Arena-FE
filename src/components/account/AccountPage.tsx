"use client";

import type { ReactNode } from "react";
import { useRouter } from "next/navigation";
import { AppShell } from "@/components/bplus/AppShell";
import { TopBar, Title, Lede } from "@/components/bplus/Screen";

/** Light cream account pages inside the consumer shell (no board — designed in B+). */
export function AccountPage({
  title,
  lede,
  children,
  backTo = "/settings",
}: {
  title: string;
  lede?: string;
  children: ReactNode;
  backTo?: string;
}) {
  const router = useRouter();
  return (
    <AppShell tone="light">
      <TopBar onBack={() => router.push(backTo)} />
      <Title className="mt-1">{title}</Title>
      {lede && <Lede>{lede}</Lede>}
      <div className="mt-6">{children}</div>
    </AppShell>
  );
}
