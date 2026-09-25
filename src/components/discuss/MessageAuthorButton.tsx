"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { MessageSquare } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { SignInPrompt } from "@/components/auth/SignInPrompt";
import { startChat } from "@/lib/api/messages";
import { getSession } from "@/lib/session";
import type { Post } from "@/lib/types";

/**
 * "Message the author" on a Discuss thread - as yourself or anonymously. Works on an anonymous
 * post too: the chat is started from the post, so neither side ever gets the other's account id.
 */
export function MessageAuthorButton({ post }: { post: Post }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [signInOpen, setSignInOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function start(anonymous: boolean) {
    setBusy(true);
    setError(null);
    try {
      const chat = await startChat({ postId: post.id, anonymous });
      router.push(`/messages/${chat.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't start that chat.");
      setBusy(false);
    }
  }

  return (
    <>
      <button
        type="button"
        aria-label="Message the author"
        title="Message the author"
        onClick={() => (getSession() ? setOpen(true) : setSignInOpen(true))}
        className="flex items-center justify-center rounded-full p-1 text-muted-foreground hover:text-foreground"
      >
        <MessageSquare className="size-4" strokeWidth={1.75} />
      </button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="border-border bg-popover sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Message {post.anonymous ? "the author" : post.authorName}</DialogTitle>
            <DialogDescription>
              {post.anonymous
                ? "They posted anonymously - they stay hidden from you. You choose whether they see your name."
                : "Choose whether they see your name."}
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-2">
            <Button disabled={busy} onClick={() => start(false)}>
              Message as me
            </Button>
            <Button variant="outline" disabled={busy} onClick={() => start(true)}>
              🎭 Message anonymously
            </Button>
            <p className="text-[11px] leading-relaxed text-muted-foreground">
              Anonymous chats can be closed or reported by either person, and Arena&apos;s moderators can still act on reports.
            </p>
            {error && <p className="text-[12px] text-red-400">{error}</p>}
          </div>
        </DialogContent>
      </Dialog>
      <SignInPrompt open={signInOpen} onOpenChange={setSignInOpen} action="send a message" />
    </>
  );
}
