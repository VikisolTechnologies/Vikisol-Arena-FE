"use client";

import { useEffect, useState } from "react";
import { ShieldCheck, ShieldAlert } from "lucide-react";
import { CompanyAdminShell } from "@/components/app/CompanyAdminShell";
import { OrbLoader } from "@/components/ui/orb-loader";
import { Badge } from "@/components/ui/badge";
import { getConsentView, type ConsentEntry } from "@/lib/api/companyAdmin";
import { formatDate } from "@/lib/format";

export default function ConsentPage() {
  const [entries, setEntries] = useState<ConsentEntry[] | null>(null);

  useEffect(() => {
    getConsentView().then(setEntries);
  }, []);

  return (
    <CompanyAdminShell title="Consent & compliance">
      <p className="mb-5 max-w-xl text-sm text-muted-foreground">
        Every candidate your team has unlocked, and whether they still consent to being
        searchable. If a candidate withdraws consent, they disappear from here immediately -
        their unlocked contact is revoked from view.
      </p>
      {!entries ? (
        <OrbLoader className="h-64" />
      ) : (
        <div className="space-y-2">
          {entries.map((e) => (
            <div key={e.candidateId} className="flex items-center gap-3 rounded-2xl border border-border bg-white/[0.02] px-4 py-3.5">
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium">{e.candidateName}</p>
                <p className="text-xs text-muted-foreground">Unlocked {formatDate(e.unlockedAt)}</p>
              </div>
              {e.stillConsenting ? (
                <Badge variant="secondary" className="gap-1 bg-emerald-500/15 text-emerald-400">
                  <ShieldCheck className="size-3" /> Consenting
                </Badge>
              ) : (
                <Badge variant="secondary" className="gap-1 bg-red-500/15 text-red-400">
                  <ShieldAlert className="size-3" /> Withdrawn
                </Badge>
              )}
            </div>
          ))}
          {entries.length === 0 && (
            <p className="rounded-2xl border border-dashed border-border-strong px-6 py-12 text-center text-sm text-muted-foreground">
              No candidates unlocked yet.
            </p>
          )}
        </div>
      )}
    </CompanyAdminShell>
  );
}
