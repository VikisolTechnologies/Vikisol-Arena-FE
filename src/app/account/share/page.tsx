"use client";

import { useEffect, useState } from "react";
import { Check, Copy, Link2 } from "lucide-react";
import { AccountPage } from "@/components/account/AccountPage";
import { Button } from "@/components/bplus/Button";
import { StateCard } from "@/components/bplus/Primitives";
import { getSession } from "@/lib/session";
import { ME } from "@/lib/fixtures/world";
import { isRealMode } from "@/lib/api/mode";

export default function ShareProfilePage() {
  const [url, setUrl] = useState("");
  const [copied, setCopied] = useState(false);
  const [shareError, setShareError] = useState("");

  useEffect(() => {
    const id = getSession()?.candidateId || ME.id;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setUrl(`${window.location.origin}/people/${id}`);
  }, []);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setShareError("");
    } catch {
      setShareError("Couldn't copy. Select the link and copy it yourself.");
    }
  };

  const nativeShare = async () => {
    if (!navigator.share) {
      await copy();
      return;
    }
    try {
      await navigator.share({ title: "My Arena profile", url, text: "Find me on Arena." });
    } catch {
      /* user cancelled */
    }
  };

  return (
    <AccountPage title="Share profile" lede="Send a link to your public profile. Only what you've made visible is shown.">
      {!isRealMode() && (
        <div className="mb-4">
          <StateCard kind="empty" title="Preview link" detail="In preview this opens the public profile specimen." />
        </div>
      )}
      <div className="rounded-tile bg-paper p-4 text-paper-ink">
        <p className="flex items-center gap-2 text-[13px] font-medium text-paper-ink-muted">
          <Link2 className="size-4" aria-hidden /> Your public link
        </p>
        <p className="mt-2 break-all font-mono text-[13px]">{url || "…"}</p>
      </div>
      {shareError && (
        <div className="mt-4">
          <StateCard kind="error" title="Copy failed" detail={shareError} />
        </div>
      )}
      <div className="mt-6 space-y-3">
        <Button type="button" onClick={copy} success={copied} disabled={!url}>
          {copied ? (
            <>
              <Check className="size-5" aria-hidden /> Copied
            </>
          ) : (
            <>
              <Copy className="size-5" aria-hidden /> Copy link
            </>
          )}
        </Button>
        <Button type="button" variant="outline" onClick={nativeShare} disabled={!url} className="!text-paper-ink border-paper-ink/40">
          Share…
        </Button>
      </div>
      <p className="mt-4 text-[13px] text-paper-ink-muted">
        If your profile visibility is Hidden, neighbours who open the link see a private message instead of your details (gap #60).
      </p>
    </AccountPage>
  );
}
