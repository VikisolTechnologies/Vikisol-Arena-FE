import { domMax } from "motion/react";

// Loaded synchronously by MotionProvider: with async loading, an AnimatePresence exit that starts
// before the features arrive never completes, leaving a screen stuck between states.
// domMax rather than domAnimation: drag-to-dismiss sheets and shared-element (layoutId)
// transitions are both required by the mission, and neither exists in domAnimation.
export default domMax;
