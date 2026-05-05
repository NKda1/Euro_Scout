import { NextResponse } from "next/server";
import { getLeaguesForRegion, getRegionByIdOrSlug } from "@/lib/data";

interface RouteContext {
  params: Promise<{
    regionId: string;
  }>;
}

export async function GET(_request: Request, { params }: RouteContext) {
  const { regionId } = await params;
  const region = getRegionByIdOrSlug(regionId);

  if (!region) {
    return NextResponse.json({ error: "Region not found" }, { status: 404 });
  }

  const regionLeagues = getLeaguesForRegion(region.id);

  return NextResponse.json(regionLeagues);
}
