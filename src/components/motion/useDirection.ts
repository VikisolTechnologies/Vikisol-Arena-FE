"use client";

import { useState } from "react";

/** Slide direction for a stepped flow: 1 when `position` moves forward, -1 when it moves back
 *  (including the browser's back button). Adjusts state during render — React's documented
 *  pattern for deriving state from a changed value — so the first frame already knows it. */
export function useDirection(position: number): 1 | -1 {
  const [state, setState] = useState<{ position: number; direction: 1 | -1 }>({ position, direction: 1 });
  if (state.position !== position) {
    const direction = position > state.position ? 1 : -1;
    setState({ position, direction });
    return direction;
  }
  return state.direction;
}
