import { teams } from "@/lib/data";
import { campusPipelines, campusTeams } from "@/lib/campus-to-pro";
import { publicUserRoles, roleLabel, userRoles, type Profile, type UserRole } from "@/lib/auth";

interface RoleProfileData {
  first_name?: string | null;
  last_name?: string | null;
  nationality?: string | null;
  position?: string | null;
  height_cm?: number | null;
  weight_kg?: number | null;
  current_team_id?: string | null;
  pipeline_type?: string | null;
  available_for_transfer?: boolean | null;
  photo_urls?: string[] | null;
}

interface ProfileFormProps {
  action: (formData: FormData) => Promise<void>;
  profile?: Profile | null;
  roleProfile?: RoleProfileData | null;
  submitLabel: string;
  allowAdminRole?: boolean;
}

const inputClass = "mt-2 h-12 w-full rounded-2xl border border-slate-200 bg-white/85 px-4 text-sm font-semibold text-slate-900 outline-none backdrop-blur-xl transition focus:border-red-400 focus:ring-4 focus:ring-red-100 dark:border-white/10 dark:bg-white/10 dark:text-white dark:placeholder:text-slate-500 dark:focus:ring-red-500/20";
const textareaClass = "mt-2 min-h-28 w-full rounded-2xl border border-slate-200 bg-white/85 px-4 py-3 text-sm font-semibold text-slate-900 outline-none backdrop-blur-xl transition focus:border-red-400 focus:ring-4 focus:ring-red-100 dark:border-white/10 dark:bg-white/10 dark:text-white dark:placeholder:text-slate-500 dark:focus:ring-red-500/20";
const labelClass = "text-xs font-black uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400";

export default function ProfileForm({ action, profile, roleProfile, submitLabel, allowAdminRole = false }: ProfileFormProps) {
  const selectedRole: UserRole = profile?.role ?? "player";
  const availableRoles = allowAdminRole || selectedRole === "admin" ? userRoles : publicUserRoles;

  return (
    <form action={action} className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2">
        <label className="block md:col-span-2">
          <span className={labelClass}>Role</span>
          <select name="role" defaultValue={selectedRole} className={inputClass}>
            {availableRoles.map((role) => (
              <option key={role} value={role}>
                {roleLabel(role)}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className={labelClass}>Display name</span>
          <input name="display_name" required defaultValue={profile?.display_name ?? ""} className={inputClass} />
        </label>
        <label className="block">
          <span className={labelClass}>Location</span>
          <input name="location" defaultValue={profile?.location ?? ""} className={inputClass} />
        </label>
        <label className="block md:col-span-2">
          <span className={labelClass}>Headline</span>
          <input name="headline" defaultValue={profile?.headline ?? ""} className={inputClass} />
        </label>
        <label className="block md:col-span-2">
          <span className={labelClass}>Bio</span>
          <textarea name="bio" defaultValue={profile?.bio ?? ""} className={textareaClass} />
        </label>
        <label className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white/80 px-4 py-3 text-sm font-bold text-slate-700 backdrop-blur-xl dark:border-white/10 dark:bg-white/10 dark:text-slate-200 md:col-span-2">
          <input name="is_public" type="checkbox" defaultChecked={profile?.is_public ?? true} className="h-4 w-4 rounded border-slate-300 text-red-600" />
          Public profile
        </label>
      </div>

      <div className="rounded-3xl border border-red-100 bg-red-50/40 p-5 dark:border-red-400/20 dark:bg-red-500/10">
        <p className="text-sm font-black uppercase tracking-[0.2em] text-red-600">Player fields</p>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <input name="first_name" placeholder="First name" defaultValue={roleProfile?.first_name ?? ""} className={inputClass} />
          <input name="last_name" placeholder="Last name" defaultValue={roleProfile?.last_name ?? ""} className={inputClass} />
          <input name="nationality" placeholder="Nationality" defaultValue={roleProfile?.nationality ?? ""} className={inputClass} />
          <input name="position" placeholder="Position" defaultValue={roleProfile?.position ?? ""} className={inputClass} />
          <input name="height_cm" type="number" step="0.01" placeholder="Height cm" defaultValue={roleProfile?.height_cm ?? ""} className={inputClass} />
          <input name="weight_kg" type="number" step="0.01" placeholder="Weight kg" defaultValue={roleProfile?.weight_kg ?? ""} className={inputClass} />
          <select name="current_team_id" defaultValue={roleProfile?.current_team_id ?? ""} className={inputClass}>
            <option value="">Current team</option>
            <optgroup label="Campus to Pro">
              {campusTeams.map((team) => (
                <option key={team.id} value={team.id}>
                  {team.name} · {campusPipelines[team.leagueId].label}
                </option>
              ))}
            </optgroup>
            <optgroup label="European clubs">
              {teams.map((team) => (
                <option key={team.id} value={team.id}>
                  {team.name}
                </option>
              ))}
            </optgroup>
          </select>
          <select name="pipeline_type" defaultValue={roleProfile?.pipeline_type ?? ""} className={inputClass}>
            <option value="">Pipeline</option>
            <option value="pro">Pro</option>
            <option value="semi_pro">Semi-pro</option>
            <option value="clubs">Clubs</option>
            <option value="na_import">North America import</option>
            <option value="usports">U Sports</option>
            <option value="cjfl">CJFL</option>
            <option value="bucs">BUCS</option>
          </select>
          <label className="flex items-center gap-3 rounded-2xl border border-red-100 bg-white/80 px-4 py-3 text-sm font-bold text-slate-700 backdrop-blur-xl dark:border-red-400/20 dark:bg-white/10 dark:text-slate-200 md:col-span-2">
            <input name="available_for_transfer" type="checkbox" defaultChecked={Boolean(roleProfile?.available_for_transfer)} className="h-4 w-4 rounded border-slate-300 text-red-600" />
            Available for transfer
          </label>
          <textarea name="photo_urls" placeholder="Profile photo URLs, one per line (max 4)" defaultValue={roleProfile?.photo_urls?.join("\n") ?? ""} className={`${textareaClass} md:col-span-2`} />
        </div>
      </div>

      <button className="h-12 rounded-2xl bg-red-600 px-6 text-sm font-black text-white shadow-sm transition hover:bg-red-700">{submitLabel}</button>
    </form>
  );
}
