import type {
  MatchState,
  ScoreCommand,
} from "@/types";

import { matchState } from "@/state";

import {
  calculateLeader,
  calculateTotals,
} from "@/utils";

export class ScoreService {
  record(
    command: ScoreCommand
  ): MatchState {
    const state = matchState.get();

    if (command.team === "phenomenal") {
      this.updatePhenomenal(
        state,
        command
      );
    } else {
      this.updateDynamic(
        state,
        command
      );
    }

    calculateTotals(state);

    state.leader =
      calculateLeader(state);

    matchState.set(state);

    return state;
  }

  private updatePhenomenal(
    state: MatchState,
    command: Extract<
      ScoreCommand,
      { team: "phenomenal" }
    >
  ): void {
    state.phenomenal[
      command.subTeam
    ] += command.points;
  }

  private updateDynamic(
    state: MatchState,
    command: Extract<
      ScoreCommand,
      { team: "dynamic" }
    >
  ): void {
    state.dynamic[
      command.subTeam
    ] += command.points;
  }
}

export const scoreService =
  new ScoreService();