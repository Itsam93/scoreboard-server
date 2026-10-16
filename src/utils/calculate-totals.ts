import type { MatchState } from "@/types";

export function calculateTotals(
  state: MatchState
): void {
  state.phenomenal.total =
    state.phenomenal.women +
    state.phenomenal.sisters;

  state.dynamic.total =
    state.dynamic.men +
    state.dynamic.brothers;
}