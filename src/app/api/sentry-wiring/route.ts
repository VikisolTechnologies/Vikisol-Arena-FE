import * as Sentry from "@sentry/nextjs";

// One-shot check that the deployed web SDK can deliver an event. Inactive unless
// SENTRY_WIRING_NONCE is set, and removed after that check.
export async function POST(request: Request) {
  const expected = process.env.SENTRY_WIRING_NONCE;
  const given = request.headers.get("x-sentry-wiring");
  if (!expected || given !== expected) return new Response(null, { status: 404 });
  const id = Sentry.captureException(new Error("Arena web Sentry wiring check"));
  const sent = await Sentry.flush(4000);
  return Response.json({ id, sent });
}
