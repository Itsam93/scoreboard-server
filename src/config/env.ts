
import "dotenv/config";

const port = Number(process.env.PORT ?? 5000);
const clientUrl =
  process.env.CLIENT_URL ?? "http://localhost:5174";
const nodeEnv = process.env.NODE_ENV ?? "development";
const mongoUri = process.env.MONGODB_URI?.trim();
const adminApiKey = process.env.ADMIN_API_KEY?.trim();
const managerTokenSecret =
  process.env.MANAGER_TOKEN_SECRET?.trim();

if (!Number.isInteger(port) || port < 1 || port > 65535) {
  throw new Error("PORT must be a valid port number.");
}

if (!mongoUri) {
  throw new Error(
    "MONGODB_URI is required. Configure it in your server environment."
  );
}

if (
  managerTokenSecret &&
  Buffer.byteLength(managerTokenSecret, "utf8") < 32
) {
  throw new Error(
    "MANAGER_TOKEN_SECRET must contain at least 32 bytes."
  );
}

export const env = {
  PORT: port,
  CLIENT_URL: clientUrl,
  NODE_ENV: nodeEnv,
  MONGODB_URI: mongoUri,
  ADMIN_API_KEY: adminApiKey,
  MANAGER_TOKEN_SECRET: managerTokenSecret,
} as const;
