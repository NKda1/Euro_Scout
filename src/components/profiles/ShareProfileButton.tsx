"use client";

import { useEffect, useMemo, useState } from "react";
import { Check, Copy, Share2 } from "lucide-react";

interface ShareProfileButtonProps {
  path: string;
  label?: string;
  title?: string;
  text?: string;
  variant?: "solid" | "outline";
  className?: string;
}

function absoluteShareUrl(path: string) {
  if (/^https?:\/\//i.test(path)) return path;
  if (typeof window === "undefined") return path;
  return `${window.location.origin}${path.startsWith("/") ? path : `/${path}`}`;
}

export default function ShareProfileButton({
  path,
  label = "Share profile",
  title = "EuroScout Pro profile",
  text = "View this EuroScout Pro profile.",
  variant = "outline",
  className = ""
}: ShareProfileButtonProps) {
  const [copied, setCopied] = useState(false);
  const [canNativeShare, setCanNativeShare] = useState(false);
  const url = useMemo(() => absoluteShareUrl(path), [path]);
  const buttonClass =
    variant === "solid"
      ? "bg-red-600 text-white hover:bg-red-700"
      : "border border-slate-200 bg-white text-slate-700 hover:border-red-300 hover:text-red-700 dark:border-white/10 dark:bg-black/20 dark:text-slate-200";

  async function copyUrl() {
    if (navigator.clipboard) {
      await navigator.clipboard.writeText(url);
    }
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  }

  async function handleShare() {
    try {
      if (navigator.share) {
        await navigator.share({ title, text, url });
      } else {
        await copyUrl();
      }
    } catch {
      await copyUrl();
    }
  }

  useEffect(() => {
    setCanNativeShare(Boolean(navigator.share));
  }, []);

  const Icon = copied ? Check : canNativeShare ? Share2 : Copy;

  return (
    <button
      type="button"
      onClick={handleShare}
      className={`inline-flex h-11 items-center justify-center gap-2 px-4 text-sm font-black transition ${buttonClass} ${className}`}
      aria-live="polite"
    >
      <Icon aria-hidden className="h-4 w-4" />
      {copied ? "Link copied" : label}
    </button>
  );
}
