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
        <p className="text-sm font-black uppercase text-red-500">Recruitment Pipeline</p>
        {!pipelineNamesPublic && (
          <span className="rounded px-3 py-1 text-xs font-black uppercase text-white/30">
            Owner View
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
            className={`rounded-lg border p-4 text-center ${
              key === "reached_out"
                ? "border-red-500/35 bg-red-500/10"
                : "border-white/10 bg-[#1a1a1a]"
            }`}
          >
            <p className={`text-[11px] font-black uppercase ${key === "reached_out" ? "text-red-500" : "text-white/35"}`}>{label}</p>
            <p className="mt-2 text-3xl font-black text-white">{stageCounts[key]}</p>
          </div>
        ))}
      </div>

      {pipelineNamesPublic ? (
        /* Names-public view: show full Kanban — stub until club_pipeline_items exists */
        <div className="rounded-lg border border-white/10 bg-[#111] p-5 text-center">
          <p className="text-sm font-bold text-white/35">
            Pipeline details will appear here once players are added to your roster.
          </p>
        </div>
      ) : (
        /* Privacy mode: signing stats + lock notice */
        <>
          <div className="grid grid-cols-3 gap-3">
            <div className="rounded-lg border border-white/10 bg-[#111] p-5 text-center">
              <p className="text-xs font-black uppercase text-white/35">Total Signed</p>
              <p className="mt-2 text-3xl font-black text-white">{totalSigned}</p>
              {/* TODO: Total Signed — count from club_pipeline_items WHERE stage = 'signed' */}
            </div>
            <div className="rounded-lg border border-white/10 bg-[#111] p-5 text-center">
              <p className="text-xs font-black uppercase text-white/35">Int&apos;l Recruits</p>
              {/* TODO: International Recruits — future field on club_pipeline_items */}
              <p className="mt-2 text-3xl font-black text-white">0</p>
            </div>
            <div className="rounded-lg border border-white/10 bg-[#111] p-5 text-center">
              <p className="text-xs font-black uppercase text-white/35">From Pipeline</p>
              {/* TODO: University Pipeline — future field on club_pipeline_items */}
              <p className="mt-2 text-3xl font-black text-white">0</p>
            </div>
          </div>
          <p className="rounded-lg border border-white/10 bg-black/20 p-4 text-sm font-semibold text-white/35">
            Player names are not publicly visible. Only club staff can see candidate identities.
          </p>
        </>
      )}
    </section>
  );
}
