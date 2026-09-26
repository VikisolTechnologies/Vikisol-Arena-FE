"use client";

import { useEffect, useState } from "react";
import { AGENT_UNAVAILABLE_MESSAGE, decideAgentAction, getOrCreateAgentConversation, sendAgentMessage } from "@/lib/api/agent";
import { getSession } from "@/lib/session";
import type { AgentAction } from "@/lib/types";

/**
 * One real note from Jenny, or nothing. Arena does not invent the sentence.
 * The call goes through Arena's agent API, which already uses the live gateway.
 */
export function JennySlot({ surface }: { surface: string }) {
  const [text, setText] = useState<string | null>(null);
  const [actions, setActions] = useState<AgentAction[]>([]);
  const [decided, setDecided] = useState<string | null>(null);

  useEffect(() => {
    if (!getSession()) return;
    let cancelled = false;
    (async () => {
      try {
        const conversation = await getOrCreateAgentConversation();
        const reply = await sendAgentMessage(
          conversation.id,
          `Surface: ${surface}. Using only real Arena results, give one concrete next step in a single sentence, with a real link if you have one. If you have nothing concrete, reply with exactly NONE.`,
        );
        if (cancelled) return;
        const content = reply.content?.trim() ?? "";
        if (!content || content === "NONE" || reply.serviceUnavailable || content === AGENT_UNAVAILABLE_MESSAGE) return;
        setText(content);
        setActions(reply.actions ?? []);
      } catch {
        if (!cancelled) setText(null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [surface]);

  if (!text) return null;

  return (
    <aside className="mb-4 rounded-3xl border border-primary/30 bg-primary/10 px-4 py-3">
      <p className="text-xs font-medium text-primary-soft">Jenny</p>
      <p className="mt-1 text-sm">{text}</p>
      {actions.map((action) => (
        <div key={action.id} className="mt-3 flex gap-2">
          <button type="button" className="min-h-11 rounded-full bg-primary px-4 text-sm font-semibold text-primary-foreground" onClick={() => decide(action.id, true)}>
            Approve
          </button>
          <button type="button" className="min-h-11 rounded-full border border-border px-4 text-sm" onClick={() => decide(action.id, false)}>
            Not now
          </button>
        </div>
      ))}
      {decided && <p className="mt-2 text-xs text-muted-foreground">{decided}</p>}
    </aside>
  );

  async function decide(actionId: string, approve: boolean) {
    try {
      await decideAgentAction(actionId, approve);
      setDecided(approve ? "Approved. Jenny will run that now." : "Left as a draft.");
      setActions([]);
    } catch {
      setDecided("That did not go through. Nothing was changed.");
    }
  }
}
