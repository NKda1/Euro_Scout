"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getAuthenticatedUser, isReservedAdminEmail, isUserRole, splitName, type UserRole } from "@/lib/auth";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/server";

function text(formData: FormData, key: string) {
  const value = String(formData.get(key) ?? "").trim();
  return value || null;
}

function requiredText(formData: FormData, key: string) {
  const value = text(formData, key);

  if (!value) {
    throw new Error(`${key} is required`);
  }

  return value;
}

function numberOrNull(formData: FormData, key: string) {
  const value = text(formData, key);
  return value ? Number(value) : null;
}

function boolValue(formData: FormData, key: string) {
  return formData.get(key) === "on";
}

function requireAllowedRole(role: UserRole, email?: string | null, redirectPath = "/onboarding") {
  if (role === "admin" && !isReservedAdminEmail(email)) {
    redirect(`${redirectPath}?error=The admin role is reserved for the EuroScout owner account.`);
  }
}

async function upsertPlayerProfile(supabase: Awaited<ReturnType<typeof getAuthenticatedUser>>["supabase"], userId: string, formData: FormData) {
  const displayName = requiredText(formData, "display_name");
  const name = splitName(displayName);
  const payload: Record<string, unknown> = {
    profile_id: userId,
    first_name: text(formData, "first_name") ?? name.firstName,
    last_name: text(formData, "last_name") ?? name.lastName,
    dob: text(formData, "dob") || null,
    nationality: text(formData, "nationality"),
    languages: text(formData, "languages")?.split(",").map((s) => s.trim()).filter(Boolean) ?? [],
    passport_ready: text(formData, "passport_ready") === "on" ? true : text(formData, "passport_ready") === "" && formData.has("passport_ready") ? false : null,
    position: text(formData, "position"),
    height_cm: numberOrNull(formData, "height_cm"),
    weight_kg: numberOrNull(formData, "weight_kg"),
    current_team_id: text(formData, "current_team_id"),
    pipeline_type: text(formData, "pipeline_type"),
    available_for_transfer: boolValue(formData, "available_for_transfer"),
    updated_at: new Date().toISOString()
  };

  if (formData.has("photo_urls")) {
    payload.photo_urls = text(formData, "photo_urls")?.split("\n").map((item) => item.trim()).filter(Boolean).slice(0, 5) ?? [];
  }

  await supabase.from("player_profiles").upsert(
    payload,
    { onConflict: "profile_id" }
  );
}

export async function completeOnboardingAction(formData: FormData) {
  const { supabase, user } = await getAuthenticatedUser();

  // Never strip admin role — admins may preview any role in the wizard
  const { data: currentProfile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  const isCurrentlyAdmin = currentProfile?.role === "admin";
  const roleValue = isCurrentlyAdmin ? "admin" : requiredText(formData, "role");

  if (!isCurrentlyAdmin && !isUserRole(roleValue)) {
    redirect("/onboarding?error=Choose a valid role.");
  }

  if (!isCurrentlyAdmin) {
    requireAllowedRole(roleValue as UserRole, user.email, "/onboarding");
  }

  const displayName = requiredText(formData, "display_name");

  const { error } = await supabase.from("profiles").upsert(
    {
      id: user.id,
      role: roleValue,
      display_name: displayName,
      headline: text(formData, "headline"),
      bio: text(formData, "bio"),
      location: text(formData, "location"),
      is_public: boolValue(formData, "is_public"),
      onboarding_complete: true,
      updated_at: new Date().toISOString()
    },
    { onConflict: "id" }
  );

  if (error) {
    redirect(`/onboarding?error=${encodeURIComponent(error.message)}`);
  }

  if (roleValue === "player") {
    await upsertPlayerProfile(supabase, user.id, formData);
  }

  if (roleValue === "club") {
    const teamId = text(formData, "team_id");
    const clubAction = text(formData, "club_action");
    const teamNameRequest = text(formData, "team_name_request");

    if (teamId && clubAction === "claim") {
      const now = new Date().toISOString();
      const expiresAt = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString();
      const serviceClient = createSupabaseServiceRoleClient();

      const { data: teamClaim, error: claimError } = await serviceClient
        .from("teams")
        .update({
          claim_status: "pending",
          claimed_at: now,
          claim_expires_at: expiresAt,
          claimed_by: user.id
        })
        .eq("id", teamId)
        .or("claim_status.is.null,claim_status.eq.unclaimed")
        .select("id")
        .maybeSingle<{ id: string }>();

      if (claimError) {
        redirect(`/onboarding?error=${encodeURIComponent(claimError.message)}`);
      }

      if (!teamClaim) {
        redirect("/onboarding?error=That club is already claimed or unavailable for claiming.");
      }

      const { error: memberError } = await serviceClient.from("club_members").insert({
        team_id: teamId,
        profile_id: user.id,
        club_role: "owner",
        joined_at: now
      });

      if (memberError) {
        redirect(`/onboarding?error=${encodeURIComponent(memberError.message)}`);
      }
    } else if (teamId && clubAction === "join") {
      await supabase.from("club_members").insert({
        team_id: teamId,
        profile_id: user.id,
        club_role: "recruiter",
        joined_at: new Date().toISOString()
      });
    } else if (teamNameRequest) {
      revalidatePath("/account");
      redirect(`/account?notice=${encodeURIComponent(`Account created. Add ${teamNameRequest} from the club creation form to create its unverified profile.`)}`);
    }
  }

  revalidatePath("/account");
  revalidatePath("/dashboard");
  revalidatePath("/scouts");
  revalidatePath(`/scouts/${user.id}`);
  redirect("/account");
}

export async function updateAccountAction(formData: FormData) {
  const { supabase, user } = await getAuthenticatedUser();

  // Never strip admin role via the account edit form
  const { data: currentProfile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  const isCurrentlyAdmin = currentProfile?.role === "admin";
  const roleValue = isCurrentlyAdmin ? "admin" : requiredText(formData, "role");

  if (!isCurrentlyAdmin && !isUserRole(roleValue)) {
    redirect("/account?error=Choose a valid role.");
  }

  if (!isCurrentlyAdmin) {
    requireAllowedRole(roleValue as UserRole, user.email, "/account");
  }

  const { error } = await supabase
    .from("profiles")
    .update({
      role: roleValue,
      display_name: requiredText(formData, "display_name"),
      headline: text(formData, "headline"),
      bio: text(formData, "bio"),
      location: text(formData, "location"),
      is_public: boolValue(formData, "is_public"),
      onboarding_complete: true,
      updated_at: new Date().toISOString()
    })
    .eq("id", user.id);

  if (error) {
    redirect(`/account?error=${encodeURIComponent(error.message)}`);
  }

  if (roleValue === "player") {
    await upsertPlayerProfile(supabase, user.id, formData);
  }

  revalidatePath("/account");
  revalidatePath("/profiles");
  revalidatePath("/players");
  redirect("/account");
}

export async function restoreAdminRoleAction() {
  const { user } = await getAuthenticatedUser();

  if (!isReservedAdminEmail(user.email)) {
    redirect("/dashboard?error=Only the designated super admin account can restore the admin role.");
  }

  // Use service role client to guarantee the update bypasses any RLS restrictions
  const serviceClient = createSupabaseServiceRoleClient();
  await serviceClient
    .from("profiles")
    .update({ role: "admin", onboarding_complete: true, updated_at: new Date().toISOString() })
    .eq("id", user.id);

  revalidatePath("/dashboard");
  revalidatePath("/admin");
  redirect("/dashboard");
}
