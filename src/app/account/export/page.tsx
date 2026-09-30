"use client";

import { useState } from "react";
import { Download } from "lucide-react";
import { AccountPage } from "@/components/account/AccountPage";
import { Button } from "@/components/bplus/Button";
import { StateCard } from "@/components/bplus/Primitives";
import { exportMyData } from "@/lib/api/profile";

export default function DownloadDataPage() {
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");

  const run = async () => {
    setBusy(true);
    setError("");
    try {
      const data = await exportMyData();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `arena-data-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      setDone(true);
    } catch {
      setError("The download didn't start. Try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <AccountPage title="Download my data" lede="A copy of what Arena holds about you — profile, applications and account details.">
      <StateCard
        kind="saved"
        title="Your rights"
        detail="This export is for you. You can also delete your account from Account → Delete account."
      />
      {error && (
        <div className="mt-4">
          <StateCard kind="error" title="Couldn't export" detail={error} />
        </div>
      )}
      <div className="mt-6">
        <Button type="button" onClick={run} loading={busy} success={done}>
          <Download className="size-5" aria-hidden /> {done ? "Downloaded" : "Download JSON"}
        </Button>
      </div>
    </AccountPage>
  );
}
