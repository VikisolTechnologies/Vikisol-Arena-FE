"use client";

import Link from "next/link";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

/**
 * ARENA-INVENTORY-FIXES.md FIX 1 - the shared gate for account-only actions (Follow, Message,
 * Apply, Join, Save, comment) on pages that are now viewable logged-out. An action still needs
 * an account; it just shouldn't be hidden or silently dead for a visitor who hasn't signed up
 * yet - this is the one place that "you need an account for that" prompt lives.
 */
export function SignInPrompt({
  open,
  onOpenChange,
  action = "do that",
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  action?: string;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Sign in to {action}</DialogTitle>
          <DialogDescription>
            Create a free Arena account (or sign in) to {action} — everything else on this page
            stays visible without one.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>
            Not now
          </Button>
          <Button size="sm" render={<Link href="/auth" />} nativeButton={false}>
            Sign in
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
