export interface League {
  id: string;
  name: string;
  shortName: string;
  countryScope: string;
  regionIds: string[];
  tier: "continental" | "national" | "premier";
  marketTier: "gold" | "silver" | "bronze";
  status: "active" | "inactive" | "coming-soon";
  teamCount: number;
  description: string;
  slug: string;
}
