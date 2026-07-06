"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";

interface StaffInviteLinkNoticeProps {
  path: string;
}

export default function StaffInviteLinkNotice({ path }: StaffInviteLinkNoticeProps) {
  const [origin, setOrigin] = useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    setOrigin(window.location.origin);
  }, []);

  const fullLink = useMemo(() => {
    if (path.startsWith("http")) return path;
    return `${origin}${path}`;
  }, [origin, path]);

  async function copyLink() {
    if (!fullLink) return;
    await navigator.clipboard.writeText(fullLink);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  }

  return (
    <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 dark:border-emerald-500/35 dark:bg-emerald-500/10">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-sm font-black text-emerald-900 dark:text-emerald-100">Staff invite link ready.</p>
          <p className="mt-1 text-sm font-semibold leading-6 text-emerald-800/75 dark:text-emerald-100/65">
            Send this link to the invited coach. They will sign up or sign in, then land on the club join screen.
          </p>
        </div>
        <div className="flex shrink-0 flex-wrap gap-2">
          <button
            type="button"
            onClick={copyLink}
            className="h-10 rounded-lg bg-red-600 px-4 text-xs font-black uppercase text-white transition hover:bg-red-700"
          >
            {copied ? "Copied" : "Copy link"}
          </button>
          <Link
            href={path}
            className="inline-flex h-10 items-center rounded-lg border border-emerald-300 bg-white px-4 text-xs font-black uppercase text-emerald-900 transition hover:border-red-300 hover:text-red-700 dark:border-white/15 dark:bg-white/10 dark:text-white"
          >
            Open
          </Link>
        </div>
      </div>
      <input
        readOnly
        value={fullLink || path}
        className="mt-4 h-11 w-full rounded-lg border border-emerald-200 bg-white px-3 text-sm font-semibold text-slate-900 outline-none dark:border-white/10 dark:bg-black/30 dark:text-white"
        onFocus={(event) => event.currentTarget.select()}
      />
    </div>
  );
}
