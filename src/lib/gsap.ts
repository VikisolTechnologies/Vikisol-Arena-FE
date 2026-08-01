import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { Draggable } from "gsap/Draggable";
import { InertiaPlugin } from "gsap/InertiaPlugin";

let registered = false;

/** Registers GSAP plugins exactly once, safe to call from every client component. */
export function useGsap() {
  if (!registered) {
    gsap.registerPlugin(ScrollTrigger, Draggable, InertiaPlugin);
    registered = true;
  }
  return gsap;
}

export { ScrollTrigger, Draggable };
