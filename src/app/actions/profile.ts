"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getAuthenticatedUser, isReservedAdminEmail, isUserRole, splitName, type UserRole } from "@/lib/auth";

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

function roleSpecificTable(role: UserRole) {
  if (role === "player") {
    return "player_profiles";
  }

  if (role === "team_admin") {
    return "team_admin_profiles";
  }

  if (role === "scout" || role === "coach" || role === "analyst" || role === "journalist") {
    return "scout_profiles";
  }

  return null;
}

function requireAllowedRole(role: UserRole, email?: string | null, redirectPath = "/onboarding") {
  if (role === "admin" && !isReservedAdminEmail(email)) {
    redirect(`${redirectPath}?error=The admin role is reserved for the EuroScout owner account.`);
  }
}

async function upsertRoleProfile(supabase: Awaited<ReturnType<typeof getAuthenticatedUser>>["supabase"], userId: string, role: UserRole, formData: FormData) {
  const table = roleSpecificTable(role);

  if (!table) {
    return;
  }

  if (table === "player_profiles") {
    const displayName = requiredText(formData, "display_name");
    const name = splitName(displayName);

    await supabase.from(table).upsert(
      {
        profile_id: userId,
        first_name: text(formData, "first_name") ?? name.firstName,
        last_name: text(formData, "last_name") ?? name.lastName,
        nationality: text(formData, "nationality"),
        position: text(formData, "position"),
        height_cm: numberOrNull(formData, "height_cm"),
        weight_kg: numberOrNull(formData, "weight_kg"),
        current_team_id: text(formData, "current_team_id"),
        pipeline_type: text(formData, "pipeline_type"),
        available_for_transfer: boolValue(formData, "available_for_transfer"),
        photo_urls: text(formData, "photo_urls")?.split("\n").map((item) => item.trim()).filter(Boolean).slice(0, 5) ?? [],
        updated_at: new Date().toISOString()
      },
      { onConflict: "profile_id" }
    );
  }

  if (table === "scout_profiles") {
    await supabase.from(table).upsert(
      {
        profile_id: userId,
        organization: text(formData, "organization"),
        focus_regions: text(formData, "focus_regions")?.split(",").map((item) => item.trim()).filter(Boolean) ?? [],
        focus_positions: text(formData, "focus_positions")?.split(",").map((item) => item.trim()).filter(Boolean) ?? [],
        years_experience: numberOrNull(formData, "years_experience"),
        contact_email: text(formData, "contact_email"),
        updated_at: new Date().toISOString()
      },
      { onConflict: "profile_id" }
    );
  }

  if (table === "team_admin_profiles") {
    await supabase.from(table).upsert(
      {
        profile_id: userId,
        team_id: text(formData, "team_id"),
        organization_name: text(formData, "organization_name"),
        title: text(formData, "title"),
        recruiting_needs: text(formData, "recruiting_needs"),
        contact_email: text(formData, "contact_email"),
        updated_at: new Date().toISOString()
      },
      { onConflict: "profile_id" }
    );
  }
}

export async function completeOnboardingAction(formData: FormData) {
  const { supabase, user } = await getAuthenticatedUser();
  const roleValue = requiredText(formData, "role");

  if (!isUserRole(roleValue)) {
    redirect("/onboarding?error=Choose a valid role.");
  }

  requireAllowedRole(roleValue, user.email, "/onboarding");

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

  await upsertRoleProfile(supabase, user.id, roleValue, formData);
  revalidatePath("/account");
  revalidatePath("/dashboard");
  redirect("/dashboard");
}

export async function updateAccountAction(formData: FormData) {
  const { supabase, user } = await getAuthenticatedUser();
  const roleValue = requiredText(formData, "role");

  if (!isUserRole(roleValue)) {
    redirect("/account/edit?error=Choose a valid role.");
  }

  requireAllowedRole(roleValue, user.email, "/account/edit");

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
    redirect(`/account/edit?error=${encodeURIComponent(error.message)}`);
  }

  await upsertRoleProfile(supabase, user.id, roleValue, formData);
  revalidatePath("/account");
  revalidatePath("/profiles");
  revalidatePath("/players");
  revalidatePath("/scouts");
  redirect("/account");
}
