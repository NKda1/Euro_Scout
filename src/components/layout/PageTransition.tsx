"use client";

import { usePathname } from "next/navigation";
import { useRef, type ReactNode } from "react";

/**
 * Wraps page content and replays the enter animation on every route change.
 *
 * IMPORTANT: after the animation completes we clear the inline animation so the
 * CSS `fill-mode: both` no longer freezes `transform: translateY(0)` on the div.
 * Any non-`none` transform creates a new containing block, which breaks
 * `position: fixed` descendants (e.g. modals, overlays) by anchoring them to
 * this div instead of the viewport.
 */
export default function PageTransition({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const ref = useRef<HTMLDivElement>(null);

  return (
    <div
      key={pathname}
      ref={ref}
      className="animate-page-enter"
      onAnimationEnd={() => {
        if (ref.current) {
          // Remove the animation so the frozen transform is no longer applied,
          // restoring normal fixed-position behaviour for child overlays.
          ref.current.style.animation = "none";
        }
      }}
    >
      {children}
    </div>
  );
}
