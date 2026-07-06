"use client";

import { useEffect, useMemo, useState } from "react";
import { requestClubCallAction } from "@/app/actions/meetings";

interface ScheduleClubCallButtonProps {
  scoutId: string;
  teamId: string;
  teamName: string;
}

const reasonOptions = ["Recruitment fit", "Film review", "Roster spot", "Contract talk", "Availability"];
const timeSlots = ["09:00", "12:00", "15:00", "18:00", "20:00"];

function startOfToday() {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setDate(date.getDate() + days);
  return next;
}

function dateValue(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatShortDate(value: string) {
  return new Intl.DateTimeFormat("en-GB", {
    weekday: "short",
    day: "2-digit",
    month: "short"
  }).format(new Date(`${value}T12:00:00`));
}

function localDateTime(date: string, time: string) {
  return date && time ? `${date}T${time}` : "";
}

function isPastSlot(date: string, time: string) {
  const selected = new Date(localDateTime(date, time));
  return selected.getTime() < Date.now() + 30 * 60 * 1000;
}

export default function ScheduleClubCallButton({ scoutId, teamId, teamName }: ScheduleClubCallButtonProps) {
  const [open, setOpen] = useState(false);
  const [timezone, setTimezone] = useState("");
  const dateOptions = useMemo(() => {
    const today = startOfToday();
    const daysUntilSaturday = (6 - today.getDay() + 7) % 7 || 7;

    return [
      { label: "Tomorrow", value: dateValue(addDays(today, 1)) },
      { label: "This week", value: dateValue(addDays(today, 3)) },
      { label: "Weekend", value: dateValue(addDays(today, daysUntilSaturday)) },
      { label: "Next week", value: dateValue(addDays(today, 7)) }
    ];
  }, []);
  const [primaryDate, setPrimaryDate] = useState(dateOptions[0]?.value ?? "");
  const [primaryTime, setPrimaryTime] = useState("18:00");
  const [alternativeDate, setAlternativeDate] = useState(dateOptions[2]?.value ?? "");
  const [alternativeTime, setAlternativeTime] = useState("20:00");
  const [reason, setReason] = useState(reasonOptions[0]);

  useEffect(() => {
    setTimezone(Intl.DateTimeFormat().resolvedOptions().timeZone);
  }, []);

  useEffect(() => {
    if (!open) return;

    const originalOverflow = document.body.style.overflow;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };

    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  const primaryDateTime = localDateTime(primaryDate, primaryTime);
  const alternativeDateTime = localDateTime(alternativeDate, alternativeTime);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="h-12 w-full border border-slate-200 bg-white px-5 text-sm font-black text-slate-600 transition hover:border-red-300 hover:text-red-700 active:scale-[0.98] dark:border-white/10 dark:bg-black/20 dark:text-white/45 dark:hover:border-red-500/45 dark:hover:bg-red-500/10 dark:hover:text-white"
      >
        Request video call
      </button>

      {open ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="club-call-request-title">
          <button type="button" aria-label="Close video call request" className="absolute inset-0 cursor-default" onClick={() => setOpen(false)} />
          <div className="relative z-10 max-h-[92vh] w-full max-w-5xl overflow-y-auto rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-white/10 dark:bg-[#0b0b0b]">
            <div className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-slate-200 bg-white/95 px-5 py-4 backdrop-blur dark:border-white/10 dark:bg-[#0b0b0b]/95">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.16em] text-red-500">Video call request</p>
                <h2 id="club-call-request-title" className="mt-1 text-2xl font-black text-slate-950 dark:text-white">
                  Pick two clean slots.
                </h2>
                <p className="mt-1 text-sm font-semibold text-slate-500 dark:text-white/45">
                  Suggest a negotiation window with {teamName}. The club can accept, decline or propose a final time.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="shrink-0 rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-black uppercase text-slate-500 transition hover:border-red-300 hover:text-red-700 dark:border-white/10 dark:bg-white/5 dark:text-white/55 dark:hover:border-red-500/40 dark:hover:text-white"
              >
                Close
              </button>
            </div>
            <form action={requestClubCallAction} className="grid gap-5 p-5 lg:grid-cols-[0.8fr_1.2fr]">
              <input type="hidden" name="team_id" value={teamId} />
              <input type="hidden" name="scout_id" value={scoutId} />
              <input type="hidden" name="return_to" value={`/scouts/${scoutId}`} />
              <input type="hidden" name="timezone" value={timezone} />
              <input type="hidden" name="proposed_start_at" value={primaryDateTime} />
              <input type="hidden" name="proposed_alternative_at" value={alternativeDateTime} />
              <input type="hidden" name="request_reason" value={reason} />

              <div className="space-y-4">
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-white/10 dark:bg-white/[0.03]">
                  <p className="mb-3 text-[10px] font-black uppercase tracking-[0.14em] text-slate-400 dark:text-white/30">
                    Reason
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    {reasonOptions.map((option) => {
                      const active = option === reason;
                      return (
                        <button
                          key={option}
                          type="button"
                          onClick={() => setReason(option)}
                          className={`min-h-11 rounded-lg border px-3 py-2 text-left text-xs font-black transition ${
                            active
                              ? "border-red-500 bg-red-600 text-white"
                              : "border-slate-200 bg-white text-slate-600 hover:border-red-300 hover:text-red-700 dark:border-white/10 dark:bg-[#111] dark:text-white/55 dark:hover:border-red-500/50 dark:hover:text-white"
                          }`}
                        >
                          {option}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <textarea
                  name="request_note"
                  rows={7}
                  maxLength={500}
                  placeholder="Add quick context: availability, film questions, contract situation, or what you want to discuss."
                  className="w-full resize-none rounded-2xl border border-slate-200 bg-white p-4 text-sm font-semibold leading-6 text-slate-950 placeholder:text-slate-400 focus:border-red-500 focus:outline-none dark:border-white/10 dark:bg-[#111] dark:text-white dark:placeholder:text-white/25"
                />

                <div className="rounded-2xl border border-red-200 bg-red-50 p-4 dark:border-red-500/25 dark:bg-red-500/10">
                  <p className="text-xs font-black uppercase tracking-[0.14em] text-red-600 dark:text-red-200">Request summary</p>
                  <p className="mt-2 text-sm font-black text-slate-950 dark:text-white">{reason}</p>
                  <p className="mt-1 text-sm font-semibold text-slate-600 dark:text-red-100/70">
                    Preferred {formatShortDate(primaryDate)} at {primaryTime}. Backup {formatShortDate(alternativeDate)} at {alternativeTime}.
                  </p>
                </div>
              </div>

              <div className="grid gap-4">
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-white/10 dark:bg-white/[0.03]">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-[10px] font-black uppercase tracking-[0.14em] text-red-500">Preferred slot</p>
                    <p className="text-xs font-black text-slate-500 dark:text-white/45">{formatShortDate(primaryDate)} at {primaryTime}</p>
                  </div>
                  <div className="mt-3 grid grid-cols-2 gap-2 md:grid-cols-4">
                    {dateOptions.map((option) => (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => setPrimaryDate(option.value)}
                        className={`rounded-lg border px-3 py-3 text-left text-xs font-black transition ${
                          option.value === primaryDate
                            ? "border-red-500 bg-red-600 text-white"
                            : "border-slate-200 bg-white text-slate-600 hover:border-red-300 dark:border-white/10 dark:bg-black/25 dark:text-white/55"
                        }`}
                      >
                        <span className="block">{option.label}</span>
                        <span className="mt-0.5 block text-[10px] opacity-70">{formatShortDate(option.value)}</span>
                      </button>
                    ))}
                  </div>
                  <div className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-5">
                    {timeSlots.map((slot) => {
                      const disabled = isPastSlot(primaryDate, slot);
                      return (
                        <button
                          key={slot}
                          type="button"
                          disabled={disabled}
                          onClick={() => setPrimaryTime(slot)}
                          className={`h-10 rounded-lg border text-xs font-black transition disabled:cursor-not-allowed disabled:opacity-30 ${
                            slot === primaryTime
                              ? "border-red-500 bg-red-600 text-white"
                              : "border-slate-200 bg-white text-slate-600 hover:border-red-300 dark:border-white/10 dark:bg-black/25 dark:text-white/55"
                          }`}
                        >
                          {slot}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-white/10 dark:bg-white/[0.03]">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-400 dark:text-white/30">Backup slot</p>
                    <p className="text-xs font-black text-slate-500 dark:text-white/45">{formatShortDate(alternativeDate)} at {alternativeTime}</p>
                  </div>
                  <div className="mt-3 grid grid-cols-2 gap-2 md:grid-cols-4">
                    {dateOptions.map((option) => (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => setAlternativeDate(option.value)}
                        className={`rounded-lg border px-3 py-3 text-left text-xs font-black transition ${
                          option.value === alternativeDate
                            ? "border-red-500 bg-red-600 text-white"
                            : "border-slate-200 bg-white text-slate-600 hover:border-red-300 dark:border-white/10 dark:bg-black/25 dark:text-white/55"
                        }`}
                      >
                        <span className="block">{option.label}</span>
                        <span className="mt-0.5 block text-[10px] opacity-70">{formatShortDate(option.value)}</span>
                      </button>
                    ))}
                  </div>
                  <div className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-5">
                    {timeSlots.map((slot) => {
                      const disabled = isPastSlot(alternativeDate, slot);
                      return (
                        <button
                          key={slot}
                          type="button"
                          disabled={disabled}
                          onClick={() => setAlternativeTime(slot)}
                          className={`h-10 rounded-lg border text-xs font-black transition disabled:cursor-not-allowed disabled:opacity-30 ${
                            slot === alternativeTime
                              ? "border-red-500 bg-red-600 text-white"
                              : "border-slate-200 bg-white text-slate-600 hover:border-red-300 dark:border-white/10 dark:bg-black/25 dark:text-white/55"
                          }`}
                        >
                          {slot}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <button className="h-12 rounded-xl bg-red-600 px-5 text-sm font-black uppercase text-white transition hover:bg-red-700">
                  Send call request
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </>
  );
}
