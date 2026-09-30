"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AccountPage } from "@/components/account/AccountPage";
import { Button } from "@/components/bplus/Button";
import { Checkbox } from "@/components/bplus/Controls";
import { StateCard } from "@/components/bplus/Primitives";
import { deleteMyAccount } from "@/lib/api/profile";
import { clearSession } from "@/lib/session";

export default function DeleteAccountPage() {
  const router = useRouter();
  const [understood, setUnderstood] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const confirm = async () => {
    if (!understood) {
      setError("Tick the box to confirm you understand.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      await deleteMyAccount();
      clearSession();
      router.replace("/auth?mode=signin");
    } catch {
      setError("Your account wasn't deleted. Try again.");
      setBusy(false);
    }
  };

  return (
    <AccountPage title="Delete account" lede="This permanently removes your Arena account. It can't be undone.">
      <div className="space-y-4 rounded-tile bg-paper p-5 text-paper-ink">
        <p className="text-[15px] font-semibold">What happens</p>
        <ul className="list-disc space-y-2 pl-5 text-[14px] leading-relaxed text-paper-ink-muted">
          <li>Your profile, posts you own, and chat memberships are removed or anonymised.</li>
          <li>Applications and company unlocks tied to you are deleted.</li>
          <li>Every signed-in session is revoked immediately.</li>
          <li>Drafts on this device stay until you clear them yourself.</li>
        </ul>
      </div>
      <div className="mt-5">
        <Checkbox checked={understood} onChange={setUnderstood} error={error && !understood ? error : undefined}>
          I understand this can&apos;t be undone and I want to delete my account.
        </Checkbox>
      </div>
      {error && understood && (
        <div className="mt-4">
          <StateCard kind="error" title="Deletion failed" detail={error} />
        </div>
      )}
      <div className="mt-6 space-y-3">
        <Button type="button" onClick={confirm} loading={busy} className="!bg-danger hover:!bg-danger">
          Delete my account forever
        </Button>
        <Button type="button" variant="outline" onClick={() => router.push("/settings")} className="!text-paper-ink border-paper-ink/40">
          Keep my account
        </Button>
      </div>
    </AccountPage>
  );
}
