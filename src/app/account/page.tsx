import type { Metadata } from "next";
import type { FilmLink } from "@/components/players/HudlFilmViewer";
import ProfileSummary from "@/components/profiles/ProfileSummary";
import { requireOnboardedProfile } from "@/lib/auth";
import { getRoleProfile } from "@/lib/profile-data";

export const metadata: Metadata = {
  title: "Account | EuroScout Pro",
  description: "View your EuroScout Pro account profile."
};

export default async function AccountPage() {
  const { supabase, profile } = await requireOnboardedProfile();
  const roleProfile = await getRoleProfile(supabase, profile);
  const playerProfileId = profile.role === "player" && roleProfile && "id" in roleProfile ? String(roleProfile.id) : "";
  const { data: filmLinks } = playerProfileId
    ? await supabase.from("film_links").select("id, url, provider, film_type, label, is_default").eq("player_profile_id", playerProfileId).returns<FilmLink[]>()
    : { data: [] as FilmLink[] };

  return (
    <main className="app-surface">
      <section className="mx-auto max-w-6xl px-4 py-12 sm:px-6 lg:px-8">
        <ProfileSummary profile={profile} roleProfile={roleProfile} showEditLink filmLinks={filmLinks ?? []} />
      </section>
    </main>
  );
}
