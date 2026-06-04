import PipelinePrivacyToggle from "./PipelinePrivacyToggle";

interface ClubPipelineSectionProps {
  teamId: string;
  isOwner: boolean;
  pipelineNamesPublic: boolean;
}

// TODO: Replace stub counts with real queries once club_pipeline_items table exists.
// Each stage should query: SELECT stage, COUNT(*) FROM club_pipeline_items WHERE team_id = teamId GROUP BY stage
const PIPELINE_STAGES = [
  { key: "scouted", label: "Scouted" },
  { key: "shortlisted", label: "Shortlisted" },
  { key: "reached_out", label: "Reached Out" },
  { key: "offer_extended", label: "Offer Extended" },
  { key: "signed", label: "Signed" }
] as const;

export default function ClubPipelineSection({ teamId, isOwner, pipelineNamesPublic }: ClubPipelineSectionProps) {
  // TODO: Query club_pipeline_items table when it exists
  const stageCounts: Record<string, number> = {
    scouted: 0,
    shortlisted: 0,
    reached_out: 0,
    offer_extended: 0,
    signed: 0
  };

  // TODO: COUNT(*) FROM club_pipeline_items WHERE team_id = teamId AND stage = 'signed'
  const totalSigned = 0;

  return (
    <section className="space-y-5">
      <div className="flex items-center justify-between gap-4">
        <p className="eyebrow-red">Recruitment Pipeline</p>
        {!pipelineNamesPublic && (
          <span className="flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-500 dark:bg-white/10 dark:text-slate-400">
            🔒 Names hidden
          </span>
        )}
      </div>

      {/* Owner: privacy toggle */}
      {isOwner && <PipelinePrivacyToggle teamId={teamId} pipelineNamesPublic={pipelineNamesPublic} />}

      {/* Stage count strip — always visible */}
      <div className="grid grid-cols-5 gap-2">
        {PIPELINE_STAGES.map(({ key, label }) => (
          <div
            key={key}
            className="rounded-2xl border border-slate-200 bg-white p-3 text-center dark:border-white/10 dark:bg-white/5"
          >
            <p className="text-2xl font-black text-slate-950 dark:text-white">{stageCounts[key]}</p>
            <p className="mt-1 text-[10px] font-black uppercase tracking-[0.14em] text-slate-400">{label}</p>
          </div>
        ))}
      </div>

      {pipelineNamesPublic ? (
        /* Names-public view: show full Kanban — stub until club_pipeline_items exists */
        <div className="rounded-2xl border border-slate-200 bg-white/60 p-5 text-center dark:border-white/10 dark:bg-white/5">
          <p className="text-sm font-bold text-slate-400">
            Pipeline details will appear here once players are added to your roster.
          </p>
        </div>
      ) : (
        /* Privacy mode: signing stats + lock notice */
        <>
          <div className="grid grid-cols-3 gap-3">
            <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-white/10 dark:bg-white/5">
              <p className="text-2xl font-black text-slate-950 dark:text-white">{totalSigned}</p>
              {/* TODO: Total Signed — count from club_pipeline_items WHERE stage = 'signed' */}
              <p className="mt-1 text-[10px] font-black uppercase tracking-[0.14em] text-slate-400">Total Signed</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-white/10 dark:bg-white/5">
              {/* TODO: International Recruits — future field on club_pipeline_items */}
              <p className="text-2xl font-black text-slate-950 dark:text-white">0</p>
              <p className="mt-1 text-[10px] font-black uppercase tracking-[0.14em] text-slate-400">Int&apos;l Recruits</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-white/10 dark:bg-white/5">
              {/* TODO: University Pipeline — future field on club_pipeline_items */}
              <p className="text-2xl font-black text-slate-950 dark:text-white">0</p>
              <p className="mt-1 text-[10px] font-black uppercase tracking-[0.14em] text-slate-400">Univ. Pipeline</p>
            </div>
          </div>
          <p className="text-center text-xs font-bold text-slate-400">
            🔒 Player names are not publicly visible
          </p>
        </>
      )}
    </section>
  );
}
