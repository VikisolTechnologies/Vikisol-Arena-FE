import { domAnimation } from "motion/react";

// Loaded with the app by MotionProvider. domAnimation carries animate, exit (AnimatePresence) and
// tap/hover/focus — so an exit can never be left waiting for features (the reason the loading
// used to be synchronous). The domMax extras — drag-to-dismiss sheets and layoutId slides — are
// fetched at idle (motion-features-max.ts); until then a pill jumps instead of sliding.
export default domAnimation;
