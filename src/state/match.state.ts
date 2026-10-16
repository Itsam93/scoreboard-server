import type { MatchState } from "@/types";

import { createInitialMatchState } from "./initial-state";

export class MatchStateStore {
  private state: MatchState =
    createInitialMatchState();

  get(): MatchState {
    return structuredClone(this.state);
  }

  set(state: MatchState): void {
    this.state = structuredClone(state);
  }

  reset(): void {
    this.state =
      createInitialMatchState();
  }
}

export const matchState =
  new MatchStateStore();