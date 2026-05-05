import Link from "next/link";
import type { Metadata } from "next";
import { requireOnboardedProfile, roleLabel, type Profile } from "@/lib/auth";

export const metadata: Metadata = {
  title: "Profiles | EuroScout Pro",
  description: "Browse EuroScout Pro players, scouts, coaches and team admins."
};

export default async function ProfilesPage() {
  const { supabase, profile } = await requireOnboardedProfile();
  const { data: profiles, error } = await supabase.from("profiles").select("*").eq("is_public", true).order("updated_at", { ascending: false }).returns<Profile[]>();

  return (
    <main className="app-surface">
      <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <p className="text-sm font-black uppercase tracking-[0.24em] text-red-600">Network</p>
        <h1 className="mt-3 text-4xl font-black tracking-tight text-slate-950 dark:text-white">Browse profiles.</h1>
        {error ? <p className="mt-6 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-bold text-red-700">{error.message}</p> : null}
        <div className="mt-8 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {(profiles ?? []).map((item) => (
            <Link key={item.id} href={`/profiles/${item.id}`} className="rounded-3xl glass-card p-5 transition hover:border-red-200 hover:shadow-md dark:hover:border-red-400/40">
              <p className="text-xs font-black uppercase tracking-[0.2em] text-red-600">{roleLabel(item.role)}</p>
              <h2 className="mt-3 text-2xl font-black text-slate-950 dark:text-white">{item.display_name}</h2>
              <p className="mt-2 line-clamp-2 text-sm leading-6 text-slate-600 dark:text-slate-300">{item.headline ?? item.location ?? "EuroScout Pro member"}</p>
              {item.id === profile.id ? <span className="mt-4 inline-flex rounded-full bg-red-50 px-3 py-1 text-xs font-black uppercase tracking-wide text-red-700 dark:bg-red-500/15 dark:text-red-200">You</span> : null}
            </Link>
          ))}
        </div>
        {!profiles?.length && !error ? <p className="mt-8 rounded-3xl border border-slate-200 dark:border-white/10 bg-white/80 p-6 dark:bg-white/10 text-sm font-bold text-slate-600 dark:text-slate-300">No public profiles are available yet.</p> : null}
      </section>
    </main>
  );
}
