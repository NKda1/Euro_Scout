"use server";

import { redirect } from "next/navigation";
import { getAuthenticatedUser, isUserRole, type Profile, type UserRole } from "@/lib/auth";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/server";

type DemoRole = Exclude<UserRole, "admin">;

function publicRole(value: FormDataEntryValue | null): DemoRole {
  const role = String(value ?? "");
  return isUserRole(role) && role !== "admin" ? role : "player";
}

export async function markWelcomeTourSeenAction(formData: FormData) {
  const role = publicRole(formData.get("role"));
  const { user } = await getAuthenticatedUser();
  const serviceClient = createSupabaseServiceRoleClient();
  const { data: existingProfile } = await serviceClient
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle<Profile>();

  if (existingProfile?.onboarding_complete) {
    redirect("/dashboard");
  }

  const displayName = String(
    existingProfile?.display_name ??
      user.user_metadata?.display_name ??
      user.email?.split("@")[0] ??
      "EuroScout member"
  ).slice(0, 100);

  await serviceClient.from("profiles").upsert(
    {
      id: user.id,
      role,
      display_name: displayName,
      headline: existingProfile?.headline ?? null,
      bio: existingProfile?.bio ?? null,
      location: existingProfile?.location ?? null,
      avatar_url: existingProfile?.avatar_url ?? null,
      account_tier: existingProfile?.account_tier ?? "free",
      premium_expires_at: existingProfile?.premium_expires_at ?? null,
      is_public: existingProfile?.is_public ?? false,
      onboarding_complete: false,
      welcome_tour_seen: true,
      updated_at: new Date().toISOString()
    },
    { onConflict: "id" }
  );

  redirect(`/onboarding?role=${role}`);
}
