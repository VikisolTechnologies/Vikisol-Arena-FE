"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { isEnterpriseOnboarded } from "@/lib/session";
import { requireSession } from "@/lib/auth-guard";

export default function EnterpriseRootPage() {
  const router = useRouter();
  useEffect(() => {
    if (!requireSession(router)) return;
    router.replace(isEnterpriseOnboarded() ? "/enterprise/dashboard" : "/enterprise/onboarding");
  }, [router]);
  return null;
}
