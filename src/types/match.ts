import type {
  DynamicScore,
  PhenomenalScore,
  TeamId,
} from "./team";

import type {
  MatchTimer,
} from "./timer";

export const MATCH_STATUS = {
  NOT_STARTED: "not_started",
  IN_PROGRESS: "in_progress",
  FINISHED: "finished",
} as const;

export type MatchStatus =
  typeof MATCH_STATUS[keyof typeof MATCH_STATUS];

export type MatchLeader =
  | TeamId
  | "draw";

export interface MatchState {
  phenomenal: PhenomenalScore;

  dynamic: DynamicScore;

  leader: MatchLeader;

  timer: MatchTimer;

  status: MatchStatus;
}