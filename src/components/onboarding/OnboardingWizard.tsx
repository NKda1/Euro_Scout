"use client";

import { useTransition, useState, useMemo } from "react";
import type { ReactNode } from "react";
import CareerTimelineBuilder, { type CareerTimelineDraft } from "@/components/account/CareerTimelineBuilder";
import { leagues, regions, teams } from "@/lib/data";
import {
  campusPipelines,
  campusTeams,
  getCampusTeam,
  getCampusTeamsForPipeline,
  isCampusPipeline,
  isFrenchCanadianCampusTeam,
  type CampusPipeline
} from "@/lib/campus-to-pro";
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

const PIPELINES = [
  { value: "pro",       label: "Pro" },
  { value: "semi_pro",  label: "Semi-pro" },
  { value: "clubs",     label: "Clubs" },
  { value: "na_import", label: "North America import" },
  { value: "usports",   label: "U Sports" },
  { value: "cjfl",      label: "CJFL" },
  { value: "bucs",      label: "BUCS" },
] as const;

const LANGUAGES = [
  "English","German","French","Spanish","Italian",
  "Dutch","Polish","Portuguese","Swedish","Danish",
  "Norwegian","Finnish","Czech","Hungarian","Romanian","Turkish",
] as const;

const ROLE_CONFIG: Record<string, { label: string; description: string; icon: string; hasRoleStep: boolean }> = {
  player:     { label: "Player",     description: "I play American football in Europe",   icon: "🏈", hasRoleStep: true },
  club:       { label: "Club",       description: "I manage or represent a club",         icon: "🏟", hasRoleStep: true },
  journalist: { label: "Journalist", description: "I cover European football",            icon: "✍️", hasRoleStep: false },
  fan:        { label: "Fan",        description: "I follow the sport",                   icon: "👀", hasRoleStep: false },
  admin:      { label: "Admin",      description: "EuroScout platform admin",             icon: "⚙️", hasRoleStep: false },
};

const PUBLIC_ROLES: UserRole[] = ["player", "club", "journalist", "fan"];

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
  "h-11 w-full border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-900 outline-none transition focus:border-red-500 dark:border-white/10 dark:bg-black/35 dark:text-white dark:placeholder:text-white/25";

const selectClass =
  "h-11 w-full border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-900 outline-none transition focus:border-red-500 dark:border-white/10 dark:bg-black/35 dark:text-white";

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

