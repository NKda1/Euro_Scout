import { NextResponse } from "next/server";
import regions from "@/data/regions.seed";

export async function GET() {
  return NextResponse.json(regions);
}
