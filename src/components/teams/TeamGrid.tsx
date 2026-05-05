import type { Team } from "@/types";
import TeamCard from "@/components/teams/TeamCard";

export default function TeamGrid({ teams }: { teams: Team[] }) {
  if (teams.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center">
        <h2 className="text-sm font-black text-slate-950 dark:text-white">No teams available</h2>
        <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">Teams will appear here as this section is populated.</p>
      </div>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {teams.map((team) => (
        <TeamCard key={team.id} team={team} />
      ))}
    </div>
  );
}
