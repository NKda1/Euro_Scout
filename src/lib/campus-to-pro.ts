export type CampusPipeline = "usports" | "cjfl" | "bucs";

export interface CampusTeam {
  id: string;
  name: string;
  slug: string;
  leagueId: CampusPipeline;
  city: string;
  country: string;
  regionId: string;
  conference?: string;
  institution?: string;
  bilingual?: boolean;
}

type CampusTeamTuple = [
  id: string,
  name: string,
  slug: string,
  city: string,
  regionId: string,
  conference?: string,
  bilingual?: boolean
];

type BucsTeamTuple = [
  id: string,
  name: string,
  slug: string,
  city: string,
  regionId: string
];

export const campusPipelines: Record<CampusPipeline, {
  id: CampusPipeline;
  label: string;
  shortLabel: string;
  description: string;
  about: string;
  logoPath: string;
  country: string;
  teamCount: number;
}> = {
  usports: {
    id: "usports",
    label: "U Sports",
    shortLabel: "USPORTS",
    description: "Canadian university football across Atlantic, OUA, RSEQ and Canada West.",
    about: "U Sports is Canada's university football pathway, with varsity programs competing across regional conferences and producing athletes for European clubs, the CFL pipeline and graduate-level opportunities.",
    logoPath: "/images/U_Sports_Logo.svg",
    country: "Canada",
    teamCount: 27
  },
  cjfl: {
    id: "cjfl",
    label: "CJFL",
    shortLabel: "CJFL",
    description: "Canadian junior football for players aged 17-22.",
    about: "The Canadian Junior Football League gives 17-22 year-old players a high-rep bridge between high school, university and senior football, making it useful for finding game-ready prospects with competitive film.",
    logoPath: "/images/CJFL_logo.jpg",
    country: "Canada",
    teamCount: 19
  },
  bucs: {
    id: "bucs",
    label: "BUCS Premier",
    shortLabel: "BUCS",
    description: "UK university American football programs feeding European clubs.",
    about: "BUCS American football covers UK university programs and is a strong fit for players balancing football with further studies. Some institutions may offer sport scholarships, bursaries or performance support packages.",
    logoPath: "/images/BUCS.png",
    country: "United Kingdom",
    teamCount: 15
  }
};

