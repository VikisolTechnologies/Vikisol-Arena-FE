export type TalentPlan = "free" | "pro";

const TALENT_PLAN_KEY = "arena_talent_plan";

export function getTalentPlan(): TalentPlan {
  if (typeof window === "undefined") return "free";
  return (localStorage.getItem(TALENT_PLAN_KEY) as TalentPlan) || "free";
}

export function setTalentPlan(plan: TalentPlan) {
  localStorage.setItem(TALENT_PLAN_KEY, plan);
}

/** Enterprise posting caps by plan — the one number the pricing page never actually stated,
 * but AUDIT.md flagged as an ungated limit. Enterprise plan is unlimited (Infinity). */
export const POSTING_LIMITS: Record<"free" | "pro" | "enterprise", number> = {
  free: 1,
  pro: 10,
  enterprise: Infinity,
};
