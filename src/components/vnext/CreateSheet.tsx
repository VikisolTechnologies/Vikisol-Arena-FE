"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createPost } from "@/lib/api/posts";
import { createMyProject } from "@/lib/api/myProjects";
import { getSession } from "@/lib/session";

const KINDS = [
  { id: "ask", label: "I need something" },
  { id: "update", label: "I can offer something" },
  { id: "project", label: "Start a project" },
  { id: "job", label: "Create a job" },
  { id: "activity", label: "Create an activity" },
] as const;

export function CreateSheet({ open, onClose, guest }: { open: boolean; onClose: () => void; guest: boolean }) {
  const router = useRouter();
  const [kind, setKind] = useState<(typeof KINDS)[number]["id"] | null>(null);
  const [text, setText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (!open) return null;

  async function publish() {
    if (guest) return;
    setBusy(true);
    setError(null);
    try {
      if (kind === "project") {
        const project = await createMyProject({
          title: text.slice(0, 80) || "Untitled project",
          description: text,
          budgetMin: 10000,
          budgetMax: 50000,
          durationWeeks: 2,
          skills: [],
        });
        onClose();
        router.push(`/marketplace/${project.id}`);
        return;
      }
      if (kind === "ask" || kind === "update" || kind === "activity") {
        const post = await createPost({
          intentType: kind,
          body: text,
          title: text.slice(0, 80),
          audience: "global",
          visibility: "public",
        });
        onClose();
        router.push(`/feed/${post.id}`);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "That did not publish.");
    } finally {
      setBusy(false);
    }
  }

  const role = getSession()?.role;
  const canPostJob = role === "company_admin" || role === "recruiter";

  return (
    <div className="fixed inset-0 z-40 flex items-end bg-black/50 lg:items-center lg:justify-center" onClick={onClose}>
      <div className="w-full max-w-lg rounded-t-3xl bg-background p-5 lg:rounded-3xl" onClick={(event) => event.stopPropagation()}>
        <p className="font-display text-lg font-semibold">Create</p>
        {guest && (
          <p className="mt-3 text-sm">
            Sign in to publish. <Link href="/auth" className="text-primary-soft">Sign in</Link>
          </p>
        )}
        {!guest && !kind && (
          <div className="mt-3 grid gap-2">
            {KINDS.map((item) =>
              item.id === "job" && !canPostJob ? (
                <Link key={item.id} href="/auth" className="min-h-11 rounded-2xl border border-border px-4 py-3 text-left text-sm">
                  Create a job — needs a company seat
                </Link>
              ) : item.id === "job" ? (
                <Link key={item.id} href="/enterprise/postings" className="min-h-11 rounded-2xl border border-border px-4 py-3 text-left text-sm" onClick={onClose}>
                  Create a job
                </Link>
              ) : (
                <button key={item.id} type="button" className="min-h-11 rounded-2xl border border-border px-4 py-3 text-left text-sm" onClick={() => setKind(item.id)}>
                  {item.label}
                </button>
              ),
            )}
          </div>
        )}
        {kind && kind !== "job" && (
          <form
            className="mt-3 grid gap-3"
            onSubmit={(event) => {
              event.preventDefault();
              void publish();
            }}
          >
            <textarea value={text} onChange={(event) => setText(event.target.value)} required minLength={2} rows={4} className="rounded-2xl border border-border bg-card px-3 py-2 text-sm" placeholder="What should happen?" />
            {error && <p className="text-sm text-red-400">{error}</p>}
            <button type="submit" disabled={busy} className="min-h-11 rounded-full bg-primary text-sm font-semibold text-primary-foreground">
              {busy ? "Publishing" : "Publish"}
            </button>
          </form>
        )}
        <button type="button" className="mt-3 min-h-11 text-sm text-muted-foreground" onClick={onClose}>
          Close
        </button>
      </div>
    </div>
  );
}
