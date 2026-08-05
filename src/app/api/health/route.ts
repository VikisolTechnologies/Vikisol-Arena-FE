import { NextResponse } from "next/server";

// Railway's healthcheck prober can't present the STAGING_BASIC_AUTH credential (see
// middleware.ts) - without a dedicated unauthenticated route for it to hit, every deploy fails
// its healthcheck and gets killed before ever going live. This route stays excluded from the
// basic-auth matcher for exactly that reason.
export function GET() {
  return NextResponse.json({ status: "ok" });
}
