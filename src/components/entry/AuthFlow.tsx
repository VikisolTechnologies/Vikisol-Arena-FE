"use client";

import { useRef } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { AnimatePresence, m } from "motion/react";
import { pageSlide } from "@/lib/motion";
import { useDirection } from "@/components/motion/useDirection";
import { entryIsPending, markEntryPending } from "@/lib/data/onboarding";
import type { Session } from "@/lib/types";
import { WelcomeView } from "./WelcomeView";
import { SignInView, SignUpView } from "./AuthForms";
import { RoleChooser } from "./RoleChooser";

type View = "welcome" | "signin" | "signup" | "role";

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
  const view: View = mode === "signup" ? "signup" : mode === "signin" ? "signin" : mode === "role" ? "role" : "welcome";
  const direction = useDirection(view === "welcome" ? 0 : view === "signin" ? 1 : view === "role" ? 2 : 3);
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
          {view === "welcome" && <WelcomeView onJoin={() => go("signup")} onSignIn={() => go("signin")} />}
          {view === "role" && <RoleChooser onBack={back} onContinue={(c) => router.push(`${pathname}?mode=signup${c === "company" ? "&as=company" : ""}`, { scroll: false })} />}
          {view === "signup" && <SignUpView onBack={back} onSignIn={() => go("signin")} land={land} initialAccount={params.get("as") === "company" ? "company_admin" : "talent"} />}
          {view === "signin" && <SignInView onBack={back} onSignUp={() => go("signup")} land={land} notice={notice} />}
        </m.div>
      </AnimatePresence>
    </div>
  );
}
