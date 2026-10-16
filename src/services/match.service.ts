import type {
  ScoreCommand,
} from "@/types";

import { matchState } from "@/state";

import { scoreService } from "./score.service";
import { celebrationService } from "./celebration.service";
import { BroadcastService } from "./broadcast.service";

export class MatchService {
  constructor(
    private readonly broadcast: BroadcastService
  ) {}

  recordScore(
    command: ScoreCommand
  ): void {
    const previousState =
      matchState.get();

    const state =
      scoreService.record(command);

    this.broadcast.matchState(
      state
    );

    const celebration =
      celebrationService.create(
        command
      );

    this.broadcast.celebration(
      celebration
    );

    if (
      previousState.leader !==
      state.leader
    ) {
      this.broadcast.leader(
        state.leader
      );
    }
  }

  resetMatch(): void {
    matchState.reset();

    this.broadcast.matchState(
      matchState.get()
    );
  }

  endMatch(): void {
    this.broadcast.matchEnded(
      matchState.get()
    );
  }

  broadcastCurrentState(): void {
    this.broadcast.matchState(
      matchState.get()
    );
  }
}