"use client";

import { useState } from "react";
import { Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { createPost } from "@/lib/api/posts";
import type { Post, PostAudience, PostVisibility } from "@/lib/types";

const INTENTS: { key: Post["intentType"]; label: string; hint: string }[] = [
  { key: "activity", label: "Activity", hint: "A game, a trek, a meetup - people join you in real life" },
  { key: "ask", label: "Ask", hint: "A question or a need - people respond, you pick who to talk to" },
  { key: "update", label: "Update", hint: "Just a post for the feed - no joining, no room" },
];

export function PostComposer({ open, onOpenChange, onPublished }: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onPublished: () => void;
}) {
  const [intent, setIntent] = useState<Post["intentType"]>("activity");
  const [body, setBody] = useState("");
  const [location, setLocation] = useState("");
  const [visibility, setVisibility] = useState<PostVisibility>("public");
  const [audience, setAudience] = useState<PostAudience>("global");
  const [capacity, setCapacity] = useState("");
  const [tags, setTags] = useState("");
  const [publishing, setPublishing] = useState(false);

  const joinable = intent === "activity" || intent === "ask";

  const reset = () => {
    setIntent("activity"); setBody(""); setLocation(""); setVisibility("public");
    setAudience("global"); setCapacity(""); setTags("");
  };

  const publish = async () => {
    if (!body.trim()) return;
    setPublishing(true);
    try {
      await createPost({
        intentType: intent,
        body: body.trim(),
        locationText: location.trim() || undefined,
        audience,
        visibility: joinable ? visibility : "public",
        capacity: joinable && capacity ? Number(capacity) : undefined,
        tags: tags.split(",").map((t) => t.trim()).filter(Boolean),
      });
      reset();
      onOpenChange(false);
      onPublished();
    } finally {
      setPublishing(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="border-border bg-popover sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>New post</DialogTitle>
          <DialogDescription>What do you need, or what do you want to share?</DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="grid grid-cols-3 gap-1.5">
            {INTENTS.map(({ key, label }) => (
              <button
                key={key}
                type="button"
                onClick={() => setIntent(key)}
                className={cn(
                  "rounded-full border px-3 py-2 text-xs font-medium transition-colors",
                  intent === key ? "border-primary/60 bg-primary/10 text-primary-soft" : "border-border bg-white/[0.02] text-muted-foreground hover:border-white/20",
                )}
              >
                {label}
              </button>
            ))}
          </div>
          <p className="text-[11px] text-muted-foreground">{INTENTS.find((i) => i.key === intent)?.hint}</p>

          <Textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder={intent === "activity" ? "e.g. Badminton at 6pm today, need 2 more for doubles" : intent === "ask" ? "e.g. Anyone used a good invoicing tool for freelance work?" : "What's on your mind?"}
            className="min-h-24 border-border bg-white/[0.03]"
          />

          {intent === "activity" && (
            <Input
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="Where (e.g. Gachibowli) - kept general, no exact address"
              className="border-border bg-white/[0.03]"
            />
          )}

          {joinable && (
            <div className="flex flex-wrap gap-3">
              <div className="flex items-center gap-1.5">
                <span className="text-[11px] text-muted-foreground">Who can join:</span>
                {(["public", "approval"] as const).map((v) => (
                  <button
                    key={v}
                    type="button"
                    onClick={() => setVisibility(v)}
                    className={cn(
                      "rounded-full border px-3 py-1 text-[11px] font-medium transition-colors",
                      visibility === v ? "border-primary/60 bg-primary/10 text-primary-soft" : "border-border bg-white/[0.02] text-muted-foreground",
                    )}
                  >
                    {v === "public" ? "Anyone" : "I approve"}
                  </button>
                ))}
              </div>
              {intent === "activity" && (
                <Input
                  type="number"
                  min={1}
                  value={capacity}
                  onChange={(e) => setCapacity(e.target.value)}
                  placeholder="Spots (optional)"
                  className="h-8 w-28 border-border bg-white/[0.03] text-xs"
                />
              )}
            </div>
          )}

          <div className="flex items-center gap-1.5">
            <span className="text-[11px] text-muted-foreground">Visible to:</span>
            {(["global", "followers"] as const).map((a) => (
              <button
                key={a}
                type="button"
                onClick={() => setAudience(a)}
                className={cn(
                  "rounded-full border px-3 py-1 text-[11px] font-medium transition-colors",
                  audience === a ? "border-primary/60 bg-primary/10 text-primary-soft" : "border-border bg-white/[0.02] text-muted-foreground",
                )}
              >
                {a === "global" ? "Everyone" : "Followers only"}
              </button>
            ))}
          </div>

          <Input
            value={tags}
            onChange={(e) => setTags(e.target.value)}
            placeholder="Tags, comma-separated (optional)"
            className="border-border bg-white/[0.03]"
          />

          <Button variant="primary-gradient" size="sm" className="w-full gap-1.5" disabled={!body.trim() || publishing} onClick={publish}>
            <Sparkles className="size-3.5" /> {publishing ? "Publishing…" : "Publish"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
