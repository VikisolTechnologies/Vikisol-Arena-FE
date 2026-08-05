import Link from "next/link";
import { AuraBackground } from "@/components/landing/AuraBackground";
import { Nav } from "@/components/landing/Nav";

export const metadata = { title: "Privacy Policy — Arena" };

// DRAFT scaffold, not legal copy - ARENA-SHIP-IT.md #5: "build the mechanism; legal copy is
// Syam's job." This exists so the route/notice/withdrawal-link/DPDP-Board-contact requirements
// have somewhere real to point at before launch, not so this text itself ships to real users.
export default function PrivacyPage() {
  return (
    <div className="relative isolate min-h-svh w-full overflow-hidden bg-background text-foreground">
      <AuraBackground />
      <Nav />
      <div className="relative z-10 mx-auto max-w-2xl px-5 py-28 sm:px-6">
        <div className="mb-6 rounded-2xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-300">
          <strong>Draft — pending legal review.</strong> This page is scaffolding for the real,
          lawyer-reviewed Privacy Policy required before public launch (see PRODUCTION-CHECKLIST.md).
          It is not final and should not be relied on.
        </div>
        <h1 className="mb-6 font-display text-3xl font-bold tracking-tight">Privacy Policy</h1>
        <div className="space-y-5 text-sm leading-relaxed text-muted-foreground">
          <p>
            Vikisol Technologies Pvt Ltd (&quot;Arena&quot;, &quot;we&quot;) is the Data Fiduciary
            for personal data you provide, under India&apos;s Digital Personal Data Protection
            Act, 2023 and the DPDP Rules, 2025.
          </p>
          <p><strong className="text-foreground">What we collect:</strong> profile details you provide (name, skills, experience, resume/CV file), consent settings (auto-apply, visibility to enterprise recruiters), and activity data (applications, interviews, messages) needed to operate the platform.</p>
          <p><strong className="text-foreground">Why:</strong> to match you with relevant opportunities, let enterprise recruiters search consented candidates, and operate your account. We never sell personal data.</p>
          <p><strong className="text-foreground">Consent:</strong> collection is purpose-specific — enabling &quot;visible to enterprises&quot; is separate from account creation, and you can withdraw it at any time from Settings with immediate effect.</p>
          <p><strong className="text-foreground">Your rights:</strong> you can export a copy of your data or request erasure at any time from <Link href="/settings" className="text-primary-soft hover:underline">Settings</Link>. Requests are actioned immediately for consent withdrawal, within 30 days for other rights.</p>
          <p><strong className="text-foreground">Retention:</strong> data is retained while your account is active, or as long as needed for the purpose it was collected for.</p>
          <p><strong className="text-foreground">Breach notification:</strong> we maintain the capability to notify the Data Protection Board and affected users within 72 hours of becoming aware of a personal data breach.</p>
          <p><strong className="text-foreground">Contact:</strong> [Grievance Officer contact — to be added].</p>
        </div>
      </div>
    </div>
  );
}