const usportsTeams: CampusTeam[] = ([
  ["usports-acadia", "Acadia Axemen", "acadia-axemen", "Wolfville", "ca-ns", "Atlantic"],
  ["usports-alberta", "Alberta Golden Bears", "alberta-golden-bears", "Edmonton", "ca-ab", "Canada West"],
  ["usports-bishops", "Bishop's Gaiters", "bishops-gaiters", "Sherbrooke", "ca-qc", "Atlantic", true],
  ["usports-calgary", "Calgary Dinos", "calgary-dinos", "Calgary", "ca-ab", "Canada West"],
  ["usports-carleton", "Carleton Ravens", "carleton-ravens", "Ottawa", "ca-on", "OUA"],
  ["usports-concordia", "Concordia Stingers", "concordia-stingers", "Montreal", "ca-qc", "RSEQ", true],
  ["usports-guelph", "Guelph Gryphons", "guelph-gryphons", "Guelph", "ca-on", "OUA"],
  ["usports-laurier", "Laurier Golden Hawks", "laurier-golden-hawks", "Waterloo", "ca-on", "OUA"],
  ["usports-laval", "Laval Rouge et Or", "laval-rouge-et-or", "Quebec City", "ca-qc", "RSEQ", true],
  ["usports-manitoba", "Manitoba Bisons", "manitoba-bisons", "Winnipeg", "ca-mb", "Canada West"],
  ["usports-mcgill", "McGill Redbirds", "mcgill-redbirds", "Montreal", "ca-qc", "RSEQ", true],
  ["usports-mcmaster", "McMaster Marauders", "mcmaster-marauders", "Hamilton", "ca-on", "OUA"],
  ["usports-montreal", "Montreal Carabins", "montreal-carabins", "Montreal", "ca-qc", "RSEQ", true],
  ["usports-mountallison", "Mount Allison Mounties", "mount-allison-mounties", "Sackville", "ca-nb", "Atlantic"],
  ["usports-ottawa", "Ottawa Gee-Gees", "ottawa-gee-gees", "Ottawa", "ca-on", "OUA"],
  ["usports-queens", "Queen's Gaels", "queens-gaels", "Kingston", "ca-on", "OUA"],
  ["usports-regina", "Regina Rams", "regina-rams", "Regina", "ca-sk", "Canada West"],
  ["usports-saintmarys", "Saint Mary's Huskies", "saint-marys-huskies", "Halifax", "ca-ns", "Atlantic"],
  ["usports-saskatchewan", "Saskatchewan Huskies", "saskatchewan-huskies", "Saskatoon", "ca-sk", "Canada West"],
  ["usports-sherbrooke", "Sherbrooke Vert & Or", "sherbrooke-vert-et-or", "Sherbrooke", "ca-qc", "RSEQ", true],
  ["usports-stfx", "St. Francis Xavier X-Men", "stfx-x-men", "Antigonish", "ca-ns", "Atlantic"],
  ["usports-toronto", "Toronto Varsity Blues", "toronto-varsity-blues", "Toronto", "ca-on", "OUA"],
  ["usports-ubc", "UBC Thunderbirds", "ubc-thunderbirds", "Vancouver", "ca-bc", "Canada West"],
  ["usports-waterloo", "Waterloo Warriors", "waterloo-warriors", "Waterloo", "ca-on", "OUA"],
  ["usports-western", "Western Mustangs", "western-mustangs", "London", "ca-on", "OUA"],
  ["usports-windsor", "Windsor Lancers", "windsor-lancers", "Windsor", "ca-on", "OUA"],
  ["usports-york", "York Lions", "york-lions", "Toronto", "ca-on", "OUA"]
] satisfies CampusTeamTuple[]).map(([id, name, slug, city, regionId, conference, bilingual]) => ({
  id: id as string,
  name: name as string,
  slug: slug as string,
  leagueId: "usports",
  city: city as string,
  country: "Canada",
  regionId: regionId as string,
  conference: conference as string,
  institution: name as string,
  bilingual: Boolean(bilingual)
}));

const cjflTeams: CampusTeam[] = ([
  ["cjfl-calgary", "Calgary Colts", "calgary-colts", "Calgary", "ca-ab", "BC Conference"],
  ["cjfl-edmonton-h", "Edmonton Huskies", "edmonton-huskies", "Edmonton", "ca-ab", "BC Conference"],
  ["cjfl-edmonton-w", "Edmonton Wildcats", "edmonton-wildcats", "Edmonton", "ca-ab", "BC Conference"],
  ["cjfl-hamilton", "Hamilton Hurricanes", "hamilton-hurricanes", "Hamilton", "ca-on", "Prairie Conference"],
  ["cjfl-kamloops", "Kamloops Broncos", "kamloops-broncos", "Kamloops", "ca-bc", "BC Conference"],
  ["cjfl-langley", "Langley Rams", "langley-rams", "Langley", "ca-bc", "BC Conference"],
  ["cjfl-london", "London Beefeaters", "london-beefeaters", "London", "ca-on", "Prairie Conference"],
  ["cjfl-okanagan", "Okanagan Sun", "okanagan-sun", "Kelowna", "ca-bc", "BC Conference"],
  ["cjfl-ottawa", "Ottawa Sooners", "ottawa-sooners", "Ottawa", "ca-on", "Prairie Conference"],
  ["cjfl-princegeorge", "Prince George Kodiaks", "prince-george-kodiaks", "Prince George", "ca-bc", "BC Conference"],
  ["cjfl-quinte", "Quinte Skyhawks", "quinte-skyhawks", "Belleville", "ca-on", "Prairie Conference"],
  ["cjfl-regina", "Regina Thunder", "regina-thunder", "Regina", "ca-sk", "Prairie Conference"],
  ["cjfl-saskatoon", "Saskatoon Hilltops", "saskatoon-hilltops", "Saskatoon", "ca-sk", "Prairie Conference"],
  ["cjfl-saultstemare", "Sault Ste. Marie Cougars", "sault-ste-marie-cougars", "Sault Ste. Marie", "ca-on", "Prairie Conference"],
  ["cjfl-stclair", "St. Clair Saints", "st-clair-saints", "Windsor", "ca-on", "Prairie Conference"],
  ["cjfl-valley", "Valley Huskers", "valley-huskers", "Chilliwack", "ca-bc", "BC Conference"],
  ["cjfl-vancouverisland", "Vancouver Island Raiders", "vancouver-island-raiders", "Nanaimo", "ca-bc", "BC Conference"],
  ["cjfl-westshore", "Westshore Rebels", "westshore-rebels", "Langford", "ca-bc", "BC Conference"],
  ["cjfl-winnipeg", "Winnipeg Rifles", "winnipeg-rifles", "Winnipeg", "ca-mb", "Prairie Conference"]
] satisfies CampusTeamTuple[]).map(([id, name, slug, city, regionId, conference]) => ({
  id: id as string,
  name: name as string,
  slug: slug as string,
  leagueId: "cjfl",
  city: city as string,
  country: "Canada",
  regionId: regionId as string,
  conference: conference as string,
  institution: name as string
}));

