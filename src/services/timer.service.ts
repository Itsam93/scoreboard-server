import {
  MATCH_STATUS,
  TIMER_STATUS,
} from "@/types";

import { matchState } from "@/state";

import { BroadcastService } from "./broadcast.service";

export class TimerService {
  private interval?: NodeJS.Timeout;

  constructor(
    private readonly broadcast: BroadcastService
  ) {}

  start(): void {
    const state = matchState.get();

    if (
      state.timer.status ===
      TIMER_STATUS.RUNNING
    ) {
      return;
    }

    state.timer.status =
      TIMER_STATUS.RUNNING;

    state.status =
      MATCH_STATUS.IN_PROGRESS;

    matchState.set(state);

    this.broadcast.matchState(state);

    this.startInterval();
  }

  pause(): void {
    const state = matchState.get();

    if (
      state.timer.status !==
      TIMER_STATUS.RUNNING
    ) {
      return;
    }

    state.timer.status =
      TIMER_STATUS.PAUSED;

    matchState.set(state);

    this.stopInterval();

    this.broadcast.matchState(state);
  }

  resume(): void {
    const state = matchState.get();

    if (
      state.timer.status ===
      TIMER_STATUS.RUNNING
    ) {
      return;
    }

    if (
      state.status ===
      MATCH_STATUS.FINISHED
    ) {
      return;
    }

    state.timer.status =
      TIMER_STATUS.RUNNING;

    matchState.set(state);

    this.broadcast.matchState(state);

    this.startInterval();
  }

  reset(): void {
    const state = matchState.get();

    state.timer.minutes = 0;
    state.timer.seconds = 0;

    state.timer.status =
      TIMER_STATUS.NOT_STARTED;

    state.status =
      MATCH_STATUS.NOT_STARTED;

    matchState.set(state);

    this.stopInterval();

    this.broadcast.matchState(state);
  }

  private startInterval(): void {
    this.stopInterval();

    this.interval = setInterval(() => {
      const state =
        matchState.get();

      state.timer.seconds++;

      if (
        state.timer.seconds >=
        60
      ) {
        state.timer.seconds = 0;
        state.timer.minutes++;
      }

      matchState.set(state);

      this.broadcast.matchState(
        state
      );
    }, 1000);
  }

  private stopInterval(): void {
    if (!this.interval) {
      return;
    }

    clearInterval(
      this.interval
    );

    this.interval = undefined;
  }
}