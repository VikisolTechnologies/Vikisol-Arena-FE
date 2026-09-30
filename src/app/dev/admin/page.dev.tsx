"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { isRealMode } from "@/lib/api/mode";
import { setSession } from "@/lib/session";

/** Preview-only: signs this browser in as a platform admin in MOCK mode, then opens `?to=`.
 *  Never runs against the real API; /dev is 404 in production. */
function Seed() {
  const router = useRouter();
  const to = useSearchParams().get("to") ?? "/admin";
  const [blocked] = useState(() => isRealMode());

  useEffect(() => {
    if (blocked) return;
    setSession({
      role: "platform_admin",
      name: "Vikisol Platform Admin",
      email: "platform-admin@vikisol.dev",
    });
    localStorage.setItem("arena_cookie_consent", "accepted");
    window.location.replace(to);
  }, [blocked, router, to]);

  return (
    <p className="p-6 text-[15px] text-faint">
      {blocked ? "The admin demo only runs in mock mode." : "Opening Arena Admin…"}
    </p>
  );
}

export default function DevAdminPage() {
  return (
    <Suspense>
      <Seed />
    </Suspense>
  );
}
