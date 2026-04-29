import type { Team } from "@/types";
import TeamCard from "@/components/teams/TeamCard";

export default function TeamGrid({ teams }: { teams: Team[] }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {teams.map((team) => (
        <TeamCard key={team.id} team={team} />
      ))}
    </div>
  );
}
