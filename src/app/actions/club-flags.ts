"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getAuthenticatedProfile } from "@/lib/auth";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/server";

const validReasons = new Set(["not_affiliated", "wrong_owner", "impersonation", "duplicate_claim", "other"]);
const reasonLabels: Record<string, string> = {
  not_affiliated: "Owner is not affiliated",
  wrong_owner: "Wrong owner or staff member",
  impersonation: "Possible impersonation",
  duplicate_claim: "Duplicate club claim",
  other: "Other concern"
};

function formText(formData: FormData, key: string, maxLength = 1000) {
  const value = String(formData.get(key) ?? "").trim();
  return value ? value.slice(0, maxLength) : null;
}

function safeReturnPath(value: string | null) {
  if (!value || !value.startsWith("/") || value.startsWith("//")) return "/scouts";
  return value;
}

function withMessage(path: string, key: "error" | "notice", message: string) {
  return `${path}${path.includes("?") ? "&" : "?"}${key}=${encodeURIComponent(message)}`;
}

export async function flagClubAccountAction(formData: FormData) {
  const returnPath = safeReturnPath(formText(formData, "return_path", 300));
  const teamId = formText(formData, "team_id", 120);
  const reason = formText(formData, "reason", 80);
  const details = formText(formData, "details", 2000);
  const { profile } = await getAuthenticatedProfile();

  if (!profile?.onboarding_complete) {
    redirect("/onboarding");
  }

  if (!teamId) {
    redirect(withMessage(returnPath, "error", "Choose a club account to flag."));
  }

  if (!reason || !validReasons.has(reason)) {
    redirect(withMessage(returnPath, "error", "Choose a reason for the club account flag."));
  }

  const serviceClient = createSupabaseServiceRoleClient();
  const { data: team, error: teamError } = await serviceClient
    .from("teams")
    .select("id, name, claim_status")
    .eq("id", teamId)
    .maybeSingle<{ id: string; name: string; claim_status: string | null }>();

  if (teamError) {
    redirect(withMessage(returnPath, "error", teamError.message));
  }

  if (!team || !["pending", "verified"].includes(team.claim_status ?? "")) {
    redirect(withMessage(returnPath, "error", "Only newly claimed or verified club accounts can be flagged."));
  }

  const { data: membership } = await serviceClient
    .from("club_members")
    .select("profile_id")
    .eq("team_id", teamId)
    .eq("profile_id", profile.id)
    .maybeSingle<{ profile_id: string }>();

  if (membership && profile.role !== "admin") {
    redirect(withMessage(returnPath, "error", "Club staff cannot flag their own club account."));
  }

  const { data: existingFlag, error: existingFlagError } = await serviceClient
    .from("club_disputes")
    .select("id, status")
    .eq("team_id", teamId)
    .eq("raised_by", profile.id)
    .like("reason", "Club account flag:%")
    .limit(1)
    .maybeSingle<{ id: string; status: string }>();

  if (existingFlagError) {
    redirect(withMessage(returnPath, "error", `Could not check existing flags: ${existingFlagError.message}`));
  }

  if (existingFlag) {
    redirect(withMessage(returnPath, "notice", "You have already flagged this club account. The admin team will review it from club disputes."));
  }

  const flagReason = [
    `Club account flag: ${reasonLabels[reason] ?? "Other concern"}`,
    details ? `Details: ${details}` : null
  ].filter(Boolean).join("\n\n");

  const { error } = await serviceClient.from("club_disputes").insert({
    team_id: teamId,
    raised_by: profile.id,
    reason: flagReason,
    status: "open"
  });

  if (error) {
    if (error.code === "23505") {
      redirect(withMessage(returnPath, "notice", "You have already flagged this club account. The admin team will review it from club disputes."));
    }
    redirect(withMessage(returnPath, "error", `Could not submit club account flag: ${error.message}`));
  }

  revalidatePath("/admin");
  revalidatePath("/admin/disputes");
  revalidatePath(`/scouts/${teamId}`);
  revalidatePath(returnPath);
  redirect(withMessage(returnPath, "notice", `${team.name} has been flagged in club disputes for admin review.`));
}
