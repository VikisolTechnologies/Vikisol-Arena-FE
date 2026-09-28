"use client";

import { useEffect, useRef } from "react";
import Script from "next/script";

// Dormant unless NEXT_PUBLIC_GOOGLE_CLIENT_ID is set - same "renders nothing until configured"
// contract as the backend's GoogleIdTokenVerifier.isConfigured(). No client secret involved:
// Google Identity Services hands back a signed ID token straight to the browser, which this
// component forwards to POST /auth/google for server-side verification (see AuthService.
// signInWithGoogle) - the Client ID itself is meant to be public, safe to ship in the bundle.
const CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;

// Ambient window.google shape lives in lib/google-global.d.ts - shared with GoogleMapView so the
// two components' `declare global` blocks don't conflict with each other.

/** Whether Google sign-in is configured for this build. Screens hide the button and its "or"
 *  divider together when it isn't. */
export const GOOGLE_SIGN_IN_ENABLED = Boolean(CLIENT_ID);

export function GoogleSignInButton({
  onCredential,
  disabled,
  text = "signin_with",
  shape = "pill",
}: {
  onCredential: (idToken: string) => void;
  disabled?: boolean;
  /** Appearance only (Google renders the button itself, in its own frame). */
  text?: "signin_with" | "signup_with" | "continue_with";
  shape?: "pill" | "rectangular";
}) {
  const divRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!CLIENT_ID || disabled) return;
    const init = () => {
      if (!window.google || !divRef.current) return;
      window.google.accounts.id.initialize({
        client_id: CLIENT_ID,
        callback: (resp) => onCredential(resp.credential),
      });
      divRef.current.innerHTML = "";
      window.google.accounts.id.renderButton(divRef.current, {
        type: "standard",
        theme: "outline",
        size: "large",
        text,
        // Google caps the rendered width at 400px; fill the column up to that.
        width: Math.min(400, Math.max(200, divRef.current.offsetWidth || 320)),
        shape,
      });
    };
    if (window.google) init();
    else {
      // The gsi/client <Script> below fires this once loaded - see onLoad.
      const id = setInterval(() => { if (window.google) { clearInterval(id); init(); } }, 100);
      return () => clearInterval(id);
    }
  }, [disabled, onCredential, text, shape]);

  if (!CLIENT_ID) return null;

  return (
    <>
      <Script src="https://accounts.google.com/gsi/client" strategy="afterInteractive" />
      <div ref={divRef} className="flex w-full justify-center" />
    </>
  );
}
