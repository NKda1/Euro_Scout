import type { Metadata } from "next";
import { adminCreateClubAction } from "@/app/actions/admin";
import AdminClubsList, { type AdminClubRow } from "@/components/admin/AdminClubsList";
import AdminPageHeader from "@/components/admin/AdminPageHeader";
import { leagues } from "@/lib/data";
import { europeanCountries, regionForEuropeanCountry } from "@/lib/europe";
import { requireAdminProfile } from "@/lib/auth";

export const metadata: Metadata = {
  title: "Admin Clubs | EuroScout Pro",
  description: "Create, update and delete EuroScout Pro club directory records."
};

interface AdminClubsPageProps {
  searchParams: Promise<{
    error?: string;
    notice?: string;
  }>;
}

interface ClubMemberCountRow {
  team_id: string;
}

const inputClass = "h-11 w-full border border-slate-200 bg-white px-3 text-sm font-black text-slate-950 outline-none transition focus:border-red-500 dark:border-white/10 dark:bg-black/25 dark:text-white";
const labelClass = "mb-2 block text-[11px] font-black uppercase tracking-[0.14em] text-slate-500 dark:text-white/35";

function ClubFields({ club }: { club?: AdminClubRow }) {
  const derivedRegion = regionForEuropeanCountry(club?.country);

  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      {club ? <input type="hidden" name="team_id" value={club.id} /> : null}
      <label>
        <span className={labelClass}>Club name</span>
        <input name="name" required defaultValue={club?.name ?? ""} className={inputClass} />
      </label>
      <label>
        <span className={labelClass}>City</span>
        <input name="city" required defaultValue={club?.city ?? ""} className={inputClass} />
      </label>
      <label>
        <span className={labelClass}>Country / SVG region</span>
        <select name="country" required defaultValue={club?.country ?? ""} className={inputClass}>
          <option value="">Select country</option>
          {europeanCountries.map((country) => (
            <option key={country} value={country}>
              {country}
            </option>
          ))}
        </select>
      </label>
      <label>
        <span className={labelClass}>League</span>
        <select name="league_id" required defaultValue={club?.league_id ?? ""} className={inputClass}>
          <option value="">Select league</option>
          {leagues.map((league) => (
            <option key={league.id} value={league.id}>
              {league.name}
            </option>
          ))}
        </select>
      </label>
      <label>
        <span className={labelClass}>Division</span>
        <input name="division" defaultValue={club?.division ?? ""} className={inputClass} />
      </label>
      <label>
        <span className={labelClass}>Stadium</span>
        <input name="stadium" defaultValue={club?.stadium ?? ""} className={inputClass} />
      </label>
      <label>
        <span className={labelClass}>Tier</span>
        <select name="tier" defaultValue={club?.tier ?? ""} className={inputClass}>
          <option value="">Auto / market tier</option>
          <option value="1">Tier 1</option>
          <option value="2">Tier 2</option>
          <option value="3">Tier 3</option>
          <option value="4">Tier 4</option>
        </select>
      </label>
      <label>
        <span className={labelClass}>Status</span>
        <select name="claim_status" defaultValue={club?.claim_status ?? "unclaimed"} className={inputClass}>
          <option value="unclaimed">Unclaimed</option>
          <option value="pending">Pending</option>
          <option value="verified">Verified</option>
          <option value="disputed">Disputed</option>
          <option value="rejected">Rejected</option>
        </select>
      </label>
      <label>
        <span className={labelClass}>Website</span>
        <input name="website" type="url" defaultValue={club?.website ?? ""} className={inputClass} />
      </label>
      <label>
        <span className={labelClass}>Contact email</span>
        <input name="contact_email" type="email" defaultValue={club?.contact_email ?? ""} className={inputClass} />
      </label>
      <label>
        <span className={labelClass}>Open roster spots</span>
        <input name="open_roster_spots" type="number" min={0} max={99} defaultValue={club?.open_roster_spots ?? 0} className={inputClass} />
      </label>
      <label className="flex h-11 items-center gap-3 self-end border border-slate-200 bg-white px-3 text-sm font-black text-slate-700 dark:border-white/10 dark:bg-black/25 dark:text-slate-200">
        <input name="recruiting_active" type="checkbox" defaultChecked={Boolean(club?.recruiting_active)} className="h-4 w-4 accent-red-600" />
        Recruiting active
      </label>
      <label className="md:col-span-2 xl:col-span-4">
        <span className={labelClass}>Logo URL</span>
        <input name="logo_url" type="url" defaultValue={club?.logo_url ?? ""} className={inputClass} />
      </label>
      {club ? (
        <p className="text-xs font-bold text-slate-500 dark:text-white/40 md:col-span-2 xl:col-span-4">
          Current stored region: {club.region_id ?? "not set"}. Country maps to: {derivedRegion?.name ?? "outside Europe"}.
        </p>
      ) : null}
    </div>
  );
}

export default async function AdminClubsPage({ searchParams }: AdminClubsPageProps) {
  const { error, notice } = await searchParams;
  const { supabase } = await requireAdminProfile();
  const [{ data: clubs }, { data: memberRows }] = await Promise.all([
    supabase
      .from("teams")
      .select("id, name, slug, league_id, region_id, city, country, division, stadium, logo_url, tier, claim_status, verified, website, contact_email, open_roster_spots, recruiting_active, updated_at")
      .order("updated_at", { ascending: false })
      .returns<AdminClubRow[]>(),
    supabase.from("club_members").select("team_id").returns<ClubMemberCountRow[]>()
  ]);

  const memberCounts = new Map<string, number>();
  (memberRows ?? []).forEach((row) => memberCounts.set(row.team_id, (memberCounts.get(row.team_id) ?? 0) + 1));
  const memberCountsRecord = Object.fromEntries(memberCounts);

  return (
    <main className="app-surface">
      <section className="mx-auto max-w-[92rem] space-y-8 px-4 py-10 sm:px-6 lg:px-8">
        <AdminPageHeader
          eyebrow="Admin Clubs"
          title="Manage league directory clubs."
          description="Create, edit and delete club records that power club profiles, club directory and the home SVG market map."
        />

        {error ? <p className="border border-red-300 bg-red-50 p-4 text-sm font-black text-red-800 dark:border-red-500/40 dark:bg-red-500/10 dark:text-red-200">{error}</p> : null}
        {notice ? <p className="border border-emerald-300 bg-emerald-50 p-4 text-sm font-black text-emerald-800 dark:border-emerald-500/40 dark:bg-emerald-500/10 dark:text-emerald-200">{notice}</p> : null}

        <section className="border border-slate-200 bg-white p-5 dark:border-white/10 dark:bg-[#111]">
          <p className="text-sm font-black uppercase tracking-[0.16em] text-red-600 dark:text-red-300">Create Club</p>
          <p className="mt-2 text-sm font-semibold leading-6 text-slate-500 dark:text-white/45">
            Choose a supported European country so the club can appear in the SVG region explorer. Non-European clubs stay out of the home map by design.
          </p>
          <form action={adminCreateClubAction} className="mt-5 space-y-4">
            <ClubFields />
            <button className="h-11 bg-red-600 px-5 text-sm font-black uppercase text-white transition hover:bg-red-700">
              Create club
            </button>
          </form>
        </section>

        <AdminClubsList clubs={clubs ?? []} memberCounts={memberCountsRecord} />
      </section>
    </main>
  );
}
