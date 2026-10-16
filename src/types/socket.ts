
import type { LeagueService } from "../services/league.service";

export type LeagueStandings = Awaited<
  ReturnType<LeagueService["getStandings"]>
>;

export interface LeagueStandingsPayload {
  standings: LeagueStandings;
  updatedAt: string;
}

export interface LeagueUpdatedPayload {
  updatedAt: string;
}

export type ClientToServerEvents = Record<never, never>;

export interface ServerToClientEvents {
  "league:standings": (
    payload: LeagueStandingsPayload,
  ) => void;

  "league:updated": (
    payload: LeagueUpdatedPayload,
  ) => void;
}
