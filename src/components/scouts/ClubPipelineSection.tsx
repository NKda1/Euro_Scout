import Link from "next/link";
import { updateWatchlistItemRecruitmentStatusAction } from "@/app/actions/watchlist";

export interface PipelinePlayer {
  id: string;
  profileId: string;
  watchlistId?: string;
  watchlistName?: string;
  name: string;
  headline?: string | null;
  position?: string | null;
  nationality?: string | null;
  avatarUrl?: string | null;
  notes?: string | null;
  recruitmentStatus?: string | null;
  createdAt?: string | null;
}

interface ClubPipelineSectionProps {
  scoutId: string;
  canView: boolean;
  watchlisted: PipelinePlayer[];
  reachedOut: PipelinePlayer[];
  interested: PipelinePlayer[];
}

const statusLabels: Record<string, string> = {
  watchlisted: "Watchlisted",
  in_negotiations: "In negotiations",
  signed: "Signed",
  archived: "Archived"
};

function initials(name: string) {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

function PlayerRow({ player, scoutId, showStatusControl }: { player: PipelinePlayer; scoutId: string; showStatusControl?: boolean }) {
  return (
    <div className="grid gap-3 border-t border-white/10 py-4 first:border-t-0 first:pt-0 last:pb-0 md:grid-cols-[minmax(0,1fr)_220px] md:items-center">
      <Link href={`/players/${player.profileId}`} className="flex min-w-0 items-center gap-3">
        <span
          className="flex h-11 w-11 shrink-0 items-center justify-center border border-white/10 bg-white/10 bg-cover bg-center text-sm font-black text-white/55"
          style={player.avatarUrl ? { backgroundImage: `linear-gradient(180deg, transparent, rgba(0,0,0,.65)), url(${player.avatarUrl})` } : undefined}
        >
          {player.avatarUrl ? "" : initials(player.name)}
        </span>
        <span className="min-w-0">
          <span className="block truncate text-sm font-black text-white">{player.name}</span>
          <span className="mt-1 block truncate text-xs font-semibold text-white/40">
            {[player.position, player.nationality, player.headline].filter(Boolean).join(" · ") || "Player profile"}
          </span>
          {player.watchlistName ? <span className="mt-1 block text-[11px] font-bold uppercase text-red-300/80">{player.watchlistName}</span> : null}
        </span>
      </Link>

      {showStatusControl && player.watchlistId ? (
        <form action={updateWatchlistItemRecruitmentStatusAction} className="grid grid-cols-[minmax(0,1fr)_auto] gap-2">
          <input type="hidden" name="watchlist_item_id" value={player.id} />
          <input type="hidden" name="watchlist_id" value={player.watchlistId} />
          <input type="hidden" name="return_path" value={`/scouts/${scoutId}`} />
          <select name="recruitment_status" defaultValue={player.recruitmentStatus ?? "watchlisted"} className="h-10 border border-white/10 bg-black/35 px-3 text-xs font-bold text-white outline-none focus:border-red-500">
            {Object.entries(statusLabels).map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
          <button className="h-10 bg-red-600 px-3 text-xs font-black uppercase text-white transition hover:bg-red-700">
            Save
          </button>
        </form>
      ) : (
        <span className="w-fit border border-white/10 bg-black/20 px-3 py-2 text-xs font-black uppercase text-white/45">
          {statusLabels[player.recruitmentStatus ?? ""] ?? "Active"}
        </span>
      )}
    </div>
  );
}

function PipelineList({ title, description, players, scoutId, showStatusControl }: { title: string; description: string; players: PipelinePlayer[]; scoutId: string; showStatusControl?: boolean }) {
  return (
    <div className="border border-white/10 bg-black/20 p-4">
      <div className="mb-3 flex items-end justify-between gap-3">
        <div>
          <h3 className="text-sm font-black text-white">{title}</h3>
          <p className="mt-1 text-xs font-semibold text-white/40">{description}</p>
        </div>
        <span className="text-2xl font-black text-white">{players.length}</span>
      </div>
      {players.length ? (
        <div>
          {players.slice(0, 6).map((player) => (
            <PlayerRow key={`${title}-${player.id}`} player={player} scoutId={scoutId} showStatusControl={showStatusControl} />
          ))}
        </div>
      ) : (
        <p className="border border-dashed border-white/10 p-4 text-sm font-semibold text-white/35">No players here yet.</p>
      )}
    </div>
  );
}

export default function ClubPipelineSection({ scoutId, canView, watchlisted, reachedOut, interested }: ClubPipelineSectionProps) {
  if (!canView) return null;

  const inNegotiations = watchlisted.filter((player) => player.recruitmentStatus === "in_negotiations");
  const signed = watchlisted.filter((player) => player.recruitmentStatus === "signed");

  return (
    <section className="theme-private space-y-5 border border-slate-200 bg-white p-5 text-slate-950 dark:border-white/10 dark:bg-[#111] dark:text-white">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-black uppercase text-red-500">Recruitment Pipeline</p>
          <p className="mt-1 text-sm font-semibold text-white/40">Private owner/admin view for scouting activity, interest and shortlist status.</p>
        </div>
        <Link href="/watchlists" className="inline-flex h-10 items-center border border-white/10 bg-white/[0.03] px-4 text-xs font-black uppercase text-white/55 transition hover:border-red-500/40 hover:text-white">
          Manage watchlists
        </Link>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {[
          ["Watchlisted", watchlisted.length],
          ["Reached out", reachedOut.length],
          ["Interested", interested.length],
          ["Signed", signed.length]
        ].map(([label, count]) => (
          <div key={label} className="border border-white/10 bg-[#111] p-4">
            <p className="text-xs font-black uppercase text-white/35">{label}</p>
            <p className="mt-2 text-3xl font-black text-white">{count}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <PipelineList title="Watchlists" description="Shortlisted players with negotiation and signing status." players={watchlisted} scoutId={scoutId} showStatusControl />
        <PipelineList title="Reached out" description="Players this club contacted first." players={reachedOut} scoutId={scoutId} />
        <PipelineList title="Expressed interest" description="Players who pressed express interest this week or earlier." players={interested} scoutId={scoutId} />
        <PipelineList title="In negotiations" description="Shortlist players currently being pursued." players={inNegotiations} scoutId={scoutId} showStatusControl />
      </div>
    </section>
  );
}
