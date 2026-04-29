import { NextResponse } from "next/server";
import leagues from "@/data/leagues.seed";

interface RouteContext {
  params: Promise<{
    regionId: string;
  }>;
}

export async function GET(_request: Request, { params }: RouteContext) {
  const { regionId } = await params;
  const regionLeagues = leagues.filter((league) => league.regionIds.includes(regionId));

  return NextResponse.json(regionLeagues);
}
