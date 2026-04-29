import { NextResponse } from "next/server";
import leagues from "@/data/leagues.seed";
import teams from "@/data/teams.seed";

interface RouteContext {
  params: Promise<{
    leagueId: string;
  }>;
}

export async function GET(_request: Request, { params }: RouteContext) {
  const { leagueId } = await params;
  const league = leagues.find((item) => item.id === leagueId || item.slug === leagueId);

  if (!league) {
    return NextResponse.json({ error: "League not found" }, { status: 404 });
  }

  const leagueTeams = teams.filter((team) => team.leagueId === league.id);

  return NextResponse.json(leagueTeams);
}
