import { NextResponse, type NextRequest } from "next/server";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get("token");
  const type = request.nextUrl.searchParams.get("type");

  if (!token || type !== "nudge") {
    return new NextResponse("Invalid unsubscribe link.", { status: 400, headers: { "content-type": "text/plain" } });
  }

  let profileId: string;
  try {
    const decoded = Buffer.from(token, "base64url").toString("utf8");
    if (!decoded.startsWith("nudge:")) throw new Error("Invalid token");
    profileId = decoded.slice("nudge:".length);
  } catch {
    return new NextResponse("Invalid or expired unsubscribe link.", { status: 400, headers: { "content-type": "text/plain" } });
  }

  const supabase = createSupabaseServiceRoleClient();
  const { error } = await supabase
    .from("profiles")
    .update({ nudge_emails_opted_out: true })
    .eq("id", profileId);

  if (error) {
    console.error("[email.unsubscribe.failed]", { profileId, error: error.message });
    return new NextResponse("Could not process your request. Please try again.", { status: 500, headers: { "content-type": "text/plain" } });
  }

  // Redirect to a simple confirmation page
  return NextResponse.redirect(new URL("/?notice=unsubscribed", request.url));
}
