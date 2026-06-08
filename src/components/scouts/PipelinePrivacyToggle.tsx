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
    <div className="flex items-center justify-between border border-slate-200 bg-white px-5 py-4 dark:border-white/15 dark:bg-[#151515]">
      <div className="flex items-center gap-3">
        <div>
          <p className="text-base font-black text-slate-950 dark:text-white">
            {isHidden ? "Player names hidden from public" : "Player names visible publicly"}
          </p>
          <p className="mt-0.5 text-sm font-semibold text-slate-500 dark:text-white/45">
            {isHidden ? "Visitors only see stage counts" : "Visitors can see player names in your pipeline"}
          </p>
        </div>
      </div>
      <button
        onClick={handleToggle}
        disabled={isPending}
        aria-label={isHidden ? "Show player names publicly" : "Hide player names from public"}
        className={`relative h-7 w-12 shrink-0 rounded-full transition-colors disabled:opacity-60 ${
          isHidden ? "bg-slate-200 dark:bg-white/15" : "bg-red-600"
        }`}
      >
        <span
          className={`absolute top-1 h-5 w-5 rounded-full bg-red-500 transition-all ${
            isHidden ? "left-1" : "left-[calc(100%-1.5rem)]"
          }`}
        />
      </button>
    </div>
  );
}
