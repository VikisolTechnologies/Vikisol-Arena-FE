import { chromium } from "@playwright/test";
import sharp from "sharp";
const ids = process.argv.slice(2);
const R = { inbox: "/rooms", notifications: "/notifications", search: "/search?q=garden", "settings-privacy": "/settings" };
const ago = (m) => new Date(Date.now() - m * 60000).toISOString();
const b = await chromium.launch();
const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
const page = await ctx.newPage();
await page.route("**/api/v1/**", async (route) => {
  const p = new URL(route.request().url()).pathname.replace(/^.*\/api\/v1/, "");
  let data = [];
  if (p === "/rooms") data = [
    { id: "r1", postId: "a", postBody: "Sunrise Run at Durgam Lake", postIntentType: "activity", memberCount: 18, unread: true, muted: false, postStatus: "open", lastMessageAt: ago(12), lastMessagePreview: "Ananya: See you at 6:30!" },
    { id: "r2", postId: "b", postBody: "Help move a sofa", postIntentType: "ask", memberCount: 2, unread: true, muted: false, postStatus: "open", lastMessageAt: ago(50), lastMessagePreview: "Rohit: Sounds good!" },
    { id: "r3", postId: "c", postBody: "Beach Clean-Up", postIntentType: "activity", memberCount: 9, unread: false, muted: false, postStatus: "open", lastMessageAt: ago(60 * 30), lastMessagePreview: "Team: Final details inside" }];
  else if (p === "/messages/conversations") data = [
    { id: "c1", participantId: "u1", participantName: "Meera Iyer", participantEmoji: "m", lastMessageAt: ago(90), unread: false },
    { id: "c2", participantId: "u2", participantName: "Graphic design help", participantEmoji: "g", context: "Freelance · Priya's draft", lastMessageAt: ago(60 * 26), unread: false }];
  else if (p === "/notifications") data = { content: [
    { id: "n1", type: "system", title: "Upcoming activity", body: "Beach Clean-Up starts tomorrow at 7:00 AM", timestamp: ago(120), read: false, link: "/feed/x" },
    { id: "n2", type: "system", title: "New response to your need", body: "Rohit offered to help move a sofa on Oct 14", timestamp: ago(240), read: false, link: "/rooms/r2" },
    { id: "n3", type: "interview", title: "New job post near you", body: "Graphic design help", timestamp: ago(360), read: true, link: "/jobs/j1" },
    { id: "n4", type: "system", title: "Message from Meera", body: "Re: Community Garden Setup", timestamp: ago(60 * 26), read: true, link: "/messages/c1" }], totalElements: 4, totalPages: 1, number: 0, size: 50 };
  else if (p === "/search") data = { query: "garden", activities: [{ id: "s1", authorUserId: "x", authorName: "A", authorEmoji: "a", intentType: "activity", title: "Community Garden Setup", body: "Plant together", locationText: "Gopanapally", audience: "global", visibility: "public", spotsFilled: 3, status: "open", tags: [], mediaUrls: [], joinable: true, createdAt: ago(100), commentCount: 0, reactionCount: 0, authorJoinCount: 1, authorAccountAgeDays: 9, demoContent: false }],
    discussions: [{ id: "s2", authorUserId: "x", authorName: "B", authorEmoji: "b", intentType: "ask", title: "Help with garden maintenance", body: "Flexible dates", locationText: "Gachibowli", audience: "global", visibility: "approval", spotsFilled: 0, status: "open", tags: [], mediaUrls: [], joinable: true, createdAt: ago(300), commentCount: 0, reactionCount: 0, authorJoinCount: 1, authorAccountAgeDays: 9, demoContent: false }], jobs: [], projects: [], companies: [] };
  else if (p.startsWith("/profile/me")) data = { id: "me", name: "Priya Sharma", avatarEmoji: "p", title: "", industry: "Design", location: "", homeCity: "Gachibowli", locationConsent: "precise", remote: false, skills: [], experienceYears: 0, rateFloor: 0, openTo: [], careerHealth: 0, consent: { autoApply: false, searchableByEnterprises: true }, autonomy: "supervised" };
  await route.fulfill({ json: { success: true, data } });
});
await page.goto("http://localhost:3001/auth");
await page.evaluate(() => { localStorage.setItem("arena_cookie_consent","accepted"); localStorage.setItem("arena_session", JSON.stringify({role:"talent",name:"Priya Sharma",email:"priya@example.com"})); localStorage.setItem("arena_onboarded","true"); });
for (const id of ids) {
  await page.goto(`http://localhost:3001${R[id] ?? "/dev/screen/" + id}`, { waitUntil: "networkidle" });
  await page.waitForTimeout(1500);
  const L = await sharp(await page.screenshot()).resize(780, 1688).toBuffer();
  const B = await sharp(`public/dev/boards/${id}.webp`).resize(780, 1688, { fit: "contain", background: "#000" }).toBuffer();
  await sharp({ create: { width: 1580, height: 1688, channels: 3, background: "#fff" } }).composite([{ input: B, left: 0, top: 0 }, { input: L, left: 800, top: 0 }]).jpeg({ quality: 70 }).toFile(`docs/reviews/p5/${id}.jpg`);
  console.log(id);
}
await b.close();
