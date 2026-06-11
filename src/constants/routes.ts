export const routes = {
  home: "/",
  leagues: "/leagues",
  teams: "/teams",
  players: "/players",
  campusToPro: "/campus-to-pro",
  news: "/news",
  scouts: "/scouts",
  admin: "/admin",
  dashboard: "/dashboard",
  account: "/account",
  messages: "/messages",
  profiles: "/profiles",
  signIn: "/auth/sign-in",
  league: (leagueId: string) => `/leagues/${leagueId}`,
  team: (teamId: string) => `/teams/${teamId}`,
  scout: (teamId: string) => `/scouts/${teamId}`,
  player: (profileId: string) => `/players/${profileId}`
} as const;
