"use client";

import { useEffect, useState } from "react";

/** How many pixels the on-screen keyboard covers, so a button after the form can scroll
 *  clear of it. A small change (browser chrome) is ignored. */
export function useKeyboardInset() {
  const [inset, setInset] = useState(0);
  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return;
    const sync = () => {
      const covered = window.innerHeight - vv.height - vv.offsetTop;
      setInset(covered > 80 ? Math.round(covered) : 0);
    };
    vv.addEventListener("resize", sync);
    vv.addEventListener("scroll", sync);
    const onFocus = (event: FocusEvent) => {
      const el = event.target;
      if (!(el instanceof HTMLElement)) return;
      if (el.tagName !== "INPUT" && el.tagName !== "TEXTAREA" && el.tagName !== "SELECT") return;
      requestAnimationFrame(() => el.scrollIntoView({ block: "center" }));
    };
    document.addEventListener("focusin", onFocus);
    sync();
    return () => {
      vv.removeEventListener("resize", sync);
      vv.removeEventListener("scroll", sync);
      document.removeEventListener("focusin", onFocus);
    };
  }, []);
  return inset;
}
