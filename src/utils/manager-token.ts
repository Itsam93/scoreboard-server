import {
  createHmac,
  timingSafeEqual,
} from "node:crypto";

import { env } from "../config/env";

const TOKEN_ISSUER = "church-contribution-league";
const TOKEN_AUDIENCE = "church-contribution-league-managers";
const TOKEN_LIFETIME_SECONDS = 60 * 60;
const CLOCK_SKEW_SECONDS = 30;

interface ManagerTokenPayload {
  sub: string;
  role: "groupManager";
  iat: number;
  exp: number;
  iss: string;
  aud: string;
}

export class ManagerTokenError extends Error {
  constructor(message = "Invalid or expired manager token.") {
    super(message);
    this.name = "ManagerTokenError";
  }
}

function getSecret(): string {
  const secret = env.MANAGER_TOKEN_SECRET;

  if (!secret || Buffer.byteLength(secret, "utf8") < 32) {
    throw new Error(
      "MANAGER_TOKEN_SECRET must be configured with at least 32 bytes.",
    );
  }

  return secret;
}

function encodeBase64Url(value: string | Buffer): string {
  return Buffer.from(value).toString("base64url");
}

function sign(unsignedToken: string): Buffer {
  return createHmac("sha256", getSecret())
    .update(unsignedToken)
    .digest();
}

export function createManagerToken(
  managerId: string,
): string {
  if (!/^[a-f\d]{24}$/i.test(managerId)) {
    throw new Error("A valid manager ID is required.");
  }

  const now = Math.floor(Date.now() / 1000);

  const header = {
    alg: "HS256",
    typ: "JWT",
  };

  const payload: ManagerTokenPayload = {
    sub: managerId,
    role: "groupManager",
    iat: now,
    exp: now + TOKEN_LIFETIME_SECONDS,
    iss: TOKEN_ISSUER,
    aud: TOKEN_AUDIENCE,
  };

  const unsignedToken = [
    encodeBase64Url(JSON.stringify(header)),
    encodeBase64Url(JSON.stringify(payload)),
  ].join(".");

  const signature = sign(unsignedToken).toString("base64url");

  return `${unsignedToken}.${signature}`;
}

export function verifyManagerToken(
  token: string,
): ManagerTokenPayload {
  if (
    typeof token !== "string" ||
    token.length > 4096
  ) {
    throw new ManagerTokenError();
  }

  const parts = token.split(".");

  if (parts.length !== 3) {
    throw new ManagerTokenError();
  }

  const [encodedHeader, encodedPayload, encodedSignature] =
    parts;

  try {
    const header = JSON.parse(
      Buffer.from(encodedHeader, "base64url").toString("utf8"),
    ) as Record<string, unknown>;

    if (header.alg !== "HS256" || header.typ !== "JWT") {
      throw new ManagerTokenError();
    }

    const unsignedToken = `${encodedHeader}.${encodedPayload}`;
    const expectedSignature = sign(unsignedToken);
    const suppliedSignature = Buffer.from(
      encodedSignature,
      "base64url",
    );

    if (
      suppliedSignature.length !== expectedSignature.length ||
      !timingSafeEqual(suppliedSignature, expectedSignature)
    ) {
      throw new ManagerTokenError();
    }

    const payload = JSON.parse(
      Buffer.from(encodedPayload, "base64url").toString("utf8"),
    ) as Partial<ManagerTokenPayload>;

    const now = Math.floor(Date.now() / 1000);

    if (
      typeof payload.sub !== "string" ||
      !/^[a-f\d]{24}$/i.test(payload.sub) ||
      payload.role !== "groupManager" ||
      typeof payload.iat !== "number" ||
      typeof payload.exp !== "number" ||
      payload.iss !== TOKEN_ISSUER ||
      payload.aud !== TOKEN_AUDIENCE ||
      !Number.isSafeInteger(payload.iat) ||
      !Number.isSafeInteger(payload.exp) ||
      payload.iat > now + CLOCK_SKEW_SECONDS ||
      payload.exp <= now ||
      payload.exp <= payload.iat ||
      payload.exp - payload.iat > TOKEN_LIFETIME_SECONDS
    ) {
      throw new ManagerTokenError();
    }

    return payload as ManagerTokenPayload;
  } catch (error) {
    if (error instanceof ManagerTokenError) {
      throw error;
    }

    throw new ManagerTokenError();
  }
}
