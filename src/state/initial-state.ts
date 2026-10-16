import {
  MATCH_STATUS,
  TIMER_STATUS,
  type MatchState,
  type MatchTimer,
} from "@/types";

function createInitialTimer(): MatchTimer {
  return {
    minutes: 0,
    seconds: 0,
    status: TIMER_STATUS.NOT_STARTED,
  };
}

export function createInitialMatchState(): MatchState {
  return {
    phenomenal: {
      women: 0,
      sisters: 0,
      total: 0,
    },

    dynamic: {
      men: 0,
      brothers: 0,
      total: 0,
    },

    leader: "draw",

    timer: createInitialTimer(),

    status: MATCH_STATUS.NOT_STARTED,
  };
}