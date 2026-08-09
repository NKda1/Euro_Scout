"use server";

import { headers } from "next/headers";
import { getActionRateLimit } from "@/lib/action-rate-limit";
import { createSupabaseServerClient, createSupabaseServiceRoleClient } from "@/lib/supabase/server";

export type BugReportResult = { ok: boolean; error?: string };

export async function submitBugReportAction(formData: FormData): Promise<BugReportResult> {
  const message = String(formData.get("message") ?? "").trim();
  const pageUrl = String(formData.get("page_url") ?? "").trim();

  if (!message) return { ok: false, error: "Please describe what went wrong." };
  if (message.length > 4000) return { ok: false, error: "Please keep the report under 4,000 characters." };

  let safePageUrl: string | null = null;
  if (pageUrl) {
    try {
      const parsed = new URL(pageUrl);
      if ((parsed.protocol !== "https:" && parsed.protocol !== "http:") || pageUrl.length > 2048) throw new Error();
      safePageUrl = parsed.toString();
    } catch {
      return { ok: false, error: "The page URL is invalid." };
    }
  }

  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  const limit = await getActionRateLimit(`bug-report:${user?.id ?? "anonymous"}`, 5, 60 * 60_000);
  if (!limit.allowed) return { ok: false, error: "Too many reports. Please try again in an hour." };

  const serviceClient = createSupabaseServiceRoleClient();
  let profileId: string | null = null;
  if (user) {
    const { data: profile } = await serviceClient.from("profiles").select("id").eq("id", user.id).maybeSingle<{ id: string }>();
    profileId = profile?.id ?? null;
  }

  const headerStore = await headers();
  const { error } = await serviceClient.from("bug_reports").insert({
    message,
    page_url: safePageUrl,
    profile_id: profileId,
    reporter_email: user?.email ?? null,
    user_agent: headerStore.get("user-agent")?.slice(0, 1000) ?? null
  });

  if (error) {
    console.error("[bug_report.insert_failed]", { code: error.code, message: error.message });
    return { ok: false, error: "We could not save your report. Please try again." };
  }

  return { ok: true };
}
