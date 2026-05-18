"use client";

import { useTransition, useState } from "react";
import type { ReactNode } from "react";
import { teams, regions } from "@/lib/data";
import { countries } from "@/constants/countries";
import { cn } from "@/lib/utils";
import type { UserRole } from "@/lib/auth";

// ─── Constants ────────────────────────────────────────────────────────────────

const POSITIONS = [
  { code: "ATH", label: "Versatile Athlete" },
  { code: "QB",  label: "Quarterback" },
  { code: "RB",  label: "Running Back" },
  { code: "WR",  label: "Wide Receiver" },
  { code: "TE",  label: "Tight End" },
  { code: "OT",  label: "Offensive Tackle" },
  { code: "OG",  label: "Offensive Guard" },
  { code: "C",   label: "Center" },
  { code: "DE",  label: "Defensive End" },
  { code: "DT",  label: "Defensive Tackle" },
  { code: "MLB", label: "Middle Linebacker" },
  { code: "OLB", label: "Outside Linebacker" },
  { code: "CB",  label: "Cornerback" },
  { code: "S",   label: "Safety" },
  { code: "K",   label: "Kicker" },
  { code: "P",   label: "Punter" },
  { code: "LS",  label: "Long Snapper" },
] as const;

const POSITION_GROUPS = [
  { label: "Offense",       codes: ["QB","RB","WR","TE","OT","OG","C"] },
  { label: "Defense",       codes: ["DE","DT","MLB","OLB","CB","S"] },
  { label: "Special Teams", codes: ["K","P","LS"] },
  { label: "Versatile",     codes: ["ATH"] },
] as const;

const PIPELINES = [
  { value: "pro",       label: "Pro" },
  { value: "semi_pro",  label: "Semi-pro" },
  { value: "clubs",     label: "Clubs" },
  { value: "na_import", label: "North America import" },
] as const;

const LANGUAGES = [
  "English","German","French","Spanish","Italian",
  "Dutch","Polish","Portuguese","Swedish","Danish",
  "Norwegian","Finnish","Czech","Hungarian","Romanian","Turkish",
] as const;

const ROLE_CONFIG: Record<string, { label: string; description: string; icon: string; hasRoleStep: boolean }> = {
  player:     { label: "Player",     description: "I play American football in Europe",   icon: "🏈", hasRoleStep: true },
  scout:      { label: "Scout",      description: "I scout and evaluate players",         icon: "🔍", hasRoleStep: true },
  coach:      { label: "Coach",      description: "I coach a team or program",            icon: "📋", hasRoleStep: true },
  team_admin: { label: "Team Admin", description: "I manage a club or organisation",      icon: "🏟", hasRoleStep: true },
  analyst:    { label: "Analyst",    description: "I analyse film and performance",       icon: "📊", hasRoleStep: true },
  journalist: { label: "Journalist", description: "I cover European football",            icon: "✍️", hasRoleStep: true },
  fan:        { label: "Fan",        description: "I follow the sport",                   icon: "👀", hasRoleStep: false },
  admin:      { label: "Admin",      description: "EuroScout platform admin",             icon: "⚙️", hasRoleStep: false },
};

const PUBLIC_ROLES: UserRole[] = ["player","scout","coach","team_admin","analyst","journalist","fan"];

// ─── Utils ────────────────────────────────────────────────────────────────────

function feetInchesToCm(ft: number, inches: number): number {
  if (!ft && !inches) return 0;
  return Math.round(ft * 30.48 + inches * 2.54);
}

function calcAge(dob: string): number | null {
  if (!dob) return null;
  return Math.floor((Date.now() - new Date(dob).getTime()) / (1000 * 60 * 60 * 24 * 365.25));
}

function isRedirectError(err: unknown): boolean {
  return (
    typeof err === "object" && err !== null && "digest" in err &&
    typeof (err as { digest: unknown }).digest === "string" &&
    (err as { digest: string }).digest.startsWith("NEXT_REDIRECT")
  );
}

// ─── Shared UI primitives ─────────────────────────────────────────────────────

const inputClass =
  "h-12 w-full rounded-2xl border border-slate-200 bg-white/85 px-4 text-sm font-semibold text-slate-900 outline-none backdrop-blur-xl transition focus:border-red-400 focus:ring-4 focus:ring-red-100 dark:border-white/10 dark:bg-white/10 dark:text-white dark:placeholder:text-slate-500 dark:focus:ring-red-500/20";

const selectClass =
  "h-12 w-full rounded-2xl border border-slate-200 bg-white/85 px-4 text-sm font-semibold text-slate-900 outline-none backdrop-blur-xl transition focus:border-red-400 focus:ring-4 focus:ring-red-100 dark:border-white/10 dark:bg-white/10 dark:text-white dark:focus:ring-red-500/20";

