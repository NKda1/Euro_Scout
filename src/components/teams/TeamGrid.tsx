import type { Team } from "@/types";
import type { League } from "@/types";
import TeamCard from "@/components/teams/TeamCard";

export default function TeamGrid({ teams, leagues = [] }: { teams: Team[]; leagues?: League[] }) {
  if (teams.length === 0) {
    return (
      <div className="border border-dashed border-slate-300 bg-white p-8 text-center dark:border-white/15 dark:bg-[#111]">
        <h2 className="text-sm font-black text-slate-950 dark:text-white">No teams available</h2>
        <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">Teams will appear here as this section is populated.</p>
      </div>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {teams.map((team) => {
        const league = leagues.find((item) => item.id === team.leagueId);
        return <TeamCard key={team.id} team={team} league={league} />;
      })}
    </div>
  );
}
