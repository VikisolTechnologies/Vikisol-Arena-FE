import type { NextConfig } from "next";

// FE-BPLUS-BUILD §6: fixture data must never reach production. A production build that isn't
// in "api" data mode fails here, before anything is compiled.
if (process.env.VERCEL_ENV === "production" && process.env.NEXT_PUBLIC_ARENA_DATA !== "api") {
  throw new Error('Refusing to build production with preview fixtures: set NEXT_PUBLIC_ARENA_DATA="api".');
}

// Production data mode: the preview world (fictional people, posts, rooms, photos paths) is swapped
// for typed empty stand-ins, so none of it ships in a production bundle (performance pass).
const PREVIEW_OFF = process.env.NEXT_PUBLIC_ARENA_DATA === "api";
const previewAlias: Record<string, string> = PREVIEW_OFF
  ? Object.fromEntries(
      [
        ["@/lib/fixtures/world", "world"],
        ["@/lib/mock/posts", "posts"],
        ["@/lib/mock/rooms", "rooms"],
        ["@/lib/mock/projects", "projects"],
        ["@/lib/mock/activity", "activity"],
        ["@/lib/mock/people", "people"],
        ["@/lib/mock/follows", "follows"],
        ["@/lib/fixtures/jenny", "jenny"],
        ["@/lib/data/fixtures", "data-fixtures"],
      ].map(([from, to]) => [from, `./src/lib/preview-off/${to}.ts`]),
    )
  : {};

