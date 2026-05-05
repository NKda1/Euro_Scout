import { NextResponse } from "next/server";
import { regions } from "@/lib/data";

export async function GET() {
  return NextResponse.json(regions);
}
