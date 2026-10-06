import { Suspense } from "react";
import type { Metadata } from "next";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { landingRouteForRole, verifySessionToken } from "@/lib/serverSession";
import { AuthFlow } from "@/components/entry/AuthFlow";

export const metadata: Metadata = { title: "Arena — Local people. Real outcomes." };

/** Guests see Welcome; signed-in visitors go straight to their landing route (same session
 *  check the middleware already uses for /auth). */
export default async function Home() {
  const claims = await verifySessionToken((await cookies()).get("arena_session")?.value);
  if (claims) redirect(landingRouteForRole(claims.role));
  return (
    <Suspense fallback={null}>
      <AuthFlow />
    </Suspense>
  );
}
