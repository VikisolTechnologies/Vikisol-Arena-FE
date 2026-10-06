"use client";

import { useEffect, useState } from "react";

const DISMISS_KEY = "arena_install_dismissed";

type InstallEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> };

/** A small hint for Add to Home Screen. It never registers a service worker, so API
 *  responses are not cached. */
export function InstallHint() {
  const [show, setShow] = useState(false);
  const [install, setInstall] = useState<InstallEvent | null>(null);
  const [ios, setIos] = useState(false);

  useEffect(() => {
    if (localStorage.getItem(DISMISS_KEY) === "1") return;
    if (window.matchMedia("(display-mode: standalone)").matches) return;
    const nav = navigator as Navigator & { standalone?: boolean };
    if (nav.standalone) return;
    const onPrompt = (event: Event) => {
      event.preventDefault();
      setInstall(event as InstallEvent);
      setShow(true);
    };
    window.addEventListener("beforeinstallprompt", onPrompt);
    const apple = /iphone|ipad|ipod/i.test(navigator.userAgent);
    if (apple) {
      setIos(true);
      setShow(true);
    }
    return () => window.removeEventListener("beforeinstallprompt", onPrompt);
  }, []);

  if (!show) return null;

  const dismiss = () => {
    localStorage.setItem(DISMISS_KEY, "1");
    setShow(false);
  };

  return (
    <div className="mx-auto flex w-full max-w-[480px] items-center gap-3 border-b border-line bg-surface px-4 py-2.5 text-[14px] text-foreground">
      <p className="min-w-0 flex-1 leading-snug">
        {ios ? "Install Arena: tap Share, then Add to Home Screen." : "Install Arena on your home screen."}
      </p>
      {install && (
        <button
          type="button"
          className="shrink-0 font-semibold text-primary"
          onClick={() => {
            void install.prompt().then(() => dismiss());
          }}
        >
          Install
        </button>
      )}
      <button type="button" onClick={dismiss} className="shrink-0 font-semibold text-faint">Dismiss</button>
    </div>
  );
}
