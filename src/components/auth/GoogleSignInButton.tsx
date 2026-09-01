"use client";

import { useEffect, useRef } from "react";
import Script from "next/script";

// Dormant unless NEXT_PUBLIC_GOOGLE_CLIENT_ID is set - same "renders nothing until configured"
// contract as the backend's GoogleIdTokenVerifier.isConfigured(). No client secret involved:
// Google Identity Services hands back a signed ID token straight to the browser, which this
// component forwards to POST /auth/google for server-side verification (see AuthService.
// signInWithGoogle) - the Client ID itself is meant to be public, safe to ship in the bundle.
const CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: { client_id: string; callback: (resp: { credential: string }) => void }) => void;
          renderButton: (parent: HTMLElement, options: Record<string, unknown>) => void;
        };
      };
    };
  }
}

export function GoogleSignInButton({ onCredential, disabled }: { onCredential: (idToken: string) => void; disabled?: boolean }) {
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
        width: 320,
        shape: "pill",
      });
    };
    if (window.google) init();
    else {
      // The gsi/client <Script> below fires this once loaded - see onLoad.
      const id = setInterval(() => { if (window.google) { clearInterval(id); init(); } }, 100);
      return () => clearInterval(id);
    }
  }, [disabled, onCredential]);

  if (!CLIENT_ID) return null;

  return (
    <>
      <Script src="https://accounts.google.com/gsi/client" strategy="afterInteractive" />
      <div ref={divRef} className="flex w-full justify-center" />
    </>
  );
}
