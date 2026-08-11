import { useEffect, useRef, useState } from "react";

/** ARENA-STABILIZE.md Phase 1.4 - IntersectionObserver-backed "is this element on screen"
 * signal, for canvases/animations below the fold that shouldn't burn main-thread time before
 * they're ever seen (see Starfield.tsx). Same spirit as use-page-visible.ts's tab-visibility
 * gate, one level more granular - element visibility, not just tab visibility. `rootMargin`
 * starts the work slightly before the element is actually on screen so it's already animating
 * by the time a scroll brings it fully into view. */
export function useInViewport<T extends HTMLElement>(rootMargin = "200px") {
  const ref = useRef<T>(null);
  const [inViewport, setInViewport] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(([entry]) => setInViewport(entry.isIntersecting), { rootMargin });
    observer.observe(el);
    return () => observer.disconnect();
  }, [rootMargin]);

  return { ref, inViewport };
}
