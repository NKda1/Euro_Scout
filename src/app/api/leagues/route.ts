import { NextResponse } from "next/server";
import leagues from "@/data/leagues.seed";

export async function GET() {
  return NextResponse.json(leagues);
}
