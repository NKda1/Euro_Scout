"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { enforceActionRateLimit } from "@/lib/action-rate-limit";
import { getAuthenticatedProfile } from "@/lib/auth";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/server";

const validReasons = new Set(["impersonation", "misleading_profile", "unsafe_contact", "spam", "other"]);

function formText(formData: FormData, key: string, maxLength = 1000) {
  const value = String(formData.get(key) ?? "").trim();
  return value ? value.slice(0, maxLength) : null;
}

function safeReturnPath(value: string | null) {
  if (!value || !value.startsWith("/") || value.startsWith("//")) return "/players";
  return value;
}

function withMessage(path: string, key: "error" | "notice", message: string) {
  return `${path}${path.includes("?") ? "&" : "?"}${key}=${encodeURIComponent(message)}`;
}

export async function reportProfileAction(formData: FormData) {
  const returnPath = safeReturnPath(formText(formData, "return_path", 300));
  const reportedProfileId = formText(formData, "reported_profile_id", 120);
  const reason = formText(formData, "reason", 80);
  const details = formText(formData, "details", 2000);
  const { profile } = await getAuthenticatedProfile();

  if (!profile?.onboarding_complete) {
    redirect("/welcome");
  }

  await enforceActionRateLimit(`profile-report:${profile.id}`, 5, 24 * 60 * 60_000, returnPath);

  if (!reportedProfileId || reportedProfileId === profile.id) {
    redirect(withMessage(returnPath, "error", "Choose another profile to report."));
  }

  if (!reason || !validReasons.has(reason)) {
    redirect(withMessage(returnPath, "error", "Choose a reason for the report."));
  }

  const serviceClient = createSupabaseServiceRoleClient();
  const { data: reportedProfile, error: profileError } = await serviceClient
    .from("profiles")
    .select("id, display_name")
    .eq("id", reportedProfileId)
    .maybeSingle<{ id: string; display_name: string }>();

  if (profileError) {
    redirect(withMessage(returnPath, "error", profileError.message));
  }

  if (!reportedProfile) {
    redirect(withMessage(returnPath, "error", "That profile could not be found."));
  }

  const { error } = await serviceClient.from("profile_reports").insert({
    reported_profile_id: reportedProfile.id,
    reporter_profile_id: profile.id,
    reason,
    details
  });

  if (error) {
    const duplicate = /duplicate|unique/i.test(error.message);
    redirect(withMessage(returnPath, duplicate ? "notice" : "error", duplicate ? "You already have an open report for this profile." : error.message));
  }

  revalidatePath(returnPath);
  redirect(withMessage(returnPath, "notice", "Report submitted. The admin team will review it."));
}
