/**
 * Preview fixtures for P11 account screens (mock mode). Real mode uses APIs or honest empties.
 */

export interface NotifPref {
  id: string;
  label: string;
  detail: string;
  enabled: boolean;
  /** Locked until the preferences API exists (gap #18 / #52). */
  deviceOnly?: boolean;
}

export interface HelpTopic {
  id: string;
  title: string;
  body: string;
}

const KEY = "arena_account_notif_prefs";

export function getDefaultNotifPrefs(): NotifPref[] {
  return [
    { id: "messages", label: "Messages", detail: "New chats and replies", enabled: true },
    { id: "activities", label: "Activities", detail: "Join requests and reminders", enabled: true },
    { id: "needs", label: "Needs & offers", detail: "When someone offers help", enabled: true },
    { id: "jobs", label: "Jobs", detail: "Application updates", enabled: true },
    { id: "jenny", label: "Jenny", detail: "Approvals and plan nudges", enabled: false, deviceOnly: true },
    { id: "marketing", label: "Tips from Arena", detail: "Occasional product tips", enabled: false, deviceOnly: true },
  ];
}

export function readNotifPrefs(): NotifPref[] {
  if (typeof window === "undefined") return getDefaultNotifPrefs();
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return JSON.parse(raw) as NotifPref[];
  } catch {
    /* fall through */
  }
  return getDefaultNotifPrefs();
}

export function writeNotifPrefs(prefs: NotifPref[]) {
  localStorage.setItem(KEY, JSON.stringify(prefs));
}

export function getHelpTopics(): HelpTopic[] {
  return [
    {
      id: "safety",
      title: "Stay safe nearby",
      body: "Meet in public places when you can. Exact meeting points are shared only after a host approves. Report anything that feels wrong — our team reviews every report.",
    },
    {
      id: "report",
      title: "Report or block",
      body: "Open any chat, profile or post menu → Report. You can also block someone so they can't contact you. Blocking is private.",
    },
    {
      id: "data",
      title: "Your data",
      body: "Download a copy of what Arena holds about you, or delete your account, from Account. Deletion can't be undone.",
    },
    {
      id: "jenny",
      title: "Jenny never acts alone",
      body: "Jenny drafts and suggests. She never publishes, applies or sends without your tap.",
    },
  ];
}

export interface EditProfileDraft {
  displayName: string;
  title: string;
  intro: string;
  interests: string[];
  availability: string[];
  photo?: string;
}

export function readEditDraft(): EditProfileDraft {
  if (typeof window === "undefined") {
    return { displayName: "", title: "", intro: "", interests: [], availability: [] };
  }
  try {
    const raw = localStorage.getItem("arena_entry_draft");
    if (raw) {
      const d = JSON.parse(raw) as Record<string, unknown>;
      return {
        displayName: String(d.displayName ?? ""),
        title: String(d.title ?? ""),
        intro: String(d.intro ?? ""),
        interests: Array.isArray(d.interests) ? (d.interests as string[]) : [],
        availability: Array.isArray(d.availability) ? (d.availability as string[]) : [],
        photo: typeof d.photo === "string" ? d.photo : undefined,
      };
    }
  } catch {
    /* fall through */
  }
  return { displayName: "Priya Sharma", title: "Neighbour", intro: "", interests: ["Running"], availability: ["Weekends"] };
}

export function writeEditDraft(draft: EditProfileDraft) {
  const prev = (() => {
    try {
      return JSON.parse(localStorage.getItem("arena_entry_draft") || "{}") as Record<string, unknown>;
    } catch {
      return {};
    }
  })();
  localStorage.setItem(
    "arena_entry_draft",
    JSON.stringify({
      ...prev,
      displayName: draft.displayName,
      title: draft.title,
      intro: draft.intro,
      interests: draft.interests,
      availability: draft.availability,
      photo: draft.photo,
    }),
  );
}
