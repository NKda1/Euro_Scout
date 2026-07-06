import type { League } from "@/types";

type LeagueSeed = Omit<League, "marketTier">;

const leagues: LeagueSeed[] = [
  {
    id: "afle",
    slug: "afle",
    name: "AFLE - The League Europe",
    shortName: "AFLE",
    countryScope: "Pan-European",
    regionIds: ["switzerland", "united-kingdom", "france", "germany", "italy", "austria", "poland"],
    tier: "continental",
    status: "active",
    teamCount: 8,
    description: "The League Europe 2026 season featuring franchises across Switzerland, the UK, France, Germany, Italy, Austria and Poland."
  },
  {
    id: "efa",
    slug: "efa",
    name: "European Football Alliance",
    shortName: "EFA",
    countryScope: "Pan-European",
    regionIds: ["germany", "denmark", "france", "czech-republic", "austria"],
    tier: "continental",
    status: "active",
    teamCount: 6,
    description: "The inaugural 2026 EFA season featuring six elite franchises from Germany, Denmark, France, Czech Republic and Austria."
  },
  {
    id: "gfl",
    slug: "gfl",
    name: "German Football League",
    shortName: "GFL",
    countryScope: "Germany",
    regionIds: ["germany"],
    tier: "premier",
    status: "active",
    teamCount: 15,
    description: "Germany's top domestic American football league, split into North and South divisions for the 2026 season."
  },
  {
    id: "austrian-football-league",
    slug: "austrian-football-league",
    name: "Austrian Football League",
    shortName: "AFL",
    countryScope: "Austria, Czech Republic, Hungary",
    regionIds: ["austria", "czech-republic", "hungary"],
    tier: "premier",
    status: "active",
    teamCount: 8,
    description: "Austria's elite domestic competition, with 2026 participation extending to Prague Black Panthers and Fehérvár Enthroners."
  },
  {
    id: "italian-football-league",
    slug: "italian-football-league",
    name: "Italian Football League",
    shortName: "IFL",
    countryScope: "Italy",
    regionIds: ["italy"],
    tier: "premier",
    status: "active",
    teamCount: 9,
    description: "Italy's top senior American football competition for the 2026 season."
  },
  {
    id: "france-d1",
    slug: "france-d1",
    name: "France D1 / Championnat Elite",
    shortName: "D1 Elite",
    countryScope: "France",
    regionIds: ["france"],
    tier: "premier",
    status: "active",
    teamCount: 12,
    description: "France's premier domestic league, organized into North and South groups for the 2026 Championnat Elite season."
  },
  {
    id: "swiss-nla",
    slug: "swiss-nla",
    name: "Swiss NLA",
    shortName: "NLA",
    countryScope: "Switzerland",
    regionIds: ["switzerland"],
    tier: "premier",
    status: "active",
    teamCount: 7,
    description: "Switzerland's top national American football league."
  },
  {
    id: "spain-lnfa-serie-a",
    slug: "spain-lnfa-serie-a",
    name: "Spain LNFA Serie A",
    shortName: "LNFA A",
    countryScope: "Spain",
    regionIds: ["spain"],
    tier: "premier",
    status: "active",
    teamCount: 7,
    description: "Spain's Serie A level of the Liga Nacional de Fútbol Americano."
  },
  {
    id: "poland-pfl",
    slug: "poland-pfl",
    name: "Poland PFL",
    shortName: "PFL1",
    countryScope: "Poland",
    regionIds: ["poland"],
    tier: "premier",
    status: "active",
    teamCount: 5,
    description: "Poland's PFL1 competition featuring the country's leading American football clubs."
  },
  {
    id: "bafa-premiership",
    slug: "bafa-premiership",
    name: "BAFA Premiership",
    shortName: "BAFA Prem",
    countryScope: "United Kingdom",
    regionIds: ["united-kingdom"],
    tier: "premier",
    status: "active",
    teamCount: 10,
    description: "The United Kingdom's Premiership tier, split into North and South divisions."
  },
  {
    id: "bafa-division-one",
    slug: "bafa-division-one",
    name: "BAFA Division One",
    shortName: "BAFA D1",
    countryScope: "United Kingdom",
    regionIds: ["united-kingdom"],
    tier: "national",
    status: "active",
    teamCount: 0,
    description: "The United Kingdom's senior lower-division pathway for clubs below the BAFA Premiership."
  },
  {
    id: "gfl-2",
    slug: "gfl-2",
    name: "German Football League 2",
    shortName: "GFL 2",
    countryScope: "Germany",
    regionIds: ["germany"],
    tier: "national",
    status: "active",
    teamCount: 0,
    description: "Germany's second national tier, giving ambitious clubs a route toward the GFL."
  },
  {
    id: "bucs",
    slug: "bucs",
    name: "BUCS American Football",
    shortName: "BUCS",
    countryScope: "United Kingdom",
    regionIds: ["united-kingdom"],
    tier: "university",
    status: "active",
    teamCount: 0,
    description: "UK university American football, including Premier and lower-division programs that feed the European football pathway."
  }
];

export default leagues;
