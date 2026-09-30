/**
 * Jenny's preview queue, reminders and recent activity (P8) — preview world only. In production
 * data mode next.config.ts swaps this module for preview-off/jenny.ts (empty), so none of it ships.
 */
import { person } from "@/lib/fixtures/world";
import type { QueueItem } from "@/lib/data/jenny";

const minsAgo = (m: number) => new Date(Date.now() - m * 60_000).toISOString();

/** Preview (mock) mode only: approving the reply to Rohit really posts it in his preview chat. */
export const PREVIEW_SEND = { itemId: "q-invite", conversationId: "conv-2", note: "Sent · waiting for Rohit" };

/** The sentence behind the drafted post — also what the Create screen opens with. */
export const DRAFT_SENTENCE = "Need two volunteers for lake cleanup Saturday at Gachibowli Lake";

export function queueFixtures(): QueueItem[] {
  const me = person("priya");
  const rohit = person("rohit");
  const arjun = person("arjun");
  return [
    {
      id: "q-post", group: "approval", icon: "post", title: "Post: Lake clean-up volunteers", detail: "Drafted by Jenny", flag: "Needs time and capacity", at: minsAgo(1), planTitle: "Review lake clean-up post",
      href: `/agent/draft?q=${encodeURIComponent(DRAFT_SENTENCE)}`,
    },
    {
      id: "q-invite", group: "approval", icon: "invite", title: "Respond to community invite", detail: "Drafted by Jenny", flag: "Confirm your interest", at: minsAgo(120),
      action: {
        question: "Send this message?",
        content: "Hi Rohit! Count me in for the Sunrise Run tomorrow — I'll see you at the amphitheatre steps.",
        signature: `— ${me.name.split(" ")[0]} (via Arena)`,
        recipients: { summary: `${rohit.name}, who invited you`, people: [rohit.name] },
        dataUsed: [`Your name (${me.name})`, "The run's details from Rohit's invite", "General area (Gachibowli)"],
        exactLocationShared: false,
        reversible: false,
        approveLabel: "Approve and send",
      },
    },
    {
      id: "q-share", group: "approval", icon: "share", title: "Share event to your groups", detail: "Drafted by Jenny", flag: "Review audience", at: minsAgo(240),
      action: {
        question: "Share this activity?",
        content: "Badminton doubles tonight, 6–7:30 PM near Gachibowli Stadium. Two spots left — intermediate level. Want in?",
        signature: `— ${me.name.split(" ")[0]} (via Arena)`,
        recipients: { summary: "4 neighbours who joined your badminton games", people: ["Ananya Rao", "Rohit Varma", "Meera Iyer", "Kabir Das"] },
        dataUsed: [`Your name (${me.name})`, "Activity details from your post", "Your interest in badminton", "General area (Gachibowli)"],
        exactLocationShared: false,
        reversible: false,
        approveLabel: "Approve and share",
      },
    },
    { id: "h-calendar", group: "handle", icon: "calendar", title: "Add to your calendar", detail: "Badminton doubles tonight", flag: "Ready for today, 6:00 PM", at: minsAgo(30), href: "/feed/post-1", automation: "calendar" },
    { id: "h-notify", group: "handle", icon: "notify", title: "Notify interested people", detail: "About your cycle repair question", flag: "Draft message ready", at: minsAgo(300), href: "/feed/post-me-ask", automation: "invite" },
    { id: "w-project", group: "waiting", icon: "project", title: "Lake map project proposal", detail: `Sent to ${arjun.name.split(" ")[0]} and 2 others`, flag: "Waiting for replies", at: minsAgo(60 * 26) },
    { id: "w-join", group: "waiting", icon: "join", title: "Pottery for beginners", detail: "Your request to join", flag: "Waiting for Sunita", at: minsAgo(60 * 19), href: "/feed/post-pottery" },
    { id: "w-job", group: "waiting", icon: "job", title: "Product Designer · Lakeshore Tech", detail: "Your application", flag: "Employer reviewing", at: minsAgo(60 * 24 * 4), href: "/applications/app-priya-1" },
  ];
}

export const RECENT_FIXTURES = [
  { icon: "post" as const, text: "Drafted a lake clean-up post", at: minsAgo(120) },
  { icon: "calendar" as const, text: "Got your badminton game ready for your calendar", at: minsAgo(240) },
  { icon: "invite" as const, text: "Suggested 3 people to invite", at: minsAgo(60 * 26) },
];

export const REMINDER_FIXTURES = [
  { id: "r-run", title: "Sunrise Run tomorrow, 6:30 AM", detail: "Rohit's group meets at the amphitheatre steps", when: "Tonight, 9:00 PM" },
  { id: "r-chat", title: "First chat with Lakeshore Tech", detail: "They asked for 20 minutes on Thursday", when: "Thursday, 9:00 AM" },
  { id: "r-lunch", title: "Lunch at Lakshmi's", detail: "Bring a box for the payasam", when: "Sunday, 12:00 PM" },
];

