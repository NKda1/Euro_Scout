export const routes = {
  home: "/",
  leagues: "/leagues",
  league: (leagueId: string) => `/leagues/${leagueId}`,
  team: (teamId: string) => `/teams/${teamId}`
} as const;
