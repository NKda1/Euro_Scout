import { NextResponse } from "next/server";
import teams from "@/data/teams.seed";

interface RouteContext {
  params: Promise<{
    teamId: string;
  }>;
}

export async function GET(_request: Request, { params }: RouteContext) {
  const { teamId } = await params;
  const team = teams.find((item) => item.id === teamId || item.slug === teamId);

  if (!team) {
    return NextResponse.json({ error: "Team not found" }, { status: 404 });
  }

  return NextResponse.json(team);
}
