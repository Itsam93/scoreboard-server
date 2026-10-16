
import type { Server as HttpServer } from "node:http";
import { Server } from "socket.io";

import { env } from "@/config/env";
import { leagueEvents } from "@/events/league-events";
import { LeagueService } from "@/services/league.service";

import type {
  ClientToServerEvents,
  ServerToClientEvents,
} from "@/types/socket";

export function createSocketServer(
  httpServer: HttpServer,
): Server<ClientToServerEvents, ServerToClientEvents> {
  const io = new Server<
    ClientToServerEvents,
    ServerToClientEvents
  >(httpServer, {
    cors: {
      origin: env.CLIENT_URL,
      methods: ["GET"],
    },
  });

  const leagueService = new LeagueService();

  async function broadcastStandings(): Promise<void> {
    try {
      const standings = await leagueService.getStandings();

      io.emit("league:standings", {
        standings,
        updatedAt: new Date().toISOString(),
      });
    } catch (error: unknown) {
      console.error(
        "Failed to broadcast league standings:",
        error,
      );
    }
  }

  leagueEvents.onContributionVerified(async () => {
    await broadcastStandings();

    io.emit("league:updated", {
      updatedAt: new Date().toISOString(),
    });
  });

  io.on("connection", (socket) => {
    console.log(`League scoreboard connected: ${socket.id}`);

    void broadcastStandings();

    socket.on("disconnect", () => {
      console.log(`League scoreboard disconnected: ${socket.id}`);
    });
  });

  return io;
}
