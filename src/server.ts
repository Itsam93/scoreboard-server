
import "dotenv/config";

import { createServer } from "node:http";
import mongoose from "mongoose";

import app from "./app";
import { env } from "./config/env";
import {
  connectDatabase,
  disconnectDatabase,
} from "./config/database";
import { createSocketServer } from "./socket";

const httpServer = createServer(app);
const io = createSocketServer(httpServer);

let isShuttingDown = false;

async function startServer(): Promise<void> {
  await connectDatabase();

  await new Promise<void>((resolve, reject) => {
    const onError = (error: Error) => {
      httpServer.off("listening", onListening);
      reject(error);
    };

    const onListening = () => {
      httpServer.off("error", onError);
      resolve();
    };

    httpServer.once("error", onError);
    httpServer.once("listening", onListening);

    httpServer.listen(env.PORT);
  });

  console.log("");
  console.log("======================================");
  console.log(" Church Contribution League Server");
  console.log(` Environment : ${env.NODE_ENV}`);
  console.log(` Listening   : http://localhost:${env.PORT}`);
  console.log(` Database    : ${mongoose.connection.name}`);
  console.log("======================================");
  console.log("");
}

async function shutdown(signal: string): Promise<void> {
  if (isShuttingDown) {
    return;
  }

  isShuttingDown = true;

  console.log(`Shutting down server (${signal})...`);

  const forceExit = setTimeout(() => {
    console.error("Graceful shutdown timed out.");
    process.exit(1);
  }, 10000);

  forceExit.unref();

  try {
    if (httpServer.listening) {
      await new Promise<void>((resolve, reject) => {
        httpServer.close((error) => {
          if (error) {
            reject(error);
            return;
          }

          resolve();
        });
      });
    }

    await new Promise<void>((resolve) => {
      io.close(() => resolve());
    });

    await disconnectDatabase();

    clearTimeout(forceExit);

    console.log("Server shutdown completed.");
    process.exitCode = 0;
  } catch (error: unknown) {
    clearTimeout(forceExit);

    console.error("Error during server shutdown:", error);
    process.exitCode = 1;
  }
}

process.once("SIGINT", () => {
  void shutdown("SIGINT");
});

process.once("SIGTERM", () => {
  void shutdown("SIGTERM");
});

startServer().catch(async (error: unknown) => {
  console.error("Failed to start the server:", error);

  try {
    io.close();
    await disconnectDatabase();
  } catch (disconnectError: unknown) {
    console.error(
      "Failed to clean up server resources:",
      disconnectError,
    );
  }

  process.exitCode = 1;
});
