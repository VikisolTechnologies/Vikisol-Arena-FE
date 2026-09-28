import { domMax } from "motion/react";

// Loaded asynchronously by MotionProvider so no animation code is in any route's first load.
// domMax rather than domAnimation: drag-to-dismiss sheets and shared-element (layoutId)
// transitions are both required by the mission, and neither exists in domAnimation.
export default domMax;