const textareaClass =
  "min-h-24 w-full rounded-2xl border border-slate-200 bg-white/85 px-4 py-3 text-sm font-semibold text-slate-900 outline-none backdrop-blur-xl transition focus:border-red-400 focus:ring-4 focus:ring-red-100 dark:border-white/10 dark:bg-white/10 dark:text-white dark:placeholder:text-slate-500 dark:focus:ring-red-500/20";

function FieldLabel({ required, children }: { required?: boolean; children: ReactNode }) {
  return (
    <span className="mb-1.5 block text-xs font-black uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
      {children}{required && <span className="ml-1 text-red-500">*</span>}
    </span>
  );
}

function SectionHeading({ children }: { children: ReactNode }) {
  return (
    <p className="mb-3 text-[11px] font-black uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500">
      {children}
    </p>
  );
}

function CheckIcon() {
  return (
    <svg viewBox="0 0 12 12" fill="none" className="h-2.5 w-2.5 text-white">
      <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function CheckboxCard({ label, checked, onToggle }: { label: string; checked: boolean; onToggle: () => void }) {
  return (
    <label className={cn(
      "flex cursor-pointer select-none items-center gap-2.5 rounded-xl border px-3 py-2.5 text-sm font-semibold transition",
      checked
        ? "border-red-200 bg-red-50 text-red-700 dark:border-red-500/40 dark:bg-red-500/15 dark:text-red-300"
        : "border-slate-200 bg-white/70 text-slate-700 hover:border-slate-300 dark:border-white/10 dark:bg-white/5 dark:text-slate-300 dark:hover:border-white/20"
    )}>
      <span className={cn(
        "flex h-4 w-4 shrink-0 items-center justify-center rounded border-2 transition",
        checked ? "border-red-600 bg-red-600" : "border-slate-300 dark:border-white/30"
      )}>
        {checked && <CheckIcon />}
      </span>
      <input type="checkbox" checked={checked} onChange={onToggle} className="sr-only" />
      {label}
    </label>
  );
}

function ToggleChip({ label, selected, onToggle }: { label: string; selected: boolean; onToggle: () => void }) {
  return (
    <button type="button" onClick={onToggle} className={cn(
      "rounded-xl border px-3 py-1.5 text-xs font-bold transition",
      selected
        ? "border-red-300 bg-red-50 text-red-700 dark:border-red-500/50 dark:bg-red-500/20 dark:text-red-300"
        : "border-slate-200 bg-white/70 text-slate-600 hover:border-red-200 dark:border-white/10 dark:bg-white/5 dark:text-slate-400 dark:hover:border-red-500/30"
    )}>
      {label}
    </button>
  );
}

// ─── Desktop step sidebar ─────────────────────────────────────────────────────

interface StepMeta { label: string; description: string }

function StepSidebar({ steps, currentStep }: { steps: StepMeta[]; currentStep: number }) {
  return (
    <nav aria-label="Onboarding progress">
      <ol>
        {steps.map((s, idx) => {
          const num = idx + 1;
          const done = num < currentStep;
          const active = num === currentStep;
          return (
            <li key={num} className="flex gap-3">
              <div className="flex flex-col items-center">
                <div className={cn(
                  "flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-black transition-all",
                  done   && "bg-red-600 text-white shadow-sm shadow-red-600/30",
                  active && "border-2 border-red-600 bg-white text-red-600 dark:bg-slate-950",
                  !done && !active && "border-2 border-slate-200 bg-white text-slate-400 dark:border-white/15 dark:bg-slate-950 dark:text-slate-500"
                )}>
                  {done ? (
                    <svg viewBox="0 0 12 12" fill="none" className="h-3 w-3">
                      <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  ) : num}
                </div>
                {idx < steps.length - 1 && (
                  <div
                    className={cn("my-1.5 w-px flex-1", done ? "bg-red-300 dark:bg-red-600/50" : "bg-slate-200 dark:bg-white/10")}
                    style={{ minHeight: "2rem" }}
                  />
                )}
              </div>
              <div className="pb-7 pt-0.5">
                <p className={cn(
                  "text-sm font-bold leading-tight",
                  active ? "text-red-600 dark:text-red-400" : done ? "text-slate-800 dark:text-slate-200" : "text-slate-400 dark:text-slate-500"
                )}>
                  {s.label}
                </p>
                {active && <p className="mt-0.5 text-xs leading-relaxed text-slate-500 dark:text-slate-400">{s.description}</p>}
              </div>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

// ─── Mobile progress bar ──────────────────────────────────────────────────────

function ProgressBar({ step, total }: { step: number; total: number }) {
  return (
    <div className="space-y-2">
      <div className="flex justify-between text-xs font-bold">
        <span className="text-slate-400 dark:text-slate-500">Step {step} of {total}</span>
        <span className="text-red-600">{Math.round((step / total) * 100)}%</span>
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-white/10">
        <div
          className="h-full rounded-full bg-red-600 transition-all duration-500 ease-out"
          style={{ width: `${(step / total) * 100}%` }}
        />
      </div>
    </div>
  );
}

// ─── Step 1: Role selection ───────────────────────────────────────────────────

function RoleStep({ value, onChange, allowAdmin }: { value: UserRole; onChange: (r: UserRole) => void; allowAdmin: boolean }) {
  const visibleRoles: UserRole[] = allowAdmin ? [...PUBLIC_ROLES, "admin"] : PUBLIC_ROLES;
  return (
    <div>
      <div className="mb-6">
        <h2 className="text-xl font-black tracking-tight text-slate-950 dark:text-white">Who are you?</h2>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Pick the role that best describes you. You can change this later.</p>
      </div>
      <div className="grid gap-2 sm:grid-cols-2">
        {visibleRoles.map((r) => {
          const config = ROLE_CONFIG[r];
          const selected = value === r;
          return (
            <button key={r} type="button" onClick={() => onChange(r)} className={cn(
              "flex items-center gap-4 rounded-2xl border p-4 text-left transition",
              selected
                ? "border-red-300 bg-red-50 dark:border-red-500/50 dark:bg-red-500/15"
                : "border-slate-200 bg-white/80 hover:border-red-200 hover:bg-red-50/50 dark:border-white/10 dark:bg-white/5 dark:hover:border-red-500/30 dark:hover:bg-red-500/10"
            )}>
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-xl dark:bg-white/10">
                {config.icon}
              </span>
              <span className="min-w-0 flex-1">
                <span className={cn("block text-sm font-black", selected ? "text-red-700 dark:text-red-300" : "text-slate-950 dark:text-white")}>
                  {config.label}
                </span>
                <span className="block text-xs text-slate-500 dark:text-slate-400">{config.description}</span>
              </span>
              {selected && (
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-red-600 text-white">
                  <svg viewBox="0 0 12 12" fill="none" className="h-3 w-3">
                    <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ─── Step 2: Identity ─────────────────────────────────────────────────────────

function IdentityStep({
  displayName, setDisplayName, location, setLocation, headline, setHeadline,
}: {
  displayName: string; setDisplayName: (v: string) => void;
  location: string;    setLocation:    (v: string) => void;
  headline: string;    setHeadline:    (v: string) => void;
}) {
  return (
    <div>
      <div className="mb-6">
        <h2 className="text-xl font-black tracking-tight text-slate-950 dark:text-white">Your identity</h2>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">How other users find and recognise you on the platform.</p>
      </div>
      <div className="space-y-4">
        <label className="block">
          <FieldLabel required>Display name</FieldLabel>
          <input value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder="e.g. Marcus Webb" className={inputClass} />
        </label>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block">
            <FieldLabel>Current location</FieldLabel>
            <input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="e.g. Munich, Germany" className={inputClass} />
          </label>
          <label className="block">
            <FieldLabel>One-line headline</FieldLabel>
            <input value={headline} onChange={(e) => setHeadline(e.target.value)} placeholder="QB · GFL · Open to offers" className={inputClass} />
          </label>
        </div>
      </div>
    </div>
  );
}

// ─── Step 3a: Player ──────────────────────────────────────────────────────────

function YesNoToggle({ value, onChange }: { value: boolean | null; onChange: (v: boolean) => void }) {
  return (
    <div className="flex gap-2">
      {([{ v: true, label: "Yes" }, { v: false, label: "No" }] as const).map(({ v, label }) => (
        <button key={label} type="button" onClick={() => onChange(v)} className={cn(
          "h-10 rounded-xl border px-5 text-sm font-bold transition",
          value === v
            ? "border-red-300 bg-red-50 text-red-700 dark:border-red-500/50 dark:bg-red-500/20 dark:text-red-300"
            : "border-slate-200 bg-white/80 text-slate-600 hover:border-red-200 dark:border-white/10 dark:bg-white/5 dark:text-slate-300"
        )}>
          {label}
        </button>
      ))}
    </div>
  );
}

function PlayerStep(props: {
  firstName: string; setFirstName: (v: string) => void;
  lastName:  string; setLastName:  (v: string) => void;
  dob:       string; setDob:       (v: string) => void;
  nationality: string; setNationality: (v: string) => void;
  languages: string[]; toggleLanguage: (l: string) => void;
  passportReady: boolean | null; setPassportReady: (v: boolean) => void;
  position:      string; setPosition:      (v: string) => void;
  heightFt:      string; setHeightFt:      (v: string) => void;
  heightIn:      string; setHeightIn:      (v: string) => void;
  weightKg:      string; setWeightKg:      (v: string) => void;
  currentTeamId: string; setCurrentTeamId: (v: string) => void;
  pipelineType:  string; setPipelineType:  (v: string) => void;
  availableForTransfer: boolean; setAvailableForTransfer: (v: boolean) => void;
}) {
  const heightCm = feetInchesToCm(Number(props.heightFt) || 0, Number(props.heightIn) || 0);
  const age = calcAge(props.dob);

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-xl font-black tracking-tight text-slate-950 dark:text-white">Player details</h2>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Help scouts and clubs find the right fit for you.</p>
      </div>

      {/* Personal */}
      <div>
        <SectionHeading>Personal information</SectionHeading>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block">
            <FieldLabel>First name</FieldLabel>
            <input value={props.firstName} onChange={(e) => props.setFirstName(e.target.value)} placeholder="First name" className={inputClass} />
          </label>
          <label className="block">
            <FieldLabel>Last name</FieldLabel>
            <input value={props.lastName} onChange={(e) => props.setLastName(e.target.value)} placeholder="Last name" className={inputClass} />
          </label>
          <label className="block">
            <FieldLabel>Date of birth</FieldLabel>
            <input
              type="date" value={props.dob} onChange={(e) => props.setDob(e.target.value)}
              max={new Date(Date.now() - 14 * 365.25 * 24 * 60 * 60 * 1000).toISOString().split("T")[0]}
              className={inputClass}
            />
            {age !== null && <span className="mt-1 block text-xs text-slate-400">{age} years old</span>}
          </label>
          <label className="block">
            <FieldLabel>Nationality</FieldLabel>
            <select value={props.nationality} onChange={(e) => props.setNationality(e.target.value)} className={selectClass}>
              <option value="">Select nationality</option>
              {countries.map((c) => <option key={c.code} value={c.name}>{c.name}</option>)}
              <option value="American">American</option>
              <option value="Canadian">Canadian</option>
              <option value="Other">Other</option>
            </select>
          </label>
        </div>

        <div className="mt-4">
          <FieldLabel>Languages spoken</FieldLabel>
          <div className="mt-1 grid grid-cols-2 gap-1.5 sm:grid-cols-3">
            {LANGUAGES.map((lang) => (
              <CheckboxCard key={lang} label={lang} checked={props.languages.includes(lang)} onToggle={() => props.toggleLanguage(lang)} />
            ))}
          </div>
        </div>

        <div className="mt-4">
          <FieldLabel>Passport ready?</FieldLabel>
          <div className="mt-1">
            <YesNoToggle value={props.passportReady} onChange={props.setPassportReady} />
          </div>
        </div>
      </div>

      {/* Football */}
      <div>
        <SectionHeading>Football profile</SectionHeading>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block">
            <FieldLabel>Primary position</FieldLabel>
            <select value={props.position} onChange={(e) => props.setPosition(e.target.value)} className={selectClass}>
              <option value="">Select position</option>
              {POSITIONS.map((p) => <option key={p.code} value={p.code}>{p.code} – {p.label}</option>)}
            </select>
          </label>
          <label className="block">
            <FieldLabel>Pipeline level</FieldLabel>
            <select value={props.pipelineType} onChange={(e) => props.setPipelineType(e.target.value)} className={selectClass}>
              <option value="">Select level</option>
              {PIPELINES.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
            </select>
          </label>

          {/* Height ft/in → cm */}
          <div>
            <FieldLabel>Height</FieldLabel>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <input
                  type="number" min="4" max="8" placeholder="6"
                  value={props.heightFt} onChange={(e) => props.setHeightFt(e.target.value)}
                  className={inputClass + " pr-9"}
                />
                <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">ft</span>
              </div>
              <div className="relative flex-1">
                <input
                  type="number" min="0" max="11" placeholder="2"
                  value={props.heightIn} onChange={(e) => props.setHeightIn(e.target.value)}
                  className={inputClass + " pr-9"}
                />
                <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">in</span>
              </div>
            </div>
            {heightCm > 0 && <span className="mt-1 block text-xs text-slate-400">{heightCm} cm</span>}
          </div>

          {/* Weight */}
          <div>
            <FieldLabel>Weight</FieldLabel>
            <div className="relative">
              <input
                type="number" placeholder="95"
                value={props.weightKg} onChange={(e) => props.setWeightKg(e.target.value)}
                className={inputClass + " pr-9"}
              />
              <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">kg</span>
            </div>
            {props.weightKg && !isNaN(Number(props.weightKg)) && Number(props.weightKg) > 0 && (
              <span className="mt-1 block text-xs text-slate-400">{Math.round(Number(props.weightKg) * 2.205)} lbs</span>
            )}
          </div>

          <label className="block sm:col-span-2">
            <FieldLabel>Current team</FieldLabel>
            <select value={props.currentTeamId} onChange={(e) => props.setCurrentTeamId(e.target.value)} className={selectClass}>
              <option value="">No current team / unattached</option>
              {teams.map((t) => <option key={t.id} value={t.id}>{t.name} ({t.country})</option>)}
            </select>
          </label>
        </div>

        <label className="mt-4 flex cursor-pointer items-center gap-3 rounded-2xl border border-slate-200 bg-white/80 px-4 py-3.5 transition hover:border-red-200 dark:border-white/10 dark:bg-white/5 dark:hover:border-red-500/30">
          <span className={cn(
            "flex h-5 w-5 shrink-0 items-center justify-center rounded border-2 transition",
            props.availableForTransfer ? "border-red-600 bg-red-600" : "border-slate-300 dark:border-white/30"
          )}>
            {props.availableForTransfer && <CheckIcon />}
          </span>
          <input type="checkbox" checked={props.availableForTransfer} onChange={(e) => props.setAvailableForTransfer(e.target.checked)} className="sr-only" />
          <span>
            <span className="block text-sm font-bold text-slate-900 dark:text-white">Available for transfer</span>
            <span className="block text-xs text-slate-500 dark:text-slate-400">Open to new club offers for the upcoming season</span>
          </span>
        </label>
      </div>
    </div>
  );
}

// ─── Step 3b: Scout / Coach / Analyst / Journalist ────────────────────────────

function ScoutStep(props: {
  organization:     string; setOrganization:     (v: string) => void;
  contactEmail:     string; setContactEmail:     (v: string) => void;
  yearsExperience:  string; setYearsExperience:  (v: string) => void;
  focusRegions:    string[]; toggleFocusRegion:    (r: string) => void;
  focusPositions:  string[]; toggleFocusPosition:  (p: string) => void;
  role: UserRole;
}) {
  const titles:   Record<string, string> = { scout: "Scouting details", coach: "Coaching details", analyst: "Analyst details", journalist: "Media details" };
  const orgHints: Record<string, string> = { scout: "e.g. GFL Scouting Network", coach: "e.g. Berlin Rebels", analyst: "e.g. EFA Analytics", journalist: "e.g. European Football Weekly" };

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-xl font-black tracking-tight text-slate-950 dark:text-white">{titles[props.role] ?? "Your details"}</h2>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Help players and clubs understand your background.</p>
      </div>

      <div>
        <SectionHeading>Background</SectionHeading>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block sm:col-span-2">
            <FieldLabel>Organisation</FieldLabel>
            <input value={props.organization} onChange={(e) => props.setOrganization(e.target.value)} placeholder={orgHints[props.role] ?? "Organisation"} className={inputClass} />
          </label>
          <label className="block">
            <FieldLabel>Contact email</FieldLabel>
            <input type="email" value={props.contactEmail} onChange={(e) => props.setContactEmail(e.target.value)} placeholder="contact@example.com" className={inputClass} />
          </label>
          <label className="block">
            <FieldLabel>Years of experience</FieldLabel>
            <input type="number" min="0" value={props.yearsExperience} onChange={(e) => props.setYearsExperience(e.target.value)} placeholder="e.g. 5" className={inputClass} />
          </label>
        </div>
      </div>

      <div>
        <SectionHeading>Focus regions</SectionHeading>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {regions.map((r) => (
            <CheckboxCard key={r.id} label={r.name} checked={props.focusRegions.includes(r.name)} onToggle={() => props.toggleFocusRegion(r.name)} />
          ))}
        </div>
      </div>

      <div>
        <SectionHeading>Focus positions</SectionHeading>
        <div className="space-y-4">
          {POSITION_GROUPS.map((group) => (
            <div key={group.label}>
              <p className="mb-2 text-xs font-bold text-slate-400 dark:text-slate-500">{group.label}</p>
              <div className="flex flex-wrap gap-2">
                {group.codes.map((code) => {
                  const pos = POSITIONS.find((p) => p.code === code);
                  return (
                    <ToggleChip
                      key={code}
                      label={`${code}${pos ? ` · ${pos.label}` : ""}`}
                      selected={props.focusPositions.includes(code)}
                      onToggle={() => props.toggleFocusPosition(code)}
                    />
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Step 3c: Team admin ──────────────────────────────────────────────────────

function TeamAdminStep(props: {
  teamId:           string; setTeamId:           (v: string) => void;
  organizationName: string; setOrganizationName: (v: string) => void;
  title:            string; setTitle:            (v: string) => void;
  recruitingNeeds:  string; setRecruitingNeeds:  (v: string) => void;
  contactEmail:     string; setContactEmail:     (v: string) => void;
}) {
  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-xl font-black tracking-tight text-slate-950 dark:text-white">Club details</h2>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Help players and scouts understand your club's needs.</p>
      </div>
      <div>
        <SectionHeading>Club & role</SectionHeading>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block sm:col-span-2">
            <FieldLabel>Your club</FieldLabel>
            <select value={props.teamId} onChange={(e) => props.setTeamId(e.target.value)} className={selectClass}>
              <option value="">Select club</option>
              {teams.map((t) => <option key={t.id} value={t.id}>{t.name} ({t.country})</option>)}
            </select>
          </label>
          <label className="block">
            <FieldLabel>Organisation name</FieldLabel>
            <input value={props.organizationName} onChange={(e) => props.setOrganizationName(e.target.value)} placeholder="e.g. Berlin Rebels e.V." className={inputClass} />
          </label>
          <label className="block">
            <FieldLabel>Your title</FieldLabel>
            <input value={props.title} onChange={(e) => props.setTitle(e.target.value)} placeholder="e.g. General Manager" className={inputClass} />
          </label>
          <label className="block sm:col-span-2">
            <FieldLabel>Contact email</FieldLabel>
            <input type="email" value={props.contactEmail} onChange={(e) => props.setContactEmail(e.target.value)} placeholder="recruiting@yourclub.de" className={inputClass} />
          </label>
          <label className="block sm:col-span-2">
            <FieldLabel>Current recruiting needs</FieldLabel>
            <textarea
              value={props.recruitingNeeds} onChange={(e) => props.setRecruitingNeeds(e.target.value)}
              placeholder="e.g. Looking for a starting QB and 2 experienced O-linemen for the 2026 season…"
              className={textareaClass}
            />
          </label>
        </div>
      </div>
    </div>
  );
}

// ─── Final step: All set ──────────────────────────────────────────────────────

function ConfirmStep({ role, displayName, subtitle, isPublic, setIsPublic }: {
  role: UserRole; displayName: string; subtitle: string;
  isPublic: boolean; setIsPublic: (v: boolean) => void;
}) {
  const config = ROLE_CONFIG[role];
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-black tracking-tight text-slate-950 dark:text-white">You're almost in.</h2>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Review your summary and choose your visibility setting.</p>
      </div>
      <div className="rounded-2xl border border-slate-200 bg-white/80 p-5 dark:border-white/10 dark:bg-white/5">
        <div className="flex items-center gap-4">
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-red-50 text-2xl dark:bg-red-500/15">
            {config.icon}
          </span>
          <div>
            <p className="text-base font-black text-slate-950 dark:text-white">{displayName || <span className="italic text-slate-400">No name set</span>}</p>
            <p className="text-sm text-slate-500 dark:text-slate-400">{config.label}{subtitle ? ` · ${subtitle}` : ""}</p>
          </div>
        </div>
      </div>
      <label className="flex cursor-pointer items-start gap-4 rounded-2xl border border-slate-200 bg-white/80 p-4 transition hover:border-red-200 dark:border-white/10 dark:bg-white/5 dark:hover:border-red-500/30">
        <span className={cn(
          "mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded border-2 transition",
          isPublic ? "border-red-600 bg-red-600" : "border-slate-300 dark:border-white/30"
        )}>
          {isPublic && <CheckIcon />}
        </span>
        <input type="checkbox" checked={isPublic} onChange={(e) => setIsPublic(e.target.checked)} className="sr-only" />
        <span>
          <span className="block text-sm font-black text-slate-950 dark:text-white">Make my profile public</span>
          <span className="block text-xs text-slate-500 dark:text-slate-400">Other users can find and message you. Change this any time in account settings.</span>
        </span>
      </label>
    </div>
  );
}

// ─── Main wizard ──────────────────────────────────────────────────────────────

interface OnboardingWizardProps {
  action: (formData: FormData) => Promise<void>;
  allowAdminRole?: boolean;
  error?: string | null;
}

export default function OnboardingWizard({ action, allowAdminRole = false, error }: OnboardingWizardProps) {
  const [isPending, startTransition] = useTransition();
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [step, setStep] = useState(1);

  // Step 1
  const [role, setRole] = useState<UserRole>("player");

  // Step 2 – identity
  const [displayName, setDisplayName] = useState("");
  const [location, setLocation]       = useState("");
  const [headline, setHeadline]       = useState("");

  // Step 3 – player
  const [firstName,            setFirstName]            = useState("");
  const [lastName,             setLastName]             = useState("");
  const [dob,                  setDob]                  = useState("");
  const [nationality,          setNationality]          = useState("");
  const [languages,            setLanguages]            = useState<string[]>([]);
  const [passportReady,        setPassportReady]        = useState<boolean | null>(null);
  const [position,             setPosition]             = useState("");
  const [heightFt,             setHeightFt]             = useState("");
  const [heightIn,             setHeightIn]             = useState("");
  const [weightKg,             setWeightKg]             = useState("");
  const [currentTeamId,        setCurrentTeamId]        = useState("");
  const [pipelineType,         setPipelineType]         = useState("");
  const [availableForTransfer, setAvailableForTransfer] = useState(false);

  // Step 3 – scout / coach / analyst / journalist
  const [organization,    setOrganization]    = useState("");
  const [contactEmail,    setContactEmail]    = useState("");
  const [focusRegions,    setFocusRegions]    = useState<string[]>([]);
  const [focusPositions,  setFocusPositions]  = useState<string[]>([]);
  const [yearsExperience, setYearsExperience] = useState("");

  // Step 3 – team admin
  const [teamId,           setTeamId]           = useState("");
  const [organizationName, setOrganizationName] = useState("");
  const [adminTitle,       setAdminTitle]       = useState("");
  const [recruitingNeeds,  setRecruitingNeeds]  = useState("");

  // Final
  const [isPublic, setIsPublic] = useState(true);

  // Toggles
  const toggleLanguage      = (l: string) => setLanguages((p)      => p.includes(l) ? p.filter((x) => x !== l) : [...p, l]);
  const toggleFocusRegion   = (r: string) => setFocusRegions((p)   => p.includes(r) ? p.filter((x) => x !== r) : [...p, r]);
  const toggleFocusPosition = (pos: string) => setFocusPositions((p) => p.includes(pos) ? p.filter((x) => x !== pos) : [...p, pos]);

  // Derived
  const hasRoleStep    = ROLE_CONFIG[role]?.hasRoleStep ?? false;
  const totalSteps     = hasRoleStep ? 4 : 3;
  const roleStepNum    = hasRoleStep ? 3 : null;
  const confirmStepNum = hasRoleStep ? 4 : 3;

  const roleStepLabels: Record<string, string>       = { player: "Player details", scout: "Scouting details", coach: "Coaching details", team_admin: "Club details", analyst: "Analyst details", journalist: "Media details" };
  const roleStepDescriptions: Record<string, string> = { player: "Position, stats & availability", scout: "Organisation & focus areas", coach: "Organisation & focus areas", team_admin: "Club & recruiting needs", analyst: "Organisation & focus areas", journalist: "Publication & focus areas" };

  const stepConfig: StepMeta[] = [
    { label: "Your role", description: "How you use EuroScout" },
    { label: "Identity",  description: "Name and presence" },
    ...(hasRoleStep ? [{ label: roleStepLabels[role] ?? "Your details", description: roleStepDescriptions[role] ?? "" }] : []),
    { label: "All set",   description: "Review and publish" },
  ];

  const canAdvance = step === 2 ? displayName.trim().length > 0 : true;

  const handleSubmit = () => {
    const heightCm = feetInchesToCm(Number(heightFt) || 0, Number(heightIn) || 0);
    const fd = new FormData();

    fd.append("role",         role);
    fd.append("display_name", displayName.trim());
    fd.append("location",     location.trim());
    fd.append("headline",     headline.trim());
    fd.append("is_public",    isPublic ? "on" : "");

    // Player
    fd.append("first_name",        firstName.trim());
    fd.append("last_name",         lastName.trim());
    fd.append("dob",               dob);
    fd.append("nationality",       nationality);
    fd.append("languages",         languages.join(","));
    fd.append("passport_ready",    passportReady === true ? "on" : "");
    fd.append("position",          position);
    fd.append("height_cm",         heightCm > 0 ? String(heightCm) : "");
    fd.append("weight_kg",         weightKg);
    fd.append("current_team_id",   currentTeamId);
    fd.append("pipeline_type",     pipelineType);
    if (availableForTransfer) fd.append("available_for_transfer", "on");

    // Scout / coach / analyst / journalist
    fd.append("organization",     organization.trim());
    fd.append("contact_email",    contactEmail.trim());
    fd.append("focus_regions",    focusRegions.join(","));
    fd.append("focus_positions",  focusPositions.join(","));
    fd.append("years_experience", yearsExperience);

    // Team admin
    fd.append("team_id",           teamId);
    fd.append("organization_name", organizationName.trim());
    fd.append("title",             adminTitle.trim());
    fd.append("recruiting_needs",  recruitingNeeds.trim());

    setSubmitError(null);
    startTransition(async () => {
      try {
        await action(fd);
      } catch (err) {
        if (isRedirectError(err)) throw err;
        setSubmitError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
      }
    });
  };

  // Confirm step subtitle
  const confirmSubtitle = role === "player"
    ? [position, pipelineType].filter(Boolean).join(" · ")
    : [organization, organizationName].filter(Boolean)[0] ?? "";

  const currentError = submitError ?? error;

  return (
    <div className="lg:grid lg:grid-cols-[200px_1fr]">
      {/* Desktop sidebar */}
      <aside className="hidden border-r border-slate-100 pr-8 dark:border-white/10 lg:block">
        <StepSidebar steps={stepConfig} currentStep={step} />
      </aside>

      {/* Main content */}
      <div className="min-w-0 lg:pl-10">
        {/* Mobile progress bar */}
        <div className="mb-8 lg:hidden">
          <ProgressBar step={step} total={totalSteps} />
        </div>

        {currentError && (
          <div className="mb-6 rounded-2xl border border-red-200 bg-red-50 p-3 text-sm font-bold text-red-700 dark:border-red-400/30 dark:bg-red-500/10 dark:text-red-300">
            {currentError}
          </div>
        )}

        {/* Step content */}
        <div>
          {step === 1 && <RoleStep value={role} onChange={setRole} allowAdmin={allowAdminRole} />}
          {step === 2 && (
            <IdentityStep
              displayName={displayName} setDisplayName={setDisplayName}
              location={location}       setLocation={setLocation}
              headline={headline}       setHeadline={setHeadline}
            />
          )}
          {step === roleStepNum && role === "player" && (
            <PlayerStep
              firstName={firstName}                       setFirstName={setFirstName}
              lastName={lastName}                         setLastName={setLastName}
              dob={dob}                                   setDob={setDob}
              nationality={nationality}                   setNationality={setNationality}
              languages={languages}                       toggleLanguage={toggleLanguage}
              passportReady={passportReady}               setPassportReady={setPassportReady}
              position={position}                         setPosition={setPosition}
              heightFt={heightFt}                         setHeightFt={setHeightFt}
              heightIn={heightIn}                         setHeightIn={setHeightIn}
              weightKg={weightKg}                         setWeightKg={setWeightKg}
              currentTeamId={currentTeamId}               setCurrentTeamId={setCurrentTeamId}
              pipelineType={pipelineType}                 setPipelineType={setPipelineType}
              availableForTransfer={availableForTransfer} setAvailableForTransfer={setAvailableForTransfer}
            />
          )}
          {step === roleStepNum && (role === "scout" || role === "coach" || role === "analyst" || role === "journalist") && (
            <ScoutStep
              organization={organization}       setOrganization={setOrganization}
              contactEmail={contactEmail}       setContactEmail={setContactEmail}
              yearsExperience={yearsExperience} setYearsExperience={setYearsExperience}
              focusRegions={focusRegions}       toggleFocusRegion={toggleFocusRegion}
              focusPositions={focusPositions}   toggleFocusPosition={toggleFocusPosition}
              role={role}
            />
          )}
          {step === roleStepNum && role === "team_admin" && (
            <TeamAdminStep
              teamId={teamId}                     setTeamId={setTeamId}
              organizationName={organizationName} setOrganizationName={setOrganizationName}
              title={adminTitle}                  setTitle={setAdminTitle}
              recruitingNeeds={recruitingNeeds}   setRecruitingNeeds={setRecruitingNeeds}
              contactEmail={contactEmail}         setContactEmail={setContactEmail}
            />
          )}
          {step === confirmStepNum && (
            <ConfirmStep
              role={role} displayName={displayName} subtitle={confirmSubtitle}
              isPublic={isPublic} setIsPublic={setIsPublic}
            />
          )}
        </div>

        {/* Navigation */}
        <div className="mt-10 flex items-center justify-between gap-3 border-t border-slate-100 pt-6 dark:border-white/10">
          {step > 1 ? (
            <button
              type="button" onClick={() => setStep((s) => Math.max(s - 1, 1))} disabled={isPending}
              className="inline-flex h-11 items-center rounded-2xl border border-slate-200 bg-white/80 px-5 text-sm font-bold text-slate-700 transition hover:border-red-200 hover:text-red-700 dark:border-white/10 dark:bg-white/5 dark:text-slate-300 dark:hover:border-red-500/30 dark:hover:text-red-300"
            >
              ← Back
            </button>
          ) : <span />}

          {step < totalSteps ? (
            <button
              type="button" onClick={() => { if (canAdvance) setStep((s) => Math.min(s + 1, totalSteps)); }}
              disabled={!canAdvance}
              className="inline-flex h-11 items-center rounded-2xl bg-red-600 px-6 text-sm font-black text-white shadow-sm transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Continue →
            </button>
          ) : (
            <button
              type="button" onClick={handleSubmit} disabled={isPending}
              className="inline-flex h-11 items-center rounded-2xl bg-red-600 px-6 text-sm font-black text-white shadow-sm transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isPending ? "Setting up your profile…" : "Complete onboarding"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

