import type { Profile } from "@/lib/auth";
import type { SupabaseClient } from "@supabase/supabase-js";

export async function getRoleProfile(supabase: SupabaseClient, profile: Profile) {
  if (profile.role === "player") {
    const { data } = await supabase.from("player_profiles").select("*").eq("profile_id", profile.id).maybeSingle();
    return data;
  }

  return null;
}
