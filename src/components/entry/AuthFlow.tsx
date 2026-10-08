"use client";

import { useRef } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { AnimatePresence, m } from "motion/react";
import { pageSlide } from "@/lib/motion";
import { useDirection } from "@/components/motion/useDirection";
import { entryIsPending, markEntryPending } from "@/lib/data/onboarding";
import type { Session } from "@/lib/types";
import { WelcomeView } from "./WelcomeView";
import { SignUpView } from "./AuthForms";
import { LoginScreen } from "@/components/login/LoginScreen";
import { RecoveryScreen } from "@/components/login/RecoveryScreen";
import { RoleChooser } from "./RoleChooser";

type View = "welcome" | "signin" | "signup" | "role" | "recover";

/** Role-based landing — unchanged from the previous entry flow. */
function useLand() {
  const router = useRouter();
  return (session: Pick<Session, "role">, fromSignup: boolean) => {
    const role = session.role;
    if (role === "company_admin") return router.push("/enterprise/onboarding");
    if (role === "recruiter") return router.push("/enterprise");
    if (role === "hiring_manager") return router.push("/enterprise/interviews/mine");
    if (role === "platform_admin") return router.push("/admin");
    if (fromSignup || entryIsPending()) {
      markEntryPending();
      return router.push("/onboarding?step=1");
    }
    router.push("/home");
  };
}

/** Welcome, Sign up and Sign in as one flow, each view in the URL (`?mode=`) so the browser's
 *  back button works, sliding direction-aware between them. */
export function AuthFlow() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const land = useLand();
  const mode = params.get("mode");
  const view: View = mode === "signup" ? "signup" : mode === "signin" ? "signin" : mode === "role" ? "role" : mode === "recover" ? "recover" : "welcome";
  const direction = useDirection(view === "welcome" ? 0 : view === "signin" ? 1 : view === "role" ? 2 : view === "recover" ? 4 : 3);
  const company = params.get("as") === "company";
  const fromWelcome = useRef(false);

  const go = (next: View) => {
    if (view === "welcome") fromWelcome.current = true;
    router.push(next === "welcome" ? pathname : `${pathname}?mode=${next}`, { scroll: false });
  };
  const back = () => {
    if (fromWelcome.current) router.back();
    else router.replace(pathname, { scroll: false });
  };

  const notice =
    params.get("reason") === "expired"
      ? "Your session expired. Sign in again."
      : params.get("invite") === "1"
        ? "This invitation is for a company role. Open the invite link you were sent."
        : undefined;

  return (
    <div data-theme="bplus" className="min-h-svh overflow-x-hidden bg-background">
      <AnimatePresence mode="wait" initial={false} custom={direction}>
        <m.div key={view} custom={direction} variants={pageSlide} initial="enter" animate="center" exit="exit">
          {view === "welcome" && <WelcomeView onJoin={() => go("signin")} onSignIn={() => go("signin")} />}
          {view === "role" && <RoleChooser onBack={back} onContinue={(c) => router.push(`${pathname}?mode=signup${c === "company" ? "&as=company" : ""}`, { scroll: false })} />}
          {/* One entry for people (founder decision, 9 Oct 2026): "Join Arena" and "Sign in" both open
              the same screen, which works out whether the account exists. Company accounts keep
              their own form. */}
          {view === "signup" && company && <SignUpView onBack={back} onSignIn={() => go("signin")} land={land} initialAccount="company_admin" />}
          {(view === "signin" || (view === "signup" && !company)) && <LoginScreen onBack={back} onRecover={() => go("recover")} land={land} notice={notice} />}
          {view === "recover" && <RecoveryScreen onExit={() => router.push(`${pathname}?mode=signin`, { scroll: false })} land={land} />}
        </m.div>
      </AnimatePresence>
    </div>
  );
}