function ToggleChip({ label, selected, onToggle }: { label: string; selected: boolean; onToggle: () => void }) {
  return (
    <button type="button" onClick={onToggle} className={cn(
      "border px-3 py-1.5 text-xs font-bold transition",
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
                <span className="mt-0.5 block text-xs text-slate-500 dark:text-slate-400">{config.description}</span>
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ─── Step 2: Identity ─────────────────────────────────────────────────────────

function IdentityStep(props: {
  displayName: string; setDisplayName: (v: string) => void;
  location:    string; setLocation:    (v: string) => void;
  headline:    string; setHeadline:    (v: string) => void;
}) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-black tracking-tight text-slate-950 dark:text-white">Your identity.</h2>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">This is how you appear on EuroScout. Make it recognisable.</p>
      </div>
      <label className="block">
        <FieldLabel required>Display name</FieldLabel>
        <input value={props.displayName} onChange={(e) => props.setDisplayName(e.target.value)} placeholder="e.g. Jonas Weber" className={inputClass} />
      </label>
      <label className="block">
        <FieldLabel>Location</FieldLabel>
        <input value={props.location} onChange={(e) => props.setLocation(e.target.value)} placeholder="e.g. Berlin, Germany" className={inputClass} />
      </label>
      <label className="block">
        <FieldLabel>Headline</FieldLabel>
        <input value={props.headline} onChange={(e) => props.setHeadline(e.target.value)} placeholder="e.g. Starting QB at Berlin Rebels" className={inputClass} />
      </label>
    </div>
  );
}

// ─── Step 3a: Player ──────────────────────────────────────────────────────────

type PlayerPipelineOrigin = "europe" | CampusPipeline | "other";

function PlayerStep(props: {
  firstName:            string; setFirstName:            (v: string) => void;
  lastName:             string; setLastName:             (v: string) => void;
  dob:                  string; setDob:                  (v: string) => void;
  nationality:          string; setNationality:          (v: string) => void;
  languages:           string[]; toggleLanguage:           (l: string) => void;
  passportReady:        boolean | null; setPassportReady: (v: boolean | null) => void;
  position:             string; setPosition:             (v: string) => void;
  heightFt:             string; setHeightFt:             (v: string) => void;
  heightIn:             string; setHeightIn:             (v: string) => void;
  weightKg:             string; setWeightKg:             (v: string) => void;
  currentTeamId:        string; setCurrentTeamId:        (v: string) => void;
  pipelineType:         string; setPipelineType:         (v: string) => void;
  pipelineOrigin:       PlayerPipelineOrigin; setPipelineOrigin: (v: PlayerPipelineOrigin) => void;
  campusYearStart:      string; setCampusYearStart:      (v: string) => void;
  campusYearEnd:        string; setCampusYearEnd:        (v: string) => void;
  availableForTransfer: boolean; setAvailableForTransfer: (v: boolean) => void;
  careerTimeline:       CareerTimelineDraft[]; setCareerTimeline: (v: CareerTimelineDraft[]) => void;
}) {
  const age = calcAge(props.dob);
  const heightCm = feetInchesToCm(Number(props.heightFt) || 0, Number(props.heightIn) || 0);
  const campusTeamsForOrigin = isCampusPipeline(props.pipelineOrigin) ? getCampusTeamsForPipeline(props.pipelineOrigin) : [];
  const selectedCampusTeam = getCampusTeam(props.currentTeamId);
  const showFrenchSuggestion = isFrenchCanadianCampusTeam(props.currentTeamId) && !props.languages.includes("French");

  const originOptions: Array<{ value: PlayerPipelineOrigin; label: string; detail: string }> = [
    { value: "europe", label: "European club", detail: "Playing or recently played for a European team" },
    { value: "usports", label: "U Sports", detail: "Canadian university football" },
    { value: "cjfl", label: "CJFL", detail: "Canadian junior football" },
    { value: "bucs", label: "BUCS", detail: "UK university football" },
    { value: "other", label: "Other", detail: "Independent, academy or mixed background" }
  ];

  function selectOrigin(value: PlayerPipelineOrigin) {
    props.setPipelineOrigin(value);
    props.setCurrentTeamId("");
    props.setPipelineType(isCampusPipeline(value) ? value : "");
    props.setCampusYearStart("");
    props.setCampusYearEnd("");
  }

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-xl font-black tracking-tight text-slate-950 dark:text-white">Player details.</h2>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Help scouts and clubs find and evaluate you.</p>
      </div>

      <div>
        <SectionHeading>Personal</SectionHeading>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block">
            <FieldLabel>First name</FieldLabel>
            <input value={props.firstName} onChange={(e) => props.setFirstName(e.target.value)} placeholder="Jonas" className={inputClass} />
          </label>
          <label className="block">
            <FieldLabel>Last name</FieldLabel>
            <input value={props.lastName} onChange={(e) => props.setLastName(e.target.value)} placeholder="Weber" className={inputClass} />
          </label>
          <label className="block">
            <FieldLabel>Date of birth{age !== null ? ` (age ${age})` : ""}</FieldLabel>
            <input type="date" value={props.dob} onChange={(e) => props.setDob(e.target.value)} className={inputClass} />
          </label>
          <label className="block">
            <FieldLabel>Nationality</FieldLabel>
            <select value={props.nationality} onChange={(e) => props.setNationality(e.target.value)} className={selectClass}>
              <option value="">Select country</option>
              {countries.map((c) => <option key={c.code} value={c.name}>{c.name}</option>)}
            </select>
          </label>
        </div>

        <div className="mt-4">
          <FieldLabel>Languages</FieldLabel>
          <div className="flex flex-wrap gap-2">
            {LANGUAGES.map((l) => (
              <ToggleChip key={l} label={l} selected={props.languages.includes(l)} onToggle={() => props.toggleLanguage(l)} />
            ))}
          </div>
        </div>

        <div className="mt-4">
          <FieldLabel>Passport eligible</FieldLabel>
          <div className="flex gap-3">
            {([{ val: true, label: "Yes" }, { val: false, label: "No" }, { val: null, label: "Not sure" }] as const).map(({ val, label }) => (
            <button key={label} type="button" onClick={() => props.setPassportReady(val)}
                className={cn("border px-4 py-2 text-sm font-bold transition",
                  props.passportReady === val
                    ? "border-red-300 bg-red-50 text-red-700 dark:border-red-500/50 dark:bg-red-500/20 dark:text-red-300"
                    : "border-slate-200 bg-white/70 text-slate-600 hover:border-red-200 dark:border-white/10 dark:bg-white/5 dark:text-slate-400"
                )}>
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div>
        <SectionHeading>On the field</SectionHeading>
        <div className="mb-4">
          <FieldLabel>Where did you play most recently?</FieldLabel>
          <div className="grid gap-2 sm:grid-cols-5">
            {originOptions.map((option) => {
              const selected = props.pipelineOrigin === option.value;
              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => selectOrigin(option.value)}
                  className={cn(
                    "border p-3 text-left transition",
                    selected
                      ? "border-red-300 bg-red-50 text-red-700 dark:border-red-500/50 dark:bg-red-500/15 dark:text-red-200"
                      : "border-slate-200 bg-white/70 text-slate-600 hover:border-red-200 dark:border-white/10 dark:bg-white/5 dark:text-slate-300 dark:hover:border-red-500/30"
                  )}
                >
                  <span className="block text-sm font-black">{option.label}</span>
                  <span className="mt-1 block text-[11px] leading-snug text-slate-500 dark:text-slate-400">{option.detail}</span>
                </button>
              );
            })}
          </div>
        </div>
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
            <select
              value={props.pipelineType}
              onChange={(e) => props.setPipelineType(e.target.value)}
              disabled={isCampusPipeline(props.pipelineOrigin)}
              className={selectClass}
            >
              <option value="">Select level</option>
              {PIPELINES.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
            </select>
          </label>

          <div>
            <FieldLabel>Height</FieldLabel>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <input type="number" min="4" max="8" placeholder="6" value={props.heightFt} onChange={(e) => props.setHeightFt(e.target.value)} className={inputClass + " pr-9"} />
                <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">ft</span>
              </div>
              <div className="relative flex-1">
                <input type="number" min="0" max="11" placeholder="2" value={props.heightIn} onChange={(e) => props.setHeightIn(e.target.value)} className={inputClass + " pr-9"} />
                <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">in</span>
              </div>
            </div>
            {heightCm > 0 && <span className="mt-1 block text-xs text-slate-400">{heightCm} cm</span>}
          </div>

          <div>
            <FieldLabel>Weight</FieldLabel>
            <div className="relative">
              <input type="number" placeholder="95" value={props.weightKg} onChange={(e) => props.setWeightKg(e.target.value)} className={inputClass + " pr-9"} />
              <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">kg</span>
            </div>
            {props.weightKg && !isNaN(Number(props.weightKg)) && Number(props.weightKg) > 0 && (
              <span className="mt-1 block text-xs text-slate-400">{Math.round(Number(props.weightKg) * 2.205)} lbs</span>
            )}
          </div>

          {isCampusPipeline(props.pipelineOrigin) ? (
            <div className="sm:col-span-2">
              <FieldLabel>{campusPipelines[props.pipelineOrigin].label} team</FieldLabel>
              <select value={props.currentTeamId} onChange={(e) => props.setCurrentTeamId(e.target.value)} className={selectClass}>
                <option value="">Select your recent campus team</option>
                {campusTeamsForOrigin.map((t) => (
                  <option key={t.id} value={t.id}>{t.name} ({t.conference ?? t.country})</option>
                ))}
              </select>
              {selectedCampusTeam && (
                <div className="mt-3 border border-slate-200 bg-white/70 p-3 text-xs text-slate-600 dark:border-white/10 dark:bg-white/5 dark:text-slate-300">
                  <span className="font-black text-slate-900 dark:text-white">{selectedCampusTeam.name}</span>
                  <span className="ml-2">{selectedCampusTeam.conference ?? campusPipelines[selectedCampusTeam.leagueId].label} · {selectedCampusTeam.country}</span>
                </div>
              )}
              {showFrenchSuggestion && (
                <div className="mt-3 flex flex-col gap-3 border border-red-200 bg-red-50/70 p-3 text-xs text-red-800 dark:border-red-400/25 dark:bg-red-500/10 dark:text-red-200 sm:flex-row sm:items-center sm:justify-between">
                  <span>RSEQ and Quebec programs often value French. Add French if you speak it.</span>
                  <button type="button" onClick={() => props.toggleLanguage("French")} className="self-start border border-red-300 bg-white px-3 py-1.5 font-black text-red-700 dark:border-red-400/30 dark:bg-red-500/10 dark:text-red-200">
                    Add French
                  </button>
                </div>
              )}
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <label className="block">
                  <FieldLabel>Started</FieldLabel>
                  <input type="number" min="2010" max="2035" value={props.campusYearStart} onChange={(e) => props.setCampusYearStart(e.target.value)} placeholder="2024" className={inputClass} />
                </label>
                <label className="block">
                  <FieldLabel>Finished / expected</FieldLabel>
                  <input type="number" min="2010" max="2035" value={props.campusYearEnd} onChange={(e) => props.setCampusYearEnd(e.target.value)} placeholder="2026" className={inputClass} />
                </label>
              </div>
            </div>
          ) : (
            <label className="block sm:col-span-2">
              <FieldLabel>Current team</FieldLabel>
              <select value={props.currentTeamId} onChange={(e) => props.setCurrentTeamId(e.target.value)} className={selectClass}>
                <option value="">No current team / unattached</option>
                {teams.map((t) => <option key={t.id} value={t.id}>{t.name} ({t.country})</option>)}
              </select>
            </label>
          )}
          <div className="sm:col-span-2">
            <FieldLabel>Career timeline</FieldLabel>
            <CareerTimelineBuilder entries={props.careerTimeline} onChange={props.setCareerTimeline} />
          </div>
        </div>

        <label className="mt-4 flex cursor-pointer items-center gap-3 border border-slate-200 bg-white px-4 py-3.5 transition hover:border-red-200 dark:border-white/10 dark:bg-[#111] dark:hover:border-red-500/30">
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

// ─── Step 3b: Club / Team search ──────────────────────────────────────────────

type ClubAction = "claim" | "join" | "new" | "";

function ClubStep(props: {
  teamSearch:      string; setTeamSearch:      (v: string) => void;
  selectedTeamId:  string; setSelectedTeamId:  (v: string) => void;
  clubAction:      ClubAction; setClubAction:  (v: ClubAction) => void;
  newTeamName:     string; setNewTeamName:     (v: string) => void;
  newTeamCity:     string; setNewTeamCity:     (v: string) => void;
  newTeamCountry:  string; setNewTeamCountry:  (v: string) => void;
  newTeamLeagueId: string; setNewTeamLeagueId: (v: string) => void;
  newTeamRegionId: string; setNewTeamRegionId: (v: string) => void;
  newTeamStadium:  string; setNewTeamStadium:  (v: string) => void;
}) {
  const claimableTeams = useMemo(() => [
    ...campusTeams.map((team) => ({
      id: team.id,
      name: team.name,
      city: team.city,
      country: team.country,
      label: `${team.name} (${campusPipelines[team.leagueId].label})`
    })),
    ...teams.map((team) => ({
      id: team.id,
      name: team.name,
      city: team.city,
      country: team.country,
      label: `${team.name} (${team.country})`
    }))
  ], []);

  const filtered = useMemo(() => {
    const q = props.teamSearch.toLowerCase().trim();
    if (!q) return [];
    return claimableTeams.filter((t) =>
      t.name.toLowerCase().includes(q) ||
      (t.city ?? "").toLowerCase().includes(q) ||
      (t.country ?? "").toLowerCase().includes(q)
    ).slice(0, 8);
  }, [claimableTeams, props.teamSearch]);

  const selectedTeam = claimableTeams.find((t) => t.id === props.selectedTeamId);
  const noResults = props.teamSearch.trim().length >= 2 && filtered.length === 0;

  function selectTeam(id: string) {
    props.setSelectedTeamId(id);
    props.setTeamSearch("");
    props.setClubAction("");
    props.setNewTeamName("");
  }

  function clearSelection() {
    props.setSelectedTeamId("");
    props.setClubAction("");
    props.setTeamSearch("");
    props.setNewTeamName("");
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-black tracking-tight text-slate-950 dark:text-white">Find your club.</h2>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Search for your team. You can claim it, join it, or request it be added.</p>
      </div>

      {!selectedTeam && (
        <div className="relative">
          <FieldLabel>Search teams by name, city or country</FieldLabel>
          <input
            value={props.teamSearch}
            onChange={(e) => props.setTeamSearch(e.target.value)}
            placeholder="e.g. Berlin Rebels, Frankfurt, Germany…"
            className={inputClass}
          />
          {filtered.length > 0 && (
            <ul className="absolute z-10 mt-1.5 w-full overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl dark:border-white/10 dark:bg-slate-900">
              {filtered.map((t) => (
                <li key={t.id}>
                  <button
                    type="button"
                    onClick={() => selectTeam(t.id)}
                    className="flex w-full items-center gap-3 px-4 py-3 text-left text-sm transition hover:bg-red-50 dark:hover:bg-red-500/10"
                  >
                    <span className="font-bold text-slate-900 dark:text-white">{t.name}</span>
                    <span className="text-slate-500 dark:text-slate-400">{t.city}, {t.country}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {selectedTeam && (
        <div className="rounded-2xl border border-red-200 bg-red-50/60 p-4 dark:border-red-500/30 dark:bg-red-500/10">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.18em] text-red-600 dark:text-red-400">Selected club</p>
              <p className="mt-1 text-base font-black text-slate-950 dark:text-white">{selectedTeam.name}</p>
              <p className="text-sm text-slate-500 dark:text-slate-400">{selectedTeam.city}, {selectedTeam.country}</p>
            </div>
            <button type="button" onClick={clearSelection} className="rounded-xl border border-slate-200 bg-white/80 px-3 py-1.5 text-xs font-bold text-slate-600 transition hover:border-red-200 hover:text-red-700 dark:border-white/10 dark:bg-white/5 dark:text-slate-400 dark:hover:border-red-500/30">
              Change
            </button>
          </div>
          <div className="mt-4">
            <SectionHeading>What would you like to do?</SectionHeading>
            <div className="grid gap-2 sm:grid-cols-2">
              <button
                type="button"
                onClick={() => props.setClubAction("claim")}
                className={cn(
                  "rounded-2xl border p-3 text-left transition",
                  props.clubAction === "claim"
                    ? "border-red-300 bg-red-50 dark:border-red-500/50 dark:bg-red-500/15"
                    : "border-slate-200 bg-white/80 hover:border-red-200 dark:border-white/10 dark:bg-white/5"
                )}
              >
                <p className="text-sm font-black text-slate-900 dark:text-white">Claim this club</p>
                <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">Become the verified owner. Subject to admin approval.</p>
              </button>
              <button
                type="button"
                onClick={() => props.setClubAction("join")}
                className={cn(
                  "rounded-2xl border p-3 text-left transition",
                  props.clubAction === "join"
                    ? "border-red-300 bg-red-50 dark:border-red-500/50 dark:bg-red-500/15"
                    : "border-slate-200 bg-white/80 hover:border-red-200 dark:border-white/10 dark:bg-white/5"
                )}
              >
                <p className="text-sm font-black text-slate-900 dark:text-white">Request to join</p>
                <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">Join as a recruiter. The owner can manage your access.</p>
              </button>
            </div>
          </div>
        </div>
      )}

      {noResults && (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white/70 p-5 dark:border-white/15 dark:bg-white/5">
          <p className="text-sm font-bold text-slate-700 dark:text-slate-200">
            No teams matched &ldquo;{props.teamSearch}&rdquo;
          </p>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Request this team be added. Our team will review and add it.</p>
          <label className="mt-3 block">
            <FieldLabel>Team name to add</FieldLabel>
            <input
              value={props.newTeamName}
              onChange={(e) => {
                props.setNewTeamName(e.target.value);
                props.setClubAction("new");
              }}
              placeholder="Full official team name"
              className={inputClass}
            />
          </label>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <label className="block">
              <FieldLabel required>City</FieldLabel>
              <input value={props.newTeamCity} onChange={(e) => props.setNewTeamCity(e.target.value)} placeholder="Team city" className={inputClass} />
            </label>
            <label className="block">
              <FieldLabel required>Country</FieldLabel>
              <input value={props.newTeamCountry} onChange={(e) => props.setNewTeamCountry(e.target.value)} placeholder="Team country" className={inputClass} />
            </label>
            <label className="block">
              <FieldLabel required>League</FieldLabel>
              <select value={props.newTeamLeagueId} onChange={(e) => props.setNewTeamLeagueId(e.target.value)} className={selectClass}>
                <option value="">Select league</option>
                {leagues.map((league) => <option key={league.id} value={league.id}>{league.name}</option>)}
              </select>
            </label>
            <label className="block">
              <FieldLabel required>Region</FieldLabel>
              <select value={props.newTeamRegionId} onChange={(e) => props.setNewTeamRegionId(e.target.value)} className={selectClass}>
                <option value="">Select region</option>
                {regions.map((region) => <option key={region.id} value={region.id}>{region.name}</option>)}
              </select>
            </label>
            <label className="block sm:col-span-2">
              <FieldLabel>Stadium</FieldLabel>
              <input value={props.newTeamStadium} onChange={(e) => props.setNewTeamStadium(e.target.value)} placeholder="Home stadium" className={inputClass} />
            </label>
          </div>
        </div>
      )}

      <p className="text-xs text-slate-400 dark:text-slate-500">
        Club connection happens during onboarding so every account stays tied to a single club.
      </p>
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
        <h2 className="text-xl font-black tracking-tight text-slate-950 dark:text-white">You&apos;re almost in.</h2>
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
  const [pipelineOrigin,       setPipelineOrigin]       = useState<PlayerPipelineOrigin>("europe");
  const [campusYearStart,      setCampusYearStart]      = useState("");
  const [campusYearEnd,        setCampusYearEnd]        = useState("");
  const [availableForTransfer, setAvailableForTransfer] = useState(false);
  const [careerTimeline,       setCareerTimeline]       = useState<CareerTimelineDraft[]>([]);

  // Step 3 – club
  const [teamSearch,     setTeamSearch]     = useState("");
  const [selectedTeamId, setSelectedTeamId] = useState("");
  const [clubAction,     setClubAction]     = useState<ClubAction>("");
  const [newTeamName,    setNewTeamName]    = useState("");
  const [newTeamCity,    setNewTeamCity]    = useState("");
  const [newTeamCountry, setNewTeamCountry] = useState("");
  const [newTeamLeagueId, setNewTeamLeagueId] = useState("");
  const [newTeamRegionId, setNewTeamRegionId] = useState("");
  const [newTeamStadium, setNewTeamStadium] = useState("");

  // Final
  const [isPublic, setIsPublic] = useState(true);

  // Toggles
  const toggleLanguage = (l: string) => setLanguages((p) => p.includes(l) ? p.filter((x) => x !== l) : [...p, l]);

  // Derived
  const hasRoleStep    = ROLE_CONFIG[role]?.hasRoleStep ?? false;
  const totalSteps     = hasRoleStep ? 4 : 3;
  const roleStepNum    = hasRoleStep ? 3 : null;
  const confirmStepNum = hasRoleStep ? 4 : 3;

  const roleStepLabels: Record<string, string>       = { player: "Player details", club: "Your club" };
  const roleStepDescriptions: Record<string, string> = { player: "Position, stats & availability", club: "Find and connect to your team" };

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

    // Player fields
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
    fd.append("campus_pipeline_origin", pipelineOrigin);
    fd.append("pipeline_type",     isCampusPipeline(pipelineOrigin) ? pipelineOrigin : pipelineType);
    fd.append("campus_year_start", campusYearStart);
    fd.append("campus_year_end",   campusYearEnd);
    fd.append("career_timeline_json", JSON.stringify(careerTimeline));
    if (availableForTransfer) fd.append("available_for_transfer", "on");

    // Club fields
    fd.append("team_id",           selectedTeamId);
    fd.append("club_action",       clubAction);
    fd.append("team_name_request", newTeamName.trim());
    fd.append("new_team_city",     newTeamCity.trim());
    fd.append("new_team_country",  newTeamCountry.trim());
    fd.append("new_team_league_id", newTeamLeagueId);
    fd.append("new_team_region_id", newTeamRegionId);
    fd.append("new_team_stadium",  newTeamStadium.trim());

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
    ? [position, isCampusPipeline(pipelineOrigin) ? campusPipelines[pipelineOrigin].label : pipelineType].filter(Boolean).join(" · ")
    : role === "club" && selectedTeamId
      ? getCampusTeam(selectedTeamId)?.name ?? teams.find((t) => t.id === selectedTeamId)?.name ?? ""
      : "";

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
          <div className="mb-6 border border-red-200 bg-red-50 p-3 text-sm font-bold text-red-700 dark:border-red-400/30 dark:bg-red-500/10 dark:text-red-300">
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
              pipelineOrigin={pipelineOrigin}             setPipelineOrigin={setPipelineOrigin}
              campusYearStart={campusYearStart}           setCampusYearStart={setCampusYearStart}
              campusYearEnd={campusYearEnd}               setCampusYearEnd={setCampusYearEnd}
              availableForTransfer={availableForTransfer} setAvailableForTransfer={setAvailableForTransfer}
              careerTimeline={careerTimeline}             setCareerTimeline={setCareerTimeline}
            />
          )}
          {step === roleStepNum && role === "club" && (
            <ClubStep
              teamSearch={teamSearch}         setTeamSearch={setTeamSearch}
              selectedTeamId={selectedTeamId} setSelectedTeamId={setSelectedTeamId}
              clubAction={clubAction}         setClubAction={setClubAction}
              newTeamName={newTeamName}       setNewTeamName={setNewTeamName}
              newTeamCity={newTeamCity}       setNewTeamCity={setNewTeamCity}
              newTeamCountry={newTeamCountry} setNewTeamCountry={setNewTeamCountry}
              newTeamLeagueId={newTeamLeagueId} setNewTeamLeagueId={setNewTeamLeagueId}
              newTeamRegionId={newTeamRegionId} setNewTeamRegionId={setNewTeamRegionId}
              newTeamStadium={newTeamStadium} setNewTeamStadium={setNewTeamStadium}
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
              className="inline-flex h-11 items-center border border-slate-200 bg-white px-5 text-sm font-bold text-slate-700 transition hover:border-red-200 hover:text-red-700 dark:border-white/10 dark:bg-[#111] dark:text-slate-300 dark:hover:border-red-500/30 dark:hover:text-red-300"
            >
              ← Back
            </button>
          ) : <span />}

          {step < totalSteps ? (
            <button
              type="button" onClick={() => { if (canAdvance) setStep((s) => Math.min(s + 1, totalSteps)); }}
              disabled={!canAdvance}
              className="inline-flex h-11 items-center bg-red-600 px-6 text-sm font-black text-white shadow-sm transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Continue →
            </button>
          ) : (
            <button
              type="button" onClick={handleSubmit} disabled={isPending}
              className="inline-flex h-11 items-center bg-red-600 px-6 text-sm font-black text-white shadow-sm transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isPending ? "Setting up your profile…" : "Complete onboarding"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