const nextConfig: NextConfig = {
  turbopack: { resolveAlias: previewAlias },
  // /dev (build tracker, compare pages, specimens) uses `*.dev.tsx` page files, which only preview
  // builds pick up — a production-data build has no /dev routes at all, not just 404 ones.
  pageExtensions: PREVIEW_OFF ? ["tsx", "ts", "jsx", "js"] : ["dev.tsx", "tsx", "ts", "jsx", "js"],
  // Performance pass only (scripts/dev/perf.mjs): attribute shipped bytes to their sources.
  productionBrowserSourceMaps: process.env.ARENA_SOURCEMAPS === "1",
  // The dev tools badge is not part of the product. Preview screenshots must not show it.
  devIndicators: false,
  // The founder watches the dev preview from a phone on the LAN. Next blocks dev-only assets
  // (HMR, RSC dev chunks) from origins that aren't localhost unless listed here - without this
  // the page rendered its server shell and never hydrated (the "blank feed", 29 Sep). Dev only;
  // ignored by production builds.
  allowedDevOrigins: ["192.168.*.*", "10.*.*.*", "*.local"],
  // Keep isolated browser-test compilation separate from a developer's running Next server.
  distDir: process.env.ARENA_NEXT_DIST_DIR || ".next",
  // ARENA-PHASE-1-BUILD.md §2 "Imagery" - real licensed Unsplash photography for the new v3
  // screens (Home first), served via next/image. Unsplash's own CDN, not the deprecated
  // source.unsplash.com hotlink API - stable, specific photo URLs recorded per-use at the
  // call site (see HomeContent.tsx / ActivityCard usage) with photographer credit and license.
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "images.unsplash.com" },
      // Post photos/videos (see src/lib/api/media.ts).
      { protocol: "https", hostname: "res.cloudinary.com" },
    ],
  },
  // Standalone output for the Docker runtime image on Railway - bundles only the traced
  // production dependencies into .next/standalone instead of shipping the full node_modules
  // tree. Vercel's own build pipeline doesn't want this and sets process.env.VERCEL on every
  // build it runs, so this stays conditional while both platforms build from the same source
  // during the migration window - Railway's build (no VERCEL env var present) is unaffected.
  output: process.env.VERCEL ? undefined : "standalone",
  // ARENA-DEEP-AUDIT.md Phase 5: this used to unconditionally set X-Robots-Tag: noindex,
  // nofollow here, which meant the header shipped on the live production domain too (found by
  // curl-checking prod response headers directly) - Google was never going to index the site
  // since noindex was never removed when the domain cutover to arena.vikisol.in happened. The
  // noindex/nofollow header now lives in middleware.ts, gated behind the same
  // STAGING_BASIC_AUTH check as the access gate itself, so it only ever applies to an actual
  // staging deploy that opts in - never to production, regardless of build vs. runtime env
  // var timing.
  async headers() {
    // arena-api (Spring Security) already sends CSP/HSTS/nosniff/frame-options/referrer-policy
    // by default - checked via curl against the live API. This app (self-hosted on Railway via
    // its own Docker image, not a platform like Vercel that injects sane defaults) was sending
    // none of them at all. Deliberately NOT adding Content-Security-Policy here yet - getting
    // one right requires enumerating every legitimate script/connect/style origin this app uses
    // (Sentry ingest, api-arena.vikisol.in, GSAP, the R3F/WebGL scenes) and testing every page
    // against it, and a wrong CSP could silently break the 3D scenes this project's ground
    // rules require staying intact. Tracked as a follow-up in SECURITY-AUDIT.md rather than
    // shipped un-tested here.
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          // Production: DENY. Dev/preview: SAMEORIGIN, so /dev/compare can show the live screen
          // next to its board; other origins still can't frame the app.
          { key: "X-Frame-Options", value: process.env.VERCEL_ENV === "production" ? "DENY" : "SAMEORIGIN" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains" },
        ],
      },
    ];
  },
  // ARENA-MASTER-ARCHITECTURE.md PART 2/15 - /home replaces /feed as the default landing.
  // Only the exact list route redirects; /feed/[id] (post detail) keeps working as-is until
  // Step 5 migrates it to /p/[postId] - not bundling an unrelated route rename into this one.
  //
  // ARENA-INVENTORY-FIXES.md FIX 2 - /dashboard's own page.tsx is deleted (ROUTES.md has called
  // it fully retired since the Phase A nav reposition); this catches any stray bookmark/external
  // link instead of letting it 404. /dashboard was always the candidate-specific predecessor to
  // /home (see CandidateAppShell's own PART 2/15 comment), never a shared multi-role landing, so
  // redirecting everyone there is directionally correct - a wrong-role visitor gets /home's own
  // (now-fixed, see auth-guard.ts) access-denied handling instead of a second hop.
  // ARENA-INVENTORY-FIXES.md FIX 3 - /interviews and /enterprise/interviews (the bare list
  // routes) 404 - only their [applicationId] detail sub-route was ever built. No nav item or
  // in-app link points at either bare path (grepped), and - unlike the audit's original
  // finding - the detail route ISN'T actually orphaned: /applications' "Schedule" flow does
  // reach it, via a confirm-slot dialog -> "Go to interview room" button, not a direct link
  // (why the earlier click-test missed it). Building a real aggregate list needs a backend
  // endpoint neither role has today (InterviewController has no candidate-facing or
  // recruiter/company_admin-facing list, only HM's own /interviews/mine) - real, scoped
  // follow-up work, not something to improvise in a bug-fix pass. Redirecting to where each
  // role already sees interview-stage info today satisfies "no route may 404" without that.
  // See DECISIONS.md. 29 Sep: /enterprise/interviews is now a real page (P7/P9 interview index),
  // so its redirect is gone - it was silently sending the Interviews nav item to Jobs.
  async redirects() {
    return [
      { source: "/feed", destination: "/home", permanent: false },
      { source: "/dashboard", destination: "/home", permanent: false },
      { source: "/interviews", destination: "/applications", permanent: false },
      // Architect call (30 Sep, merging P11): the public profile's canonical URL is
      // /people/[id] (existing follow/block/posts functionality); /neighbour/[id]'s B+ page
      // (feature/arena-account-bplus) redirects here rather than the reverse.
      { source: "/neighbour/:id", destination: "/people/:id", permanent: true },
    ];
  },
};

export default nextConfig;
