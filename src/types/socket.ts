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

export interface LeagueContributionPayload {
  contributionId: string;
  groupId: string;
  groupName: string;
  amountEspees: number;
  amountNaira: number;
  classification: string | null;
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

  "league:contribution": (
    payload: LeagueContributionPayload,
  ) => void;
}
