import type {
  Request,
  RequestHandler,
} from "express";
import mongoose from "mongoose";

import { GroupManager } from "../models/GroupManager";
import { verifyManagerToken } from "../utils/manager-token";

export interface AuthenticatedGroupManager {
  id: string;
  fullName: string;
  username: string;
  groupIds: string[];
}

declare global {
  namespace Express {
    interface Request {
      groupManager?: AuthenticatedGroupManager;
    }
  }
}

export const requireGroupManager: RequestHandler = async (
  req: Request,
  res,
  next,
) => {
  const authorization = req.get("authorization");

  if (!authorization?.startsWith("Bearer ")) {
    res.status(401).json({
      success: false,
      message: "Group Manager authentication is required.",
    });
    return;
  }

  const token = authorization.slice("Bearer ".length).trim();

  if (!token) {
    res.status(401).json({
      success: false,
      message: "Group Manager authentication is required.",
    });
    return;
  }

  let payload;

  try {
    payload = verifyManagerToken(token);
  } catch {
    res.status(401).json({
      success: false,
      message: "Invalid or expired access token.",
    });
    return;
  }

  try {
    const manager = await GroupManager.findOne({
      _id: payload.sub,
      isActive: true,
    })
      .select("fullName username groupIds")
      .lean();

    if (!manager) {
      res.status(401).json({
        success: false,
        message:
          "This Group Manager account is inactive or no longer exists.",
      });
      return;
    }

    req.groupManager = {
      id: manager._id.toString(),
      fullName: manager.fullName,
      username: manager.username,
      groupIds: manager.groupIds.map(
        (groupId: mongoose.Types.ObjectId) =>
          groupId.toString(),
      ),
    };

    next();
  } catch (error) {
    next(error);
  }
};
