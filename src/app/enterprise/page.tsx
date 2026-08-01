"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { getSession, isEnterpriseOnboarded } from "@/lib/session";

export default function EnterpriseRootPage() {
  const router = useRouter();
  useEffect(() => {
    if (!getSession()) { router.replace("/auth"); return; }
    router.replace(isEnterpriseOnboarded() ? "/enterprise/dashboard" : "/enterprise/onboarding");
  }, [router]);
  return null;
}
