export interface Team {
  id: string;
  name: string;
  city: string;
  country: string;
  countryFlag: string;
  leagueId: string;
  regionId: string;
  marketTier: "gold" | "silver" | "bronze";
  division?: string;
  stadium?: string;
  logoUrl?: string;
  slug: string;
  claim_status?: "unclaimed" | "pending" | "verified" | "disputed" | "rejected";
  claimed_at?: string | null;
  claim_expires_at?: string | null;
  claimed_by?: string | null;
  website?: string | null;
  contact_email?: string | null;
  open_roster_spots?: number | null;
  recruiting_active?: boolean | null;
  roster_needs?: string[] | null;
  direct_messaging_enabled?: boolean | null;
}
