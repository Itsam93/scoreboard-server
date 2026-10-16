import type { Server } from "socket.io";

import type {
  Celebration,
  MatchLeader,
  MatchState,
} from "@/types";

import { SOCKET_EVENTS } from "@/socket";

export class BroadcastService {
  constructor(
    private readonly io: Server
  ) {}

  matchState(
    state: MatchState
  ): void {
    this.io.emit(
      SOCKET_EVENTS.MATCH_STATE,
      state
    );
  }

  celebration(
    celebration: Celebration
  ): void {
    this.io.emit(
      SOCKET_EVENTS.CELEBRATION_START,
      celebration
    );
  }

  leader(
    leader: MatchLeader
  ): void {
    this.io.emit(
      SOCKET_EVENTS.LEADER_CHANGED,
      leader
    );
  }

  matchEnded(
    state: MatchState
  ): void {
    this.io.emit(
      SOCKET_EVENTS.MATCH_END,
      state
    );
  }
}