import type { Metadata } from "next";
import { notFound } from "next/navigation";
import ProfileSummary from "@/components/profiles/ProfileSummary";
import { requireOnboardedProfile, type Profile } from "@/lib/auth";
import { getRoleProfile } from "@/lib/profile-data";

interface ProfilePageProps {
  params: Promise<{
    profileId: string;
  }>;
}

export async function generateMetadata({ params }: ProfilePageProps): Promise<Metadata> {
  const { profileId } = await params;
  return {
    title: `Profile ${profileId} | EuroScout Pro`
  };
}

export default async function ProfilePage({ params }: ProfilePageProps) {
  const { profileId } = await params;
  const { supabase, profile: currentProfile } = await requireOnboardedProfile();
  const { data: profile } = await supabase.from("profiles").select("*").eq("id", profileId).maybeSingle<Profile>();

  if (!profile) {
    notFound();
  }

  const roleProfile = await getRoleProfile(supabase, profile);

  return (
    <main className="app-surface">
      <section className="mx-auto max-w-6xl px-4 py-12 sm:px-6 lg:px-8">
        <ProfileSummary
          profile={profile}
          roleProfile={roleProfile}
          showMessageButton={profile.role === "player" && currentProfile.role === "club" && profile.id !== currentProfile.id}
          showEditLink={profile.id === currentProfile.id}
        />
      </section>
    </main>
  );
}
