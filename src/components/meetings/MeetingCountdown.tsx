"use client";

import { useEffect, useState } from "react";

export default function MeetingCountdown({ startsAt, durationMinutes = 30 }: { startsAt: string | null; durationMinutes?: number }) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 30_000);
    return () => window.clearInterval(timer);
  }, []);

  if (!startsAt) return null;
  const start = new Date(startsAt).getTime();
  if (Number.isNaN(start)) return null;
  const distance = start - now;
  const end = start + (durationMinutes + 30) * 60_000;
  let label = "Live now";
  if (now > end) label = "Call window ended";
  else if (distance > 0) {
    const minutes = Math.ceil(distance / 60_000);
    label = minutes < 60 ? `In ${minutes}m` : minutes < 1440 ? `In ${Math.floor(minutes / 60)}h ${minutes % 60}m` : `In ${Math.floor(minutes / 1440)}d`;
  }

  return <span className="rounded border border-slate-300 bg-slate-100 px-1.5 py-px text-[9px] font-black uppercase text-slate-700 dark:border-white/15 dark:bg-white/10 dark:text-white/70">{label}</span>;
}
