import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const userRoles = ["player", "scout", "coach", "team_admin", "analyst", "journalist", "fan", "admin"] as const;
export const publicUserRoles = userRoles.filter((role) => role !== "admin");

export type UserRole = (typeof userRoles)[number];

export interface Profile {
  id: string;
  role: UserRole;
  display_name: string;
  headline: string | null;
  bio: string | null;
  location: string | null;
  avatar_url: string | null;
  is_public: boolean;
  onboarding_complete: boolean;
  created_at: string;
  updated_at: string;
}

export function isUserRole(value: string): value is UserRole {
  return userRoles.includes(value as UserRole);
}

export function isReservedAdminEmail(email?: string | null) {
  const allowedEmails = (process.env.EUROSCOUT_SUPER_ADMIN_EMAILS ?? "")
    .split(",")
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean);

  return Boolean(email && allowedEmails.includes(email.toLowerCase()));
}

export async function getAuthenticatedUser() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/sign-in");
  }

  return { supabase, user };
}

export async function getAuthenticatedProfile() {
  const { supabase, user } = await getAuthenticatedUser();
  const { data: profile } = await supabase.from("profiles").select("*").eq("id", user.id).maybeSingle<Profile>();

  if (isReservedAdminEmail(user.email) && (!profile || profile.role !== "admin" || !profile.onboarding_complete)) {
    const displayName = String(user.user_metadata?.display_name ?? user.email?.split("@")[0] ?? "EuroScout Admin");
    const { data: adminProfile, error } = await supabase
      .from("profiles")
      .upsert(
        {
          id: user.id,
          role: "admin",
          display_name: profile?.display_name ?? displayName,
          headline: profile?.headline ?? "EuroScout Pro Owner",
          bio: profile?.bio ?? null,
          location: profile?.location ?? null,
          avatar_url: profile?.avatar_url ?? null,
          is_public: profile?.is_public ?? false,
          onboarding_complete: true,
          updated_at: new Date().toISOString()
        },
        { onConflict: "id" }
      )
      .select("*")
      .maybeSingle<Profile>();

    if (!error && adminProfile) {
      return { supabase, user, profile: adminProfile };
    }
  }

  return { supabase, user, profile };
}

export async function requireOnboardedProfile() {
  const context = await getAuthenticatedProfile();

  if (!context.profile?.onboarding_complete) {
    redirect("/onboarding");
  }

  return context as typeof context & { profile: Profile };
}

export async function requireAdminProfile() {
  const context = await requireOnboardedProfile();

  if (context.profile.role !== "admin") {
    redirect("/dashboard?error=Admin access is required.");
  }

  return context;
}

export function roleLabel(role: UserRole) {
  const labels: Record<UserRole, string> = {
    player: "Player",
    scout: "Scout",
    coach: "Coach",
    team_admin: "Team Admin",
    analyst: "Analyst",
    journalist: "Journalist",
    admin: "Admin",
    fan: "Fan"
  };

  return labels[role];
}

export function splitName(displayName: string) {
  const parts = displayName.trim().split(/\s+/).filter(Boolean);
  const firstName = parts[0] ?? displayName.trim();
  const lastName = parts.slice(1).join(" ");

  return {
    firstName,
    lastName: lastName || " "
  };
}
