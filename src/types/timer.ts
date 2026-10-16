export const TIMER_STATUS = {
  NOT_STARTED: "not_started",
  RUNNING: "running",
  PAUSED: "paused",
  FINISHED: "finished",
} as const;

export type TimerStatus =
  typeof TIMER_STATUS[keyof typeof TIMER_STATUS];

export interface MatchTimer {
  minutes: number;
  seconds: number;
  status: TimerStatus;
}