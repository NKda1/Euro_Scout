import type { Metadata } from "next";
import { revalidatePath } from "next/cache";
import AdminPageHeader from "@/components/admin/AdminPageHeader";
import { requireAdminProfile } from "@/lib/auth";
import type { ClubDispute } from "@/types";

export const metadata: Metadata = {
  title: "Club Disputes | Admin | EuroScout Pro",
  description: "Review open club claim disputes and verification requests."
};

interface DisputeRow extends ClubDispute {
  profiles: { id: string; display_name: string } | null;
  teams: { id: string; name: string; claim_status: string | null } | null;
}

type DisputeStatus = "open" | "reviewed" | "dismissed" | "upheld";

async function resolveDisputeAction(formData: FormData) {
  "use server";
  const { supabase } = await requireAdminProfile();

  const id = formData.get("id") as string;
  const newStatus = formData.get("status") as DisputeStatus;
  const adminNotes = formData.get("admin_notes") as string | null;
  const teamId = formData.get("team_id") as string | null;

  await supabase
    .from("club_disputes")
    .update({
      status: newStatus,
      admin_notes: adminNotes || null,
      resolved_at: newStatus !== "open" ? new Date().toISOString() : null
    })
    .eq("id", id);

  if (newStatus === "upheld" && teamId) {
    await supabase.from("teams").update({ claim_status: "disputed" }).eq("id", teamId);
  }

  revalidatePath("/admin/disputes");
}

export default async function AdminDisputesPage() {
  const { supabase } = await requireAdminProfile();

  const { data: disputes, error } = await supabase
    .from("club_disputes")
    .select(
      `
        id,
        team_id,
        raised_by,
        reason,
        status,
        admin_notes,
        created_at,
        resolved_at,
        profiles!raised_by ( id, display_name ),
        teams!team_id ( id, name, claim_status )
      `
    )
    .order("created_at", { ascending: false })
    .returns<DisputeRow[]>();

  const open = disputes?.filter((d) => d.status === "open") ?? [];
  const resolved = disputes?.filter((d) => d.status !== "open") ?? [];

  return (
    <main className="app-surface">
      <section className="mx-auto max-w-7xl space-y-8 px-4 py-12 sm:px-6 lg:px-8">
        <AdminPageHeader
          eyebrow="Admin · Disputes"
          title="Club disputes."
          description="Review open club claim disputes and decide their outcome. Upholding marks the team as disputed."
        />

        {error && (
          <p className="rounded-3xl border border-red-200 bg-red-50 p-5 text-sm font-bold text-red-700">{error.message}</p>
        )}

        <section>
          <p className="mb-4 text-sm font-black uppercase tracking-[0.2em] text-red-600 dark:text-red-400">Open ({open.length})</p>
          {open.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-slate-300 bg-white/75 p-8 text-center backdrop-blur-xl dark:border-white/15 dark:bg-white/10">
              <p className="text-sm font-bold text-slate-600 dark:text-slate-300">No open disputes.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {open.map((d) => (
                <div key={d.id} className="rounded-3xl glass-card p-5">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-xs font-black uppercase tracking-[0.2em] text-amber-600 dark:text-amber-400">Open dispute</p>
                      <p className="mt-1 text-lg font-black text-slate-950 dark:text-white">{d.teams?.name ?? d.team_id}</p>
                      <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">
                        Raised by <span className="font-bold text-slate-800 dark:text-slate-200">{d.profiles?.display_name ?? d.raised_by}</span>
                        {" "}· {new Date(d.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-black uppercase text-amber-700 dark:bg-amber-500/15 dark:text-amber-300">
                      {d.teams?.claim_status ?? "—"}
                    </span>
                  </div>
                  <p className="mt-4 rounded-2xl border border-slate-200 bg-slate-50/80 px-4 py-3 text-sm text-slate-700 dark:border-white/10 dark:bg-white/5 dark:text-slate-300">
                    {d.reason}
                  </p>
                  <form action={resolveDisputeAction} className="mt-4 space-y-3">
                    <input type="hidden" name="id" value={d.id} />
                    <input type="hidden" name="team_id" value={d.team_id ?? ""} />
                    <textarea
                      name="admin_notes"
                      placeholder="Admin notes (optional)"
                      defaultValue={d.admin_notes ?? ""}
                      className="min-h-20 w-full rounded-2xl border border-slate-200 bg-white/85 px-4 py-3 text-sm font-semibold text-slate-900 outline-none backdrop-blur-xl transition focus:border-red-400 focus:ring-4 focus:ring-red-100 dark:border-white/10 dark:bg-white/10 dark:text-white dark:focus:ring-red-500/20"
                    />
                    <div className="flex flex-wrap gap-2">
                      <button name="status" value="reviewed" className="h-10 rounded-2xl border border-slate-200 bg-white/80 px-4 text-sm font-bold text-slate-700 transition hover:border-slate-300 dark:border-white/10 dark:bg-white/5 dark:text-slate-300">
                        Mark reviewed
                      </button>
                      <button name="status" value="dismissed" className="h-10 rounded-2xl border border-slate-200 bg-white/80 px-4 text-sm font-bold text-slate-600 transition hover:border-slate-300 dark:border-white/10 dark:bg-white/5 dark:text-slate-400">
                        Dismiss
                      </button>
                      <button name="status" value="upheld" className="h-10 rounded-2xl bg-red-600 px-4 text-sm font-black text-white shadow-sm transition hover:bg-red-700">
                        Uphold (dispute claim)
                      </button>
                    </div>
                  </form>
                </div>
              ))}
            </div>
          )}
        </section>

        {resolved.length > 0 && (
          <section>
            <p className="mb-4 text-sm font-black uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500">Resolved ({resolved.length})</p>
            <div className="space-y-3">
              {resolved.map((d) => (
                <div key={d.id} className="rounded-3xl glass-card p-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-black text-slate-950 dark:text-white">{d.teams?.name ?? d.team_id}</p>
                      <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                        {d.profiles?.display_name ?? d.raised_by} · {new Date(d.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    <span className={`rounded-full px-3 py-1 text-xs font-black uppercase ${d.status === "upheld" ? "bg-red-50 text-red-700 dark:bg-red-500/15 dark:text-red-300" : "bg-slate-100 text-slate-600 dark:bg-white/10 dark:text-slate-400"}`}>
                      {d.status}
                    </span>
                  </div>
                  {d.admin_notes && (
                    <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">{d.admin_notes}</p>
                  )}
                </div>
              ))}
            </div>
          </section>
        )}
      </section>
    </main>
  );
}
