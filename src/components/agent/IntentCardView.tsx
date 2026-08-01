"use client";

import { Briefcase, DollarSign, PlusCircle, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { IntentCard, IntentType } from "@/lib/types";

const ICONS: Record<IntentType, typeof Briefcase> = {
  apply: Briefcase,
  place_bid: DollarSign,
  create_job: PlusCircle,
};

export function IntentCardView({
  card,
  onApprove,
  onReject,
}: {
  card: IntentCard;
  onApprove: (card: IntentCard) => void;
  onReject: (card: IntentCard) => void;
}) {
  const Icon = ICONS[card.type];
  return (
    <div className="mt-2 max-w-sm rounded-2xl border border-primary/30 bg-primary/[0.06] p-4">
      <div className="flex items-center gap-2">
        <span className="flex size-8 items-center justify-center rounded-lg bg-primary/15 text-primary-soft">
          <Icon className="size-4" />
        </span>
        <p className="text-sm font-semibold">{card.summary}</p>
      </div>

      {card.status === "pending" ? (
        <div className="mt-3 flex gap-2">
          <Button variant="primary-gradient" size="sm" className="flex-1 gap-1.5" onClick={() => onApprove(card)}>
            <Check className="size-3.5" /> Approve
          </Button>
          <Button variant="ghost-glass" size="sm" className="flex-1 gap-1.5" onClick={() => onReject(card)}>
            <X className="size-3.5" /> Not now
          </Button>
        </div>
      ) : (
        <Badge
          variant="secondary"
          className={`mt-3 ${card.status === "approved" ? "bg-emerald-500/15 text-emerald-400" : "bg-white/10"}`}
        >
          {card.status === "approved" ? "Done ✓" : "Skipped"}
        </Badge>
      )}
    </div>
  );
}
