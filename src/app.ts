
import express, {
  type NextFunction,
  type Request,
  type Response,
} from "express";
import cors from "cors";
import mongoose from "mongoose";

import { env } from "./config/env";
import { requireAdminApiKey } from "./middleware/admin-api-key";

import { ContributionServiceError } from "./services/contribution.service";

import adminRoutes from "./routes/admin.routes";
import leagueRoutes from "./routes/league.routes";
import zonesRoutes from "./routes/zones.routes";
import groupsRoutes from "./routes/groups.routes";
import classificationsRoutes from "./routes/classifications.routes";

const app = express();

app.disable("x-powered-by");

const allowedOrigins = new Set([
  env.CLIENT_URL,
  "http://localhost:5173",
  "http://127.0.0.1:5173",
]);

app.use(
  cors({
    origin(origin, callback) {
      // Allow requests without an Origin header, such as server-to-server calls.
      if (!origin || allowedOrigins.has(origin)) {
        callback(null, true);
        return;
      }

      callback(new Error(`Origin not allowed by CORS: ${origin}`));
    },
    credentials: true,
    methods: ["GET", "POST", "PATCH", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: [
      "Content-Type",
      "Authorization",
      "x-admin-key",
    ],
  })
);

app.use(express.json({ limit: "100kb" }));

app.use(
  express.urlencoded({
    extended: true,
    limit: "100kb",
  })
);

/**
 * Public routes
 */

app.get("/", (_req, res) => {
  res.json({
    name: "Church Contribution League API",
    version: "1.0.0",
    status: "running",
    database:
      mongoose.connection.readyState === 1
        ? "connected"
        : "disconnected",
  });
});

app.get("/health", (_req, res) => {
  const databaseConnected =
    mongoose.connection.readyState === 1;

  res.status(databaseConnected ? 200 : 503).json({
    success: databaseConnected,
    status: databaseConnected ? "OK" : "DATABASE_UNAVAILABLE",
    database: databaseConnected ? "connected" : "disconnected",
    environment: env.NODE_ENV,
    timestamp: new Date().toISOString(),
  });
});

app.use("/api/league", leagueRoutes);

/**
 * Protected admin routes
 */

app.use(
  "/api/admin",
  requireAdminApiKey,
  adminRoutes
);

app.use(
  "/api/admin/zones",
  requireAdminApiKey,
  zonesRoutes
);

app.use(
  "/api/admin/groups",
  requireAdminApiKey,
  groupsRoutes
);

app.use(
  "/api/admin/classifications",
  requireAdminApiKey,
  classificationsRoutes
);

/**
 * Handle unknown routes
 */

app.use((_req, res) => {
  res.status(404).json({
    success: false,
    message: "API route not found.",
  });
});

/**
 * Centralized error handling
 */

app.use(
  (
    error: unknown,
    _req: Request,
    res: Response,
    _next: NextFunction
  ) => {
    if (error instanceof ContributionServiceError) {
      res.status(error.statusCode).json({
        success: false,
        message: error.message,
      });
      return;
    }

    if (error instanceof mongoose.Error.ValidationError) {
      res.status(400).json({
        success: false,
        message: "Database validation failed.",
      });
      return;
    }

    if (error instanceof mongoose.Error.CastError) {
      res.status(400).json({
        success: false,
        message: "Invalid resource identifier or field value.",
      });
      return;
    }

    if (
      error instanceof SyntaxError &&
      "status" in error &&
      error.status === 400
    ) {
      res.status(400).json({
        success: false,
        message: "Invalid JSON request body.",
      });
      return;
    }

    console.error("Unhandled API error:", error);

    res.status(500).json({
      success: false,
      message: "An unexpected server error occurred.",
    });
  }
);

export default app;
