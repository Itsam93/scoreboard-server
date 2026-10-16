import type {
  MatchLeader,
  MatchState,
} from "@/types";

export function calculateLeader(
  state: MatchState
): MatchLeader {
  if (
    state.phenomenal.total >
    state.dynamic.total
  ) {
    return "phenomenal";
  }

  if (
    state.dynamic.total >
    state.phenomenal.total
  ) {
    return "dynamic";
  }

  return "draw";
}