const bucsTeams: CampusTeam[] = ([
  ["bucs-brunel", "Brunel Burners", "brunel-burners", "Uxbridge", "gb-eng"],
  ["bucs-cardiff", "Cardiff Cobras", "cardiff-cobras", "Cardiff", "gb-wal"],
  ["bucs-durham", "Durham Saints", "durham-saints", "Durham", "gb-eng"],
  ["bucs-exeter", "Exeter Demons", "exeter-demons", "Exeter", "gb-eng"],
  ["bucs-leedsbeckett", "Leeds Beckett Carnegie", "leeds-beckett-carnegie", "Leeds", "gb-eng"],
  ["bucs-leeds", "Leeds Gryphons", "leeds-gryphons", "Leeds", "gb-eng"],
  ["bucs-loughborough", "Loughborough Students", "loughborough-students", "Loughborough", "gb-eng"],
  ["bucs-newcastle", "Newcastle Raiders", "newcastle-raiders", "Newcastle upon Tyne", "gb-eng"],
  ["bucs-nottingham", "Nottingham Gold", "nottingham-gold", "Nottingham", "gb-eng"],
  ["bucs-ntu", "Nottingham Trent Renegades", "nottingham-trent-renegades", "Nottingham", "gb-eng"],
  ["bucs-northumbria", "Northumbria Mustangs", "northumbria-mustangs", "Newcastle upon Tyne", "gb-eng"],
  ["bucs-portsmouth", "Portsmouth Destroyers", "portsmouth-destroyers", "Portsmouth", "gb-eng"],
  ["bucs-sgs", "SGS Pride", "sgs-pride", "Filton", "gb-eng"],
  ["bucs-uwe", "UWE Bullets", "uwe-bullets", "Bristol", "gb-eng"],
  ["bucs-warwick", "Warwick Wolves", "warwick-wolves", "Coventry", "gb-eng"]
] satisfies BucsTeamTuple[]).map(([id, name, slug, city, regionId]) => ({
  id: id as string,
  name: name as string,
  slug: slug as string,
  leagueId: "bucs",
  city: city as string,
  country: "United Kingdom",
  regionId: regionId as string,
  institution: name as string
}));

export const campusTeams = [...usportsTeams, ...cjflTeams, ...bucsTeams];
export const campusPipelineIds = ["usports", "cjfl", "bucs"] as const;
export const campusTeamById = new Map(campusTeams.map((team) => [team.id, team]));

export function isCampusPipeline(value: string | null | undefined): value is CampusPipeline {
  return value === "usports" || value === "cjfl" || value === "bucs";
}

export function getCampusTeam(teamId: string | null | undefined) {
  return teamId ? campusTeamById.get(teamId) ?? null : null;
}

export function getCampusTeamsForPipeline(pipeline: CampusPipeline) {
  return campusTeams.filter((team) => team.leagueId === pipeline);
}

export function getCampusConference(teamId: string | null | undefined) {
  return getCampusTeam(teamId)?.conference ?? null;
}

export function isFrenchCanadianCampusTeam(teamId: string | null | undefined) {
  return getCampusTeam(teamId)?.bilingual === true;
}
