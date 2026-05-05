import { NextResponse } from "next/server";
import { teams } from "@/lib/data";

export async function GET() {
  return NextResponse.json(teams);
}
