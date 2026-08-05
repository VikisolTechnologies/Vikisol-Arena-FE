import { AuraBackground } from "@/components/landing/AuraBackground";
import { Nav } from "@/components/landing/Nav";

export const metadata = { title: "Terms of Service — Arena" };

// DRAFT scaffold, not legal copy - see privacy/page.tsx's identical note.
export default function TermsPage() {
  return (
    <div className="relative isolate min-h-svh w-full overflow-hidden bg-background text-foreground">
      <AuraBackground />
      <Nav />
      <div className="relative z-10 mx-auto max-w-2xl px-5 py-28 sm:px-6">
        <div className="mb-6 rounded-2xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-300">
          <strong>Draft — pending legal review.</strong> Scaffolding for the real Terms of
          Service required before public launch, not final copy.
        </div>
        <h1 className="mb-6 font-display text-3xl font-bold tracking-tight">Terms of Service</h1>
        <div className="space-y-5 text-sm leading-relaxed text-muted-foreground">
          <p>By using Arena, operated by Vikisol Technologies Pvt Ltd, you agree to these terms.</p>
          <p><strong className="text-foreground">The service:</strong> Arena helps candidates find opportunities and lets enterprises search a consented candidate pool. AI-assisted matching and resume tailoring only rephrase facts you provide — we never fabricate experience on your behalf, and every application/message requires your review before it&apos;s sent.</p>
          <p><strong className="text-foreground">Your account:</strong> you&apos;re responsible for the accuracy of what you submit and for keeping your credentials secure.</p>
          <p><strong className="text-foreground">Content ownership:</strong> you retain ownership of your resume and profile content; you grant us a license to process it to operate the service (matching, search, display to enterprises you&apos;ve consented to).</p>
          <p><strong className="text-foreground">Marketplace/payments:</strong> not yet live on this platform — no real money changes hands today.</p>
          <p><strong className="text-foreground">Liability:</strong> Arena is a platform connecting candidates and employers; we don&apos;t guarantee hiring outcomes and aren&apos;t a party to any resulting employment relationship.</p>
          <p><strong className="text-foreground">Termination:</strong> you may delete your account at any time from Settings.</p>
        </div>
      </div>
    </div>
  );
}
