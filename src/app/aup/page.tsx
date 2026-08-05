import { AuraBackground } from "@/components/landing/AuraBackground";
import { Nav } from "@/components/landing/Nav";

export const metadata = { title: "Acceptable Use Policy — Arena" };

// DRAFT scaffold, not legal copy - see privacy/page.tsx's identical note.
export default function AupPage() {
  return (
    <div className="relative isolate min-h-svh w-full overflow-hidden bg-background text-foreground">
      <AuraBackground />
      <Nav />
      <div className="relative z-10 mx-auto max-w-2xl px-5 py-28 sm:px-6">
        <div className="mb-6 rounded-2xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-300">
          <strong>Draft — pending legal review.</strong> Scaffolding for the real Acceptable Use
          Policy required before public launch, not final copy.
        </div>
        <h1 className="mb-6 font-display text-3xl font-bold tracking-tight">Acceptable Use Policy</h1>
        <div className="space-y-5 text-sm leading-relaxed text-muted-foreground">
          <p>You may not use Arena to:</p>
          <ul className="list-disc space-y-2 pl-5">
            <li>Submit fabricated experience, credentials, or false information in a profile or application</li>
            <li>Post job listings that are fraudulent, pay-to-apply, or misrepresent the role or employer</li>
            <li>Scrape, bulk-harvest, or resell candidate or job data obtained through the platform</li>
            <li>Send spam, unsolicited bulk messages, or abuse the messaging/interview-scheduling features</li>
            <li>Attempt to circumvent rate limits, security controls, or access another account&apos;s data</li>
            <li>Use the platform for any unlawful purpose</li>
          </ul>
          <p>Job postings are automatically screened for common fraud patterns and may be removed if flagged; repeat or severe violations may result in account suspension.</p>
        </div>
      </div>
    </div>
  );
}
