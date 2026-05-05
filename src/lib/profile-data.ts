import type { Profile } from "@/lib/auth";
import type { SupabaseClient } from "@supabase/supabase-js";

export async function getRoleProfile(supabase: SupabaseClient, profile: Profile) {
  if (profile.role === "player") {
    const { data } = await supabase.from("player_profiles").select("*").eq("profile_id", profile.id).maybeSingle();
    return data;
  }

  if (profile.role === "team_admin") {
    const { data } = await supabase.from("team_admin_profiles").select("*").eq("profile_id", profile.id).maybeSingle();
    return data;
  }

  if (profile.role === "scout" || profile.role === "coach" || profile.role === "analyst" || profile.role === "journalist") {
    const { data } = await supabase.from("scout_profiles").select("*").eq("profile_id", profile.id).maybeSingle();
    return data;
  }

  return null;
}
