import { NextResponse } from "next/server";
import { getTeamByIdOrSlug } from "@/lib/data";

interface RouteContext {
  params: Promise<{
    teamId: string;
  }>;
}

export async function GET(_request: Request, { params }: RouteContext) {
  const { teamId } = await params;
  const team = getTeamByIdOrSlug(teamId);

  if (!team) {
    return NextResponse.json({ error: "Team not found" }, { status: 404 });
  }

  return NextResponse.json(team);
}
