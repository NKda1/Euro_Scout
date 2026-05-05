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
}
