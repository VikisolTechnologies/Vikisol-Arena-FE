/**
 * A tiny stand-in API for the performance pass (docs/reviews/performance.md): lets a PRODUCTION
 * build (NEXT_PUBLIC_ARENA_DATA=api) render real-looking screens
 * without any preview fixtures in its bundle. Photos are served the way production delivers
 * uploads — Cloudinary-style URLs (…/res.cloudinary.com/…/upload/…), resized and re-encoded per
 * the `w_` transformation the app asks for (mediaDisplayUrl). Local measurement only.
 *   node scripts/dev/perf-api.mjs   (listens on :3199, API at /api/v1)
 */
import { createServer } from "node:http";
import { readFileSync, existsSync } from "node:fs";
import sharp from "sharp";

const PORT = 3199;
const IMG = new Map();
const ME = "http://localhost:3199";
const hours = (h) => new Date(Date.now() + h * 3_600_000).toISOString();
const base = { audience: "global", status: "open", joinable: true, commentCount: 2, reactionCount: 5, myReacted: false, authorJoinCount: 6, authorAccountAgeDays: 200, demoContent: false, tags: [] };
const post = (id, intentType, title, body, lat, lng, place, startsIn, photo, extra = {}) => ({
  ...base, id, itemType: intentType, intentType, authorUserId: `u-${id}`, authorName: "Rohit Varma", authorEmoji: "r", title, body,
  approxLat: lat, approxLng: lng, locationText: place, visibility: "approval", capacity: 20, spotsFilled: 9,
  startsAt: hours(startsIn), endsAt: hours(startsIn + 1), mediaUrls: photo ? [`${ME}/res.cloudinary.com/arena/image/upload/v1/${photo}.webp`] : [], createdAt: hours(-3), ...extra,
});
const FEED = [
  post("p1", "activity", "Sunrise Run at Durgam Lake", "A friendly 5K. All levels welcome.", 17.4309, 78.3876, "Durgam Cheruvu", 14, "sunrise-run", { tags: ["running"] }),
  post("p2", "ask", "Help move a sofa", "Two people for 20 minutes.", 17.4495, 78.3215, "Gopanapally", 20, "sofa"),
  post("p3", "ask", "Math mentor for Class 10", "Two evenings this week.", 17.4412, 78.3522, "Gachibowli", 50, "tutoring"),
  post("p4", "offer", "Home-cooked meals this weekend", "Four plates to share.", 17.4412, 78.3522, "Gachibowli", 70, "meals"),
  post("p5", "activity", "Lake clean-up at Malkam Cheruvu", "Gloves and bags provided.", 17.4318, 78.3372, "Malkam Cheruvu", 60, "cleanup", { tags: ["volunteering"] }),
  post("p6", "activity", "Pottery for beginners", "A relaxed wheel session.", 17.4635, 78.3571, "Kondapur", 44, "pottery"),
];
const PROFILE = { id: "me", name: "Priya Sharma", avatarEmoji: "p", title: "Product Designer", industry: "Design", location: "Hyderabad", homeCity: "Gachibowli", remote: false, skills: [{ name: "Figma" }, { name: "UX Research" }], experienceYears: 6, rateFloor: 20, openTo: ["full-time"], careerHealth: 70, consent: { autoApply: false, searchableByEnterprises: true }, autonomy: "manual", approxLat: 17.4401, approxLng: 78.3489 };
const paged = (content) => ({ content, totalElements: content.length, totalPages: 1, number: 0, size: 100 });
const POSTING = { id: "job-1", title: "Community Program Assistant", description: "Help run neighbourhood programs.\n\nMust-haves:\n• Event coordination\n• Community outreach", location: "Gachibowli, Hyderabad", remote: false, employmentType: "Full Time", salaryMin: 3, salaryMax: 4, skills: ["Event coordination", "Community outreach"], status: "open", createdAt: hours(-200), applicantCount: 6 };
const APPLICANTS = ["Arjun Nair", "Sunita Menon", "Ravi Kumar", "Divya Nair", "Meera Iyer", "Lakshmi Devi"].map((name, i) => ({
  id: `a${i}`, jobPostingId: "job-1", candidateId: `c${i}`, stage: ["APPLIED", "SCREENING", "INTERVIEW", "APPLIED", "OFFER", "SCREENING"][i], appliedAt: hours(-24 * (i + 1)), updatedAt: hours(-12 * (i + 1)),
  candidate: { id: `c${i}`, name, avatarEmoji: name[0], title: "Community Associate", industry: "Sales", location: "Hyderabad", homeCity: "Gachibowli", skills: [{ name: "Event coordination" }, { name: "Community outreach" }], experienceYears: 2 + i },
}));

function data(path) {
  if (path === "/feed") return FEED;
  if (path.startsWith("/posts/nearby") || path === "/posts/feed" || path.startsWith("/posts/trending")) return FEED;
  if (/^\/posts\/p\d$/.test(path)) return FEED.find((p) => p.id === path.split("/")[2]);
  if (path === "/posts/mine" || path === "/posts/joined") return paged([]);
  if (path === "/profile/me") return PROFILE;
  if (path === "/rooms") return [];
  if (["/notifications", "/applications", "/marketplace/my-bids", "/enterprise/postings"].includes(path)) return paged(path === "/enterprise/postings" ? [POSTING] : []);
  if (path === "/enterprise/postings/job-1") return POSTING;
  if (path === "/enterprise/postings/job-1/applicants") return paged(APPLICANTS);
  if (path === "/enterprise/profile/me") return { companyName: "GreenLeaf Labs", industry: "Sales", size: "11-50", hiringFor: ["Community"] };
  return [];
}

createServer((req, res) => {
  const url = new URL(req.url, ME);
  const cors = { "access-control-allow-origin": req.headers.origin ?? "*", "access-control-allow-credentials": "true", "access-control-allow-headers": req.headers["access-control-request-headers"] ?? "content-type,authorization", "access-control-allow-methods": "GET,POST,PUT,DELETE" };
  if (req.method === "OPTIONS") return res.writeHead(204, cors).end();
  if (url.pathname.startsWith("/res.cloudinary.com/")) {
    const name = url.pathname.split("/").pop();
    const file = `public/fixtures/photos/${name}`;
    if (!existsSync(file)) return res.writeHead(404, cors).end();
    const w = Number(url.pathname.match(/\bw_(\d+)/)?.[1] ?? 0);
    // f_auto,q_auto on Chrome ≈ AVIF at a moderate quality; the stand-in uses WebP q60.
    // Cached like a CDN edge: the resize cost is paid once, not on every measured load.
    const key = `${name}@${w}`;
    if (!IMG.has(key)) IMG.set(key, w ? sharp(readFileSync(file)).resize({ width: w, withoutEnlargement: true }).webp({ quality: 60 }).toBuffer() : Promise.resolve(readFileSync(file)));
    const body = IMG.get(key);
    return body.then((b) => res.writeHead(200, { ...cors, "content-type": "image/webp", "cache-control": "public, max-age=3600" }).end(b));
  }
  const path = url.pathname.replace(/^\/api\/v1/, "");
  res.writeHead(200, { ...cors, "content-type": "application/json" }).end(JSON.stringify({ success: true, data: data(path) }));
}).listen(PORT, () => console.log(`perf API on :${PORT}`));
