"use client";

import { useTransition } from "react";
import { togglePipelinePrivacyAction } from "@/app/actions/club";

interface PipelinePrivacyToggleProps {
  teamId: string;
  pipelineNamesPublic: boolean;
}

export default function PipelinePrivacyToggle({ teamId, pipelineNamesPublic }: PipelinePrivacyToggleProps) {
  const [isPending, startTransition] = useTransition();

  function handleToggle() {
    startTransition(async () => {
      await togglePipelinePrivacyAction(teamId, !pipelineNamesPublic);
    });
  }

  const isHidden = !pipelineNamesPublic;

  return (
    <div className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white px-5 py-4 dark:border-white/10 dark:bg-white/5">
      <div className="flex items-center gap-3">
        <span className="text-base">{isHidden ? "🔒" : "🔓"}</span>
        <div>
          <p className="text-sm font-black text-slate-950 dark:text-white">
            {isHidden ? "Player names hidden from public" : "Player names visible publicly"}
          </p>
          <p className="mt-0.5 text-xs font-bold text-slate-400">
            {isHidden ? "Visitors only see stage counts" : "Visitors can see player names in your pipeline"}
          </p>
        </div>
      </div>
      <button
        onClick={handleToggle}
        disabled={isPending}
        aria-label={isHidden ? "Show player names publicly" : "Hide player names from public"}
        className={`relative h-6 w-11 shrink-0 rounded-full transition-colors disabled:opacity-60 ${
          isHidden ? "bg-slate-300 dark:bg-white/20" : "bg-red-600"
        }`}
      >
        <span
          className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${
            isHidden ? "left-0.5" : "left-[calc(100%-1.375rem)]"
          }`}
        />
      </button>
    </div>
  );
}
