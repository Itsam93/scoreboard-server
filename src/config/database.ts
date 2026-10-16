
import mongoose from "mongoose";

import { env } from "./env";

let connectionPromise: Promise<typeof mongoose> | null = null;

export async function connectDatabase(): Promise<void> {
  if (mongoose.connection.readyState === 1) {
    return;
  }

  if (connectionPromise) {
    await connectionPromise;
    return;
  }

  connectionPromise = mongoose.connect(env.MONGODB_URI, {
    serverSelectionTimeoutMS: 10000,
  });

  try {
    await connectionPromise;

    console.log("MongoDB connected successfully.");
  } catch (error) {
    connectionPromise = null;
    throw error;
  }
}

export async function disconnectDatabase(): Promise<void> {
  connectionPromise = null;

  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
    console.log("MongoDB disconnected.");
  }
}

export function isDatabaseConnected(): boolean {
  return mongoose.connection.readyState === 1;
}
