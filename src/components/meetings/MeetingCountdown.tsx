"use client";

import { useEffect, useState } from "react";

interface MeetingCountdownProps {
  scheduledAt: string | null;
  status: string;
}

function labelFor(scheduledAt: string | null, status: string) {
  if (["cancelled", "declined", "completed", "expired"].includes(status)) return null;
  if (!scheduledAt) return "Time awaiting confirmation";
  const difference = new Date(scheduledAt).getTime() - Date.now();
  if (difference < -2 * 60 * 60 * 1000) return "Call window ended";
  if (difference <= 5 * 60 * 1000) return difference > 0 ? "Room opens now" : "Ready to join";
  const minutes = Math.ceil(difference / 60_000);
  if (minutes < 60) return `Starts in ${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `Starts in ${hours}h ${minutes % 60}m`;
  const days = Math.floor(hours / 24);
  return `Starts in ${days}d ${hours % 24}h`;
}

export default function MeetingCountdown({ scheduledAt, status }: MeetingCountdownProps) {
  const [label, setLabel] = useState(() => labelFor(scheduledAt, status));

  useEffect(() => {
    const refresh = () => setLabel(labelFor(scheduledAt, status));
    refresh();
    const timer = window.setInterval(refresh, 30_000);
    return () => window.clearInterval(timer);
  }, [scheduledAt, status]);

  return label ? (
    <span className="text-[11px] font-black text-red-600 dark:text-red-300" aria-live="polite">{label}</span>
  ) : null;
}
