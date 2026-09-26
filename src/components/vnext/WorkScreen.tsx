"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { getMyApplications } from "@/lib/api/applications";
import { getSession } from "@/lib/session";
import { JennySlot, Card, useLoad } from "./shared";
import { Status, VNextShell } from "./Shell";

export function WorkScreen() {
  const [guest, setGuest] = useState<boolean | null>(null);
  useEffect(() => {
    setGuest(!getSession());
  }, []);
  const { data, error } = useLoad(() => (guest === false ? getMyApplications() : Promise.resolve(null)), [guest]);
  return (
    <VNextShell>
      <p className="font-display text-2xl font-semibold">Work</p>
      <JennySlot surface="Work" />
      {guest && (
        <Status kind="empty" title="Sign in to see your work" detail="Applications, joins, and projects you are part of stay on your account." />
      )}
      {guest && (
        <p className="mt-3 text-center">
          <Link href="/auth" className="inline-flex min-h-11 items-center text-sm font-semibold text-primary-soft">Sign in</Link>
        </p>
      )}
      {!guest && error && <Status kind="error" title="Work did not load" detail={error} />}
      {!guest && !error && !data && <Status kind="loading" title="Loading" />}
      {!guest && data && data.length === 0 && <Status kind="empty" title="You are not in anything yet" detail="When you apply, join, or start a project, it will be listed here." />}
      {!guest && data && data.length > 0 && (
        <div className="grid gap-3">
          {data.map((application) => (
            <Card key={application.id} href={`/applications/${application.id}`} title={`Application · ${application.stage}`} meta="Open the record" />
          ))}
        </div>
      )}
    </VNextShell>
  );
}
