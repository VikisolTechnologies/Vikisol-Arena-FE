"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { isRealMode } from "@/lib/api/mode";
import { setOnboarded, setSession } from "@/lib/session";

/** Keys the preview world lives in; cleared so every visit starts from the same fresh week. */
const WORLD_KEYS = [
  "arena_posts", "arena_post_joins", "arena_post_comments", "arena_post_reactions", "arena_post_saves",
  "arena_rooms", "arena_room_members", "arena_room_messages", "arena_conversations", "arena_thread_messages",
  "arena_onboarding_profile",
];

/** Preview-only: signs this browser in as Priya Sharma, a demo neighbour in Gachibowli, in MOCK
 *  mode, resets the preview world, then opens `?to=`. Never runs against the real API, and /dev
 *  is 404 in production. The business twin is /dev/business. */
function Seed() {
  const router = useRouter();
  const params = useSearchParams();
  const to = params.get("to") ?? "/home";
  // stage=onboarding: signed in but not onboarded, for the P1 onboarding boards. Early steps
  // start with an empty draft (as on the boards); later steps show Priya's answers.
  const onboarding = params.get("stage") === "onboarding";
  const earlyStep = /step=[12]\b/.test(to);
  const [blocked] = useState(() => isRealMode());

  useEffect(() => {
    if (blocked) return;
    for (const k of WORLD_KEYS) localStorage.removeItem(k);
    setSession({ role: "talent", candidateId: "cand-1", name: "Priya Sharma", email: "priya@example.com" });
    if (onboarding) {
      localStorage.removeItem("arena_onboarded");
      // The "all set" step shows only after a save this session; the preview stands in for it.
      if (/step=4\b/.test(to)) sessionStorage.setItem("arena_entry_saved", "1");
    }
    else setOnboarded();
    localStorage.setItem("arena_cookie_consent", "accepted");
    if (onboarding && earlyStep) localStorage.removeItem("arena_entry_draft");
    else localStorage.setItem(
      "arena_entry_draft",
      JSON.stringify({
        intents: ["activities", "offer", "meet"],
        area: "Gachibowli / Gopanapally",
        useCurrentLocation: false,
        interests: ["Running", "Badminton", "Volunteering", "Food"],
        photo: "/fixtures/people/priya.webp",
        displayName: "Priya Sharma",
        title: "Product Designer",
        intro: "Designer by day, runner at sunrise. Happy to help with anything visual.",
        availability: ["Weekends", "Evenings"],
      }),
    );
    window.dispatchEvent(new Event("arena-entry"));
    // A full load, so shell-level state (session, cookie bar) is read fresh.
    window.location.replace(to);
  }, [blocked, router, to, onboarding, earlyStep]);

  return <p className="p-6 text-[15px] text-faint">{blocked ? "The person demo only runs in mock mode." : "Opening Priya's preview…"}</p>;
}

export default function DevPersonPage() {
  return (
    <Suspense>
      <Seed />
    </Suspense>
  );
}
