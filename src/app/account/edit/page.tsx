import type { Metadata } from "next";
import { updateAccountAction } from "@/app/actions/profile";
import FilmLinksManager from "@/components/account/FilmLinksManager";
import ProfileForm from "@/components/account/ProfileForm";
import type { FilmLink } from "@/components/players/HudlFilmViewer";
import { isReservedAdminEmail, requireOnboardedProfile } from "@/lib/auth";
import { getRoleProfile } from "@/lib/profile-data";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Edit Account | EuroScout Pro",
  description: "Edit your EuroScout Pro profile."
};

interface EditAccountPageProps {
  searchParams: Promise<{
    error?: string;
  }>;
}

export default async function EditAccountPage({ searchParams }: EditAccountPageProps) {
  const { supabase, profile, user } = await requireOnboardedProfile();
  const roleProfile = await getRoleProfile(supabase, profile);
  const { error } = await searchParams;
  const serviceClient = createSupabaseServiceRoleClient();
  const playerProfileId = profile.role === "player" && roleProfile && "id" in roleProfile ? String(roleProfile.id) : "";
  const { data: filmLinks } = playerProfileId
    ? await serviceClient
        .from("film_links")
        .select("id, url, provider, film_type, label, is_default")
        .eq("player_profile_id", playerProfileId)
        .order("is_default", { ascending: false })
        .order("created_at", { ascending: false })
        .returns<FilmLink[]>()
    : { data: [] as FilmLink[] };

  return (
    <main className="app-surface">
      <section className="mx-auto max-w-5xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="rounded-3xl glass-card p-6 sm:p-8">
          <p className="text-sm font-black uppercase tracking-[0.24em] text-red-600">Account</p>
          <h1 className="mt-3 text-4xl font-black tracking-tight text-slate-950 dark:text-white">Edit your profile.</h1>
          {error ? <p className="mt-6 rounded-2xl border border-red-200 bg-red-50 p-3 text-sm font-bold text-red-700">{error}</p> : null}
          <div className="mt-8">
            <ProfileForm action={updateAccountAction} profile={profile} roleProfile={roleProfile} submitLabel="Save profile" allowAdminRole={isReservedAdminEmail(user.email)} />
            {profile.role === "player" ? (
              <div className="mt-6">
                <FilmLinksManager filmLinks={filmLinks ?? []} />
              </div>
            ) : null}
          </div>
        </div>
      </section>
    </main>
  );
}
