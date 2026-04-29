export interface Team {
  id: string;
  name: string;
  city: string;
  country: string;
  leagueId: string;
  regionId: string;
  division?: string;
  stadium?: string;
  logoUrl?: string;
  slug: string;
}
