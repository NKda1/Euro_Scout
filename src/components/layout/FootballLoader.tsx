"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState, Suspense } from "react";

// American football SVG — laced ellipse, renders crisply at 18×18.
function FootballIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden
      className="football-spin drop-shadow-sm"
    >
      {/* Main body */}
      <ellipse cx="12" cy="12" rx="9.5" ry="5.8" fill="#92400e" />
      {/* Highlight */}
      <ellipse cx="12" cy="9.5" rx="6" ry="2.2" fill="#b45309" opacity="0.5" />
      {/* Seam */}
      <ellipse cx="12" cy="12" rx="9.5" ry="5.8" stroke="#78350f" strokeWidth="0.6" fill="none" />
      {/* White lace line */}
      <line x1="12" y1="6.8" x2="12" y2="17.2" stroke="white" strokeWidth="1" strokeLinecap="round" />
      {/* Lace cross-stitches */}
      <line x1="9.8" y1="9.5"  x2="14.2" y2="9.5"  stroke="white" strokeWidth="1" strokeLinecap="round" />
      <line x1="9.8" y1="12"   x2="14.2" y2="12"   stroke="white" strokeWidth="1" strokeLinecap="round" />
      <line x1="9.8" y1="14.5" x2="14.2" y2="14.5" stroke="white" strokeWidth="1" strokeLinecap="round" />
    </svg>
  );
}

type LoadState = "idle" | "loading" | "completing" | "done";

function FootballLoaderInner() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [state, setState] = useState<LoadState>("idle");
  const prevRoute = useRef(`${pathname}?${searchParams}`);
  const completeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fallbackTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  function startLoading() {
    if (completeTimer.current) clearTimeout(completeTimer.current);
    if (fallbackTimer.current) clearTimeout(fallbackTimer.current);
    setState("loading");
    // Safety fallback: never stay in loading > 8 s
    fallbackTimer.current = setTimeout(() => setState("idle"), 8000);
  }

  function finishLoading() {
    if (fallbackTimer.current) clearTimeout(fallbackTimer.current);
    setState("completing");
    completeTimer.current = setTimeout(() => setState("done"), 400);
    setTimeout(() => setState("idle"), 900);
  }

  // Detect completed route changes
  useEffect(() => {
    const route = `${pathname}?${searchParams}`;
    if (prevRoute.current !== route) {
      prevRoute.current = route;
      finishLoading();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname, searchParams]);

  // Listen for link clicks + form submits globally
  useEffect(() => {
    function onLinkClick(e: MouseEvent) {
      const anchor = (e.target as Element).closest("a");
      if (!anchor) return;
      const href = anchor.getAttribute("href");
      if (
        !href ||
        href.startsWith("#") ||
        href.startsWith("mailto:") ||
        href.startsWith("tel:") ||
        href.startsWith("javascript:") ||
        anchor.target === "_blank" ||
        e.metaKey || e.ctrlKey || e.shiftKey
      ) return;
      // Only trigger for same-origin internal navigation
      try {
        const url = new URL(href, window.location.origin);
        if (url.origin !== window.location.origin) return;
        // Skip if clicking current page
        if (url.pathname === pathname && url.search === searchParams.toString()) return;
      } catch {
        return;
      }
      startLoading();
    }

    function onFormSubmit() {
      startLoading();
    }

    document.addEventListener("click", onLinkClick);
    document.addEventListener("submit", onFormSubmit);
    return () => {
      document.removeEventListener("click", onLinkClick);
      document.removeEventListener("submit", onFormSubmit);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname, searchParams]);

  if (state === "idle") return null;

  const isCompleting = state === "completing" || state === "done";

  return (
    <div
      role="progressbar"
      aria-label="Loading"
      aria-busy={!isCompleting}
      className={`football-loader-root ${isCompleting ? "football-loader-done" : ""}`}
    >
      {/* Progress track */}
      <div className="football-loader-track" />
      {/* Animated bar */}
      <div className={`football-loader-bar ${isCompleting ? "football-loader-bar-complete" : "football-loader-bar-active"}`}>
        {/* Football at the leading edge */}
        <span className="football-loader-ball">
          <FootballIcon />
        </span>
      </div>
    </div>
  );
}

// Suspense boundary required because useSearchParams() suspends during SSR.
export default function FootballLoader() {
  return (
    <Suspense>
      <FootballLoaderInner />
    </Suspense>
  );
}
