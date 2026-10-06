"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { getSession } from "@/lib/session";
import type { Role } from "@/lib/types";

// Where "back" is for each role (real routes only, so this never points at another 404).
const ROLE_LANDING: Record<Role, string> = {
  talent: "/home",
  recruiter: "/enterprise/dashboard",
  company_admin: "/enterprise/dashboard",
  hiring_manager: "/enterprise/interviews/mine",
  platform_admin: "/admin",
};

/** The 404's second action: "Sign in" for guests, the person's own home once signed in. Starts
 *  session-less on server and first paint (no hydration mismatch), then flips. */
export function NotFoundBackLink({ className }: { className: string }) {
  const [to, setTo] = useState({ href: "/auth", label: "Sign in" });
  useEffect(() => {
    const session = getSession();
    // eslint-disable-next-line react-hooks/set-state-in-effect -- client-only session read
    if (session) setTo({ href: ROLE_LANDING[session.role], label: "Take me back" });
  }, []);
  return <Link href={to.href} className={className}>{to.label}</Link>;
}
