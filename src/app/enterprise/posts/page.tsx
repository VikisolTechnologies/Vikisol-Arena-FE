"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Heart, MessageCircle, Plus, Trash2 } from "lucide-react";
import { EnterpriseAppShell } from "@/components/app/EnterpriseAppShell";
import { OrbLoader } from "@/components/ui/orb-loader";
import { EmptyState } from "@/components/ui/empty-state";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { getMyEnterpriseProfile } from "@/lib/api/enterprise";
import { getMyCompanyPosts, createCompanyPost, deleteCompanyPost } from "@/lib/api/companyPosts";
import { requireEnterpriseOnboarded } from "@/lib/auth-guard";
import { formatFriendlyDateTime } from "@/lib/format";
import type { EnterpriseProfile, Post } from "@/lib/types";

// ARENA-V2-PRODUCT-ARCHITECTURE.md §3.5/§6 "Company posts appear in the feed... gives
// enterprises a reason to be here between hires" - post-spec reconciliation addition.
export default function CompanyPostsPage() {
  const router = useRouter();
  const [profile, setProfile] = useState<EnterpriseProfile | null>(null);
  const [posts, setPosts] = useState<Post[] | null>(null);
  const [composerOpen, setComposerOpen] = useState(false);
  const [body, setBody] = useState("");
  const [tags, setTags] = useState("");
  const [publishing, setPublishing] = useState(false);

  const load = () => { getMyCompanyPosts().then((p) => setPosts(p.content)); };

  useEffect(() => {
    if (!requireEnterpriseOnboarded(router)) return;
    getMyEnterpriseProfile().then(setProfile);
    load();
  }, [router]);

  const publish = async () => {
    if (!body.trim()) return;
    setPublishing(true);
    try {
      await createCompanyPost({ body: body.trim(), tags: tags.split(",").map((t) => t.trim()).filter(Boolean) });
      setBody("");
      setTags("");
      setComposerOpen(false);
      load();
    } finally {
      setPublishing(false);
    }
  };

  const remove = async (id: string) => {
    await deleteCompanyPost(id);
    load();
  };

  if (!profile) {
    return (
      <EnterpriseAppShell title="Company Posts">
        <OrbLoader className="h-96" />
      </EnterpriseAppShell>
    );
  }

  const visiblePosts = (posts ?? []).filter((p) => p.status !== "cancelled");

  return (
    <EnterpriseAppShell
      title="Company Posts"
      profile={profile}
      actions={
        <Button variant="primary-gradient" size="sm" className="gap-1.5" onClick={() => setComposerOpen(true)}>
          <Plus className="size-3.5" /> New post
        </Button>
      }
    >
      <p className="mb-4 text-sm text-muted-foreground">
        Hiring news, culture, updates - published as {profile.companyName} straight into every talent account&apos;s Feed.
      </p>

      {posts === null ? (
        <OrbLoader className="h-64" />
      ) : visiblePosts.length === 0 ? (
        <EmptyState title="No company posts yet" description="Publish your first update to show up in Feed." className="py-16" />
      ) : (
        <div className="space-y-3">
          {visiblePosts.map((p) => (
            <div key={p.id} className="rounded-2xl border border-border bg-white/[0.02] px-4 py-3.5">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <p className="whitespace-pre-wrap text-sm text-foreground/90">{p.body}</p>
                  {p.tags.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {p.tags.map((t) => <Badge key={t} variant="secondary" className="bg-white/5 text-[11px] text-muted-foreground">#{t}</Badge>)}
                    </div>
                  )}
                  <div className="mt-2.5 flex items-center gap-3 text-xs text-muted-foreground">
                    <span>{formatFriendlyDateTime(p.createdAt)}</span>
                    <span className="flex items-center gap-1"><Heart className="size-3" /> {p.reactionCount}</span>
                    <span className="flex items-center gap-1"><MessageCircle className="size-3" /> {p.commentCount}</span>
                  </div>
                </div>
                <Button variant="ghost-glass" size="icon-sm" onClick={() => remove(p.id)} aria-label="Delete post">
                  <Trash2 className="size-3.5 text-red-400" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={composerOpen} onOpenChange={setComposerOpen}>
        <DialogContent className="border-border bg-popover sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>New company post</DialogTitle>
            <DialogDescription>Published as {profile.companyName}, visible to everyone&apos;s Feed.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <Textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="e.g. We're hiring senior backend engineers - remote-friendly, apply in comments or check our postings."
              className="min-h-24 border-border bg-white/[0.03]"
            />
            <Input value={tags} onChange={(e) => setTags(e.target.value)} placeholder="Tags, comma-separated (optional)" className="border-border bg-white/[0.03]" />
            <Button variant="primary-gradient" size="sm" className="w-full" disabled={!body.trim() || publishing} onClick={publish}>
              {publishing ? "Publishing…" : "Publish"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </EnterpriseAppShell>
  );
}
