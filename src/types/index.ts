export * from "./region";
export * from "./league";
export * from "./team";

// ─── Club ──────────────────────────────────────────────────────────────────────

export type ClubRole = "owner" | "coach" | "recruiter" | "analyst";

export interface ClubMember {
  id: string;
  team_id: string;
  profile_id: string;
  club_role: ClubRole;
  invited_by: string | null;
  joined_at: string;
  created_at: string;
}

export interface ClubDispute {
  id: string;
  team_id: string;
  raised_by: string;
  reason: string;
  status: "open" | "reviewed" | "dismissed" | "upheld";
  admin_notes: string | null;
  created_at: string;
  resolved_at: string | null;
}

// ─── Messaging ─────────────────────────────────────────────────────────────────

export interface Conversation {
  id: string;
  created_by: string;
  subject: string | null;
  team_id: string | null;
  created_at: string;
  updated_at: string;
}

// ─── Watchlists ────────────────────────────────────────────────────────────────

export interface Watchlist {
  id: string;
  user_id: string | null;
  team_id: string | null;
  name: string;
  is_shared: boolean;
  created_at: string;
  updated_at: string;
}
