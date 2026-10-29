import type { Server as HttpServer } from "node:http";
import { Server } from "socket.io";

import { env } from "../config/env";
import { leagueEvents } from "../events/league-events";
import { Group } from "../models/Group";
import { LeagueService } from "../services/league.service";

import type {
  ClientToServerEvents,
  ServerToClientEvents,
} from "@/types/socket";

const allowedOrigins = [
  env.CLIENT_URL,
  "http://localhost:5173",
  "http://127.0.0.1:5173",
];

export function createSocketServer(
  httpServer: HttpServer,
): Server<ClientToServerEvents, ServerToClientEvents> {
  const io = new Server<
    ClientToServerEvents,
    ServerToClientEvents
  >(httpServer, {
    cors: {
      origin: allowedOrigins,
      methods: ["GET", "POST"],
      credentials: true,
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

  leagueEvents.onContributionVerified(async (event) => {
    await broadcastStandings();

    try {
      const [group, classification] = await Promise.all([
        Group.findById(event.groupId)
          .select("name")
          .lean(),

        leagueService.getClassificationForEspees(
          event.amountEspees,
        ),
      ]);

      if (group) {
        io.emit("league:contribution", {
          contributionId: event.contributionId,
          groupId: event.groupId,
          groupName: group.name,
          amountEspees: event.amountEspees,
          amountNaira: event.amountNaira,
          classification,
          updatedAt: new Date().toISOString(),
        });
      }
    } catch (error: unknown) {
      console.error(
        "Failed to broadcast individual contribution:",
        error,
      );
    }

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
