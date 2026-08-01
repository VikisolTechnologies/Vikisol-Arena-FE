import { useEffect, useState } from "react";
import { useReducedMotion } from "./use-reduced-motion";

/** Reveals `text` character by character. Reduced-motion renders it instantly.
 *  Assumes the caller keys the consuming component per-message (text never changes
 *  in place), so the interval only ever needs to run once per mount. */
export function useTypewriter(text: string, speedMs = 14) {
  const reduced = useReducedMotion();
  const [shown, setShown] = useState(reduced ? text : "");

  useEffect(() => {
    if (reduced) return;
    let i = 0;
    const id = setInterval(() => {
      i += 1;
      setShown(text.slice(0, i));
      if (i >= text.length) clearInterval(id);
    }, speedMs);
    return () => clearInterval(id);
  }, [text, speedMs, reduced]);

  return { shown, done: shown === text };
}
