import type { Metadata } from "next";
import { notFound } from "next/navigation";
import ProfileSummary from "@/components/profiles/ProfileSummary";
import type { Profile } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";

interface ScoutPageProps {
  params: Promise<{
    scoutId: string;
  }>;
}

interface ScoutProfileRow {
  id: string;
  profile_id: string;
  organization: string | null;
  focus_regions: string[] | null;
  focus_positions: string[] | null;
  years_experience: number | null;
  contact_email: string | null;
  profiles: Profile;
}

export const metadata: Metadata = {
  title: "Scout Profile | EuroScout Pro"
};

export default async function ScoutPage({ params }: ScoutPageProps) {
  const { scoutId } = await params;
  const supabase = await createSupabaseServerClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();
  const { data: scout } = await supabase
    .from("scout_profiles")
    .select(
      `
        id,
        profile_id,
        organization,
        focus_regions,
        focus_positions,
        years_experience,
        contact_email,
        profiles!inner (
          id,
          role,
          display_name,
          headline,
          bio,
          location,
          avatar_url,
          is_public,
          onboarding_complete,
          created_at,
          updated_at
        )
      `
    )
    .eq("profile_id", scoutId)
    .eq("profiles.is_public", true)
    .maybeSingle<ScoutProfileRow>();

  if (!scout) {
    notFound();
  }

  return (
    <main className="app-surface">
      <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <ProfileSummary
          profile={scout.profiles}
          roleProfile={scout as unknown as Record<string, unknown>}
          backHref="/scouts"
          backLabel="Back to scouts"
          showEditLink={user?.id === scout.profile_id}
          showMessageButton={Boolean(user && user.id !== scout.profile_id)}
          showMessagesLink={Boolean(user)}
        />
      </section>
    </main>
  );
}
