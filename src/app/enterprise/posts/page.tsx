"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, m } from "motion/react";
import { Heart, MessageCircle, Plus, Trash2 } from "lucide-react";
import { rise, shake } from "@/lib/motion";
import { EnterpriseAppShell } from "@/components/app/EnterpriseAppShell";
import { BottomSheet } from "@/components/bplus/BottomSheet";
import { Button } from "@/components/bplus/Button";
import { Skeleton, StateCard } from "@/components/bplus/Primitives";
import { DashButton } from "@/components/dash/Parts";
import { getMyEnterpriseProfile } from "@/lib/api/enterprise";
import { createCompanyPost, deleteCompanyPost, getMyCompanyPosts } from "@/lib/api/companyPosts";
import { requireEnterpriseOnboarded } from "@/lib/auth-guard";
import { timeAgo } from "@/lib/data/time";
import type { EnterpriseProfile, Post } from "@/lib/types";

const MAX = 1000;

/** Arena for Business — Company posts (no board — designed in B+). Same companyPosts calls:
 *  updates published as the company into people's Feed. */
export default function CompanyPostsPage() {
  const router = useRouter();
  const [profile, setProfile] = useState<EnterpriseProfile | null>(null);
  const [posts, setPosts] = useState<Post[] | null>(null);
  const [open, setOpen] = useState(false);
  const [body, setBody] = useState("");
  const [tags, setTags] = useState("");
  const [touched, setTouched] = useState(false);
  const [shakeKey, setShakeKey] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [removing, setRemoving] = useState<Post | null>(null);

  const load = () => getMyCompanyPosts().then((p) => setPosts(p.content)).catch(() => { setPosts([]); setError("Posts didn't load. Refresh to try again."); });

  useEffect(() => {
    if (!requireEnterpriseOnboarded(router)) return;
    getMyEnterpriseProfile().then(setProfile).catch(() => {});
    void load();
  }, [router]);

  const fieldError = touched && !body.trim() ? "Write something to post." : body.length > MAX ? `Keep it under ${MAX} characters.` : "";

  const publish = async () => {
    setTouched(true);
    if (!body.trim() || body.length > MAX) {
      setShakeKey((k) => k + 1);
      return;
    }
    setBusy(true);
    setError("");
    try {
      await createCompanyPost({ body: body.trim(), tags: tags.split(",").map((t) => t.trim().replace(/^#/, "")).filter(Boolean) });
      setBody("");
      setTags("");
      setTouched(false);
      setOpen(false);
      await load();
    } catch {
      setError("Didn't publish. Your post is still here — try again.");
    } finally {
      setBusy(false);
    }
  };

  const remove = async (p: Post) => {
    setBusy(true);
    try {
      await deleteCompanyPost(p.id);
      setRemoving(null);
      await load();
    } catch {
      setError("Didn't delete. Try again.");
    } finally {
      setBusy(false);
    }
  };

  const visible = (posts ?? []).filter((p) => p.status !== "cancelled");

  return (
    <EnterpriseAppShell title="Company posts" profile={profile} actions={<DashButton onClick={() => setOpen(true)}><Plus className="size-4" aria-hidden /> New post</DashButton>}>
      <p className="mb-5 max-w-[60ch] text-[15px] text-faint">Hiring news and updates, published as {profile?.companyName ?? "your company"} into people&apos;s Feed.</p>
      {error && !open && <p role="alert" className="mb-4 rounded-xl bg-danger/12 px-3.5 py-2.5 text-[14px]">{error}</p>}
      {!posts ? (
        <div className="space-y-3"><Skeleton className="h-28" /><Skeleton className="h-28" /></div>
      ) : visible.length === 0 ? (
        <StateCard kind="empty" title="No company posts yet" detail="Share an update — a new role, an event, what your team is building." action={<DashButton onClick={() => setOpen(true)}>Write a post</DashButton>} />
      ) : (
        <m.ul initial="hidden" animate="shown" className="max-w-[720px] space-y-3">
          <AnimatePresence initial={false}>
            {visible.map((p, i) => (
              <m.li key={p.id} layout variants={rise} custom={i} exit={{ opacity: 0, x: -12 }} className="rounded-tile border border-line bg-surface p-5">
                <p className="whitespace-pre-wrap text-[15px] leading-relaxed">{p.body}</p>
                {p.tags.length > 0 && <p className="mt-2 flex flex-wrap gap-1.5">{p.tags.map((t) => <span key={t} className="rounded-full bg-foreground/8 px-2.5 py-0.5 text-[13px]">#{t}</span>)}</p>}
                <div className="mt-3 flex items-center gap-4 text-[13px] text-faint">
                  <span>{timeAgo(p.createdAt)}</span>
                  <span className="inline-flex items-center gap-1"><Heart className="size-4" aria-hidden /> {p.reactionCount}<span className="sr-only"> reactions</span></span>
                  <span className="inline-flex items-center gap-1"><MessageCircle className="size-4" aria-hidden /> {p.commentCount}<span className="sr-only"> comments</span></span>
                  <button type="button" onClick={() => setRemoving(p)} className="ml-auto inline-flex min-h-11 items-center gap-1.5 rounded-full px-3 font-semibold text-danger-on-dark hover:bg-danger/10"><Trash2 className="size-4" aria-hidden /> Delete</button>
                </div>
              </m.li>
            ))}
          </AnimatePresence>
        </m.ul>
      )}

      <BottomSheet open={open} onClose={() => !busy && setOpen(false)} title="New company post">
        <h2 className="font-display-serif text-[24px] leading-tight">New company post</h2>
        <p className="mt-1 text-[14px] text-paper-ink-muted">Published as {profile?.companyName ?? "your company"}, visible in everyone&apos;s Feed.</p>
        <m.div key={shakeKey} animate={shakeKey ? { x: [...shake.x] } : undefined} transition={shake.transition}>
          <label className="mt-4 block text-[15px] font-semibold" htmlFor="post-body">Post</label>
          <textarea id="post-body" value={body} onChange={(e) => setBody(e.target.value)} onBlur={() => setTouched(true)} rows={5} aria-invalid={!!fieldError} aria-describedby="post-help" placeholder="e.g. We're hiring two community associates in Gachibowli — see our jobs." className="mt-1.5 w-full rounded-xl border border-paper-ink/25 bg-white p-3 text-[15px] aria-[invalid=true]:border-danger-on-paper" />
          <p id="post-help" className={fieldError ? "text-[13px] font-semibold text-danger-on-paper" : "text-right text-[13px] text-paper-ink-muted"}>{fieldError || `${body.length}/${MAX}`}</p>
        </m.div>
        <label className="mt-3 block text-[15px] font-semibold" htmlFor="post-tags">Tags <span className="font-normal text-paper-ink-muted">(optional, comma-separated)</span></label>
        <input id="post-tags" value={tags} onChange={(e) => setTags(e.target.value)} placeholder="hiring, events" className="mt-1.5 min-h-12 w-full rounded-xl border border-paper-ink/25 bg-white px-3 text-[15px]" />
        {error && open && <p role="alert" className="mt-3 text-[14px] font-semibold text-danger-on-paper">{error}</p>}
        <Button className="mt-5" loading={busy} onClick={publish}>Publish</Button>
      </BottomSheet>

      <BottomSheet open={!!removing} onClose={() => !busy && setRemoving(null)} title="Delete post">
        <h2 className="font-display-serif text-[24px] leading-tight">Delete this post?</h2>
        <p className="mt-2 text-[15px] text-paper-ink-muted">It disappears from Feed for everyone. This can&apos;t be undone.</p>
        <div className="mt-5 grid gap-2">
          <Button loading={busy} onClick={() => removing && remove(removing)}>Delete post</Button>
          <button type="button" onClick={() => setRemoving(null)} className="min-h-11 text-[15px] font-semibold text-paper-ink-muted">Keep it</button>
        </div>
      </BottomSheet>
    </EnterpriseAppShell>
  );
}
