import { NextResponse } from "next/server";

// ARENA-STABILIZE.md Phase 1.1 - real-device Core Web Vitals, not just lab emulation. Logged
// structured to stdout (picked up by Railway logs, greppable via "[web-vitals]") rather than
// written to a new DB table - this is a diagnostic instrument for the Phase 1 investigation,
// not permanent product telemetry, so it doesn't warrant new schema/infra.
export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  if (!body || typeof body.name !== "string" || typeof body.value !== "number") {
    return NextResponse.json({ error: "invalid payload" }, { status: 400 });
  }
  console.log(
    `[web-vitals] ${body.name}=${body.value.toFixed(1)} rating=${body.rating ?? "?"} path=${body.path ?? "?"} device=${body.deviceMemory ?? "?"}gb conn=${body.connection ?? "?"}`,
  );
  return NextResponse.json({ ok: true });
}
