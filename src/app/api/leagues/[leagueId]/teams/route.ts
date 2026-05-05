import { NextResponse } from "next/server";
import { getLeagueByIdOrSlug, getTeamsForLeague } from "@/lib/data";

interface RouteContext {
  params: Promise<{
    leagueId: string;
  }>;
}

export async function GET(_request: Request, { params }: RouteContext) {
  const { leagueId } = await params;
  const league = getLeagueByIdOrSlug(leagueId);

  if (!league) {
    return NextResponse.json({ error: "League not found" }, { status: 404 });
  }

  const leagueTeams = getTeamsForLeague(league.id);

  return NextResponse.json(leagueTeams);
}
