"use client";

import { useState, useTransition } from "react";
import { Bug, X } from "lucide-react";
import { submitBugReportAction } from "@/app/actions/bug-report";

export default function BugReportDialog() {
  const [open, setOpen] = useState(false);
  const [pageUrl, setPageUrl] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const [pending, startTransition] = useTransition();

  function showDialog() {
    setPageUrl(window.location.href);
    setError(null);
    setSent(false);
    setOpen(true);
  }

  function closeDialog() {
    if (pending) return;
    setOpen(false);
    setMessage("");
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    const formData = new FormData(event.currentTarget);
    startTransition(async () => {
      const result = await submitBugReportAction(formData);
      if (result.ok) {
        setSent(true);
        setMessage("");
      } else {
        setError(result.error ?? "We could not save your report.");
      }
    });
  }

  return (
    <>
      <button type="button" onClick={showDialog} className="flex items-center gap-2 text-xs font-bold text-slate-600 transition hover:text-red-600 dark:text-slate-300 dark:hover:text-red-400">
        <Bug className="h-4 w-4" />
        Report a bug
      </button>
      {open && (
        <div role="dialog" aria-modal="true" aria-labelledby="bug-report-title" className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4" onMouseDown={(event) => event.target === event.currentTarget && closeDialog()}>
          <div className="w-full max-w-lg border border-slate-200 bg-white p-5 shadow-2xl dark:border-white/10 dark:bg-[#111]">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 id="bug-report-title" className="text-lg font-black text-slate-950 dark:text-white">Report a bug</h2>
                <p className="mt-1 text-sm font-semibold text-slate-500 dark:text-slate-400">Tell us what happened. You can submit this without signing in.</p>
              </div>
              <button type="button" onClick={closeDialog} aria-label="Close bug report" className="text-slate-400 hover:text-slate-700 dark:hover:text-white"><X className="h-5 w-5" /></button>
            </div>
            {sent ? (
              <div className="mt-5">
                <p className="border border-emerald-200 bg-emerald-50 p-3 text-sm font-bold text-emerald-800 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-200">Thanks — your report was sent.</p>
                <button type="button" onClick={closeDialog} className="mt-4 h-10 bg-red-600 px-5 text-sm font-black text-white hover:bg-red-700">Close</button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="mt-5 space-y-4">
                <input type="hidden" name="page_url" value={pageUrl} />
                <label className="block">
                  <span className="text-sm font-black text-slate-700 dark:text-slate-200">What went wrong?</span>
                  <textarea name="message" value={message} onChange={(event) => setMessage(event.target.value)} required maxLength={4000} rows={6} className="mt-2 w-full border border-slate-200 bg-white p-3 text-sm text-slate-950 outline-none focus:border-red-500 dark:border-white/10 dark:bg-[#090909] dark:text-white" placeholder="Include what you expected and what actually happened." />
                </label>
                <p className="break-all text-xs font-semibold text-slate-400">Page: {pageUrl}</p>
                {error && <p className="text-sm font-bold text-red-600 dark:text-red-400">{error}</p>}
                <div className="flex justify-end gap-2">
                  <button type="button" onClick={closeDialog} disabled={pending} className="h-10 border border-slate-200 px-4 text-sm font-black text-slate-600 dark:border-white/10 dark:text-slate-300">Cancel</button>
                  <button disabled={pending || !message.trim()} className="h-10 bg-red-600 px-5 text-sm font-black text-white hover:bg-red-700 disabled:opacity-50">{pending ? "Sending…" : "Send report"}</button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  );
}
