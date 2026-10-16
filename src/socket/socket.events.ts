export const SOCKET_EVENTS = {
  CONNECT: "connect",
  DISCONNECT: "disconnect",

  MATCH_STATE: "match:state",

  SCORE_RECORD: "score:record",

  CELEBRATION_START: "celebration:start",

  LEADER_CHANGED: "leader:changed",

  MATCH_RESET: "match:reset",

  MATCH_END: "match:end",

  TIMER_START: "timer:start",

  TIMER_PAUSE: "timer:pause",

  TIMER_RESUME: "timer:resume",

  TIMER_RESET: "timer:reset",
} as const;