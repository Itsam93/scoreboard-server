
import { timingSafeEqual } from "node:crypto";
import type { RequestHandler } from "express";

import { env } from "../config/env";

export const requireAdminApiKey: RequestHandler = (
  req,
  res,
  next
) => {
  const configuredKey = env.ADMIN_API_KEY;

  if (!configuredKey) {
    res.status(503).json({
      success: false,
      message: "Admin API is not configured.",
    });
    return;
  }

  const suppliedKey = req.get("x-admin-key");

  if (!suppliedKey) {
    res.status(401).json({
      success: false,
      message: "Admin authentication is required.",
    });
    return;
  }

  const expected = Buffer.from(configuredKey);
  const actual = Buffer.from(suppliedKey);

  if (
    expected.length !== actual.length ||
    !timingSafeEqual(expected, actual)
  ) {
    res.status(401).json({
      success: false,
      message: "Invalid admin credentials.",
    });
    return;
  }

  next();
};
