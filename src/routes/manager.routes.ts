import { Router, type Request } from "express";
import mongoose from "mongoose";
import { z } from "zod";

import { Group } from "../models/Group";
import { Contribution } from "../models/Contribution";
import { GroupManagerService } from "../services/group-manager.service";
import { ContributionService } from "../services/contribution.service";
import { requireGroupManager } from "../middleware/group-manager-auth";

const router = Router();

const groupManagerService = new GroupManagerService();
const contributionService = new ContributionService();

const loginSchema = z.object({
  username: z.string().trim().min(3).max(60),
  password: z.string().min(1).max(1024),
});

const createContributionSchema = z
  .object({
    groupId: z.string().trim().min(1),
    amountNaira: z.number().finite().positive().optional(),
    amountEspees: z.number().finite().positive().optional(),
    reference: z.string().trim().max(160).optional(),
    note: z.string().trim().max(1000).optional(),
  })
  .refine(
    (data) =>
      (data.amountNaira !== undefined) !==
      (data.amountEspees !== undefined),
    {
      message:
        "Provide either a Naira amount or an Espees amount, but not both.",
    },
  );

function getManagerId(req: Request): string {
  if (!req.groupManager) {
    throw new Error(
      "Authenticated Group Manager context is missing.",
    );
  }

  return req.groupManager.id;
}

/**
 * POST /api/manager/login
 *
 * Public login endpoint for Group Managers.
 */
router.post("/login", async (req, res, next) => {
  const parsed = loginSchema.safeParse(req.body);

  if (!parsed.success) {
    res.status(400).json({
      success: false,
      message: "Enter a valid username and password.",
      errors: parsed.error.issues,
    });
    return;
  }

  try {
    const result = await groupManagerService.login(
      parsed.data.username,
      parsed.data.password,
    );

    res.status(200).json({
      success: true,
      message: "Login successful.",
      data: result,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * All routes below this point require an authenticated,
 * active Group Manager.
 */
router.use(requireGroupManager);

/**
 * GET /api/manager/me
 *
 * Return the authenticated manager and assigned active groups.
 */
router.get("/me", async (req, res, next) => {
  try {
    const manager = req.groupManager!;

    const validGroupIds = manager.groupIds.filter((id) =>
      mongoose.isValidObjectId(id),
    );

    const groups = await Group.find({
      _id: { $in: validGroupIds },
      isActive: true,
    })
      .populate("zoneId", "name")
      .select("name zoneId description")
      .sort({ name: 1 })
      .lean();

    res.status(200).json({
      success: true,
      data: {
        id: manager.id,
        fullName: manager.fullName,
        username: manager.username,
        groups,
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/manager/groups
 *
 * Return only the manager's assigned active groups.
 */
router.get("/groups", async (req, res, next) => {
  try {
    const manager = req.groupManager!;

    const validGroupIds = manager.groupIds.filter((id) =>
      mongoose.isValidObjectId(id),
    );

    const groups = await Group.find({
      _id: { $in: validGroupIds },
      isActive: true,
    })
      .populate("zoneId", "name")
      .select("name zoneId description")
      .sort({ name: 1 })
      .lean();

    res.status(200).json({
      success: true,
      count: groups.length,
      data: groups,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/manager/contributions
 *
 * Return contribution history for the manager's assigned groups.
 * An optional groupId query parameter filters the history.
 * Reversed records remain visible for audit purposes.
 */
router.get("/contributions", async (req, res, next) => {
  try {
    const manager = req.groupManager!;
    const rawGroupId = req.query.groupId;

    if (
      rawGroupId !== undefined &&
      typeof rawGroupId !== "string"
    ) {
      res.status(400).json({
        success: false,
        message: "Invalid group ID filter.",
      });
      return;
    }

    if (
      typeof rawGroupId === "string" &&
      !mongoose.isValidObjectId(rawGroupId)
    ) {
      res.status(400).json({
        success: false,
        message: "Invalid group ID.",
      });
      return;
    }

    const assignedGroupIds = manager.groupIds.filter((id) =>
      mongoose.isValidObjectId(id),
    );

    if (
      typeof rawGroupId === "string" &&
      !assignedGroupIds.includes(rawGroupId)
    ) {
      res.status(403).json({
        success: false,
        message: "You are not assigned to this group.",
      });
      return;
    }

    const groupIds =
      typeof rawGroupId === "string"
        ? [rawGroupId]
        : assignedGroupIds;

    const contributions = await Contribution.find({
      groupId: { $in: groupIds },
    })
      .populate("groupId", "name zoneId")
      .populate("zoneId", "name")
      .populate("recordedByManagerId", "fullName username")
      .populate("reversedByManagerId", "fullName username")
      .sort({ createdAt: -1 })
      .lean();

    res.status(200).json({
      success: true,
      count: contributions.length,
      data: contributions,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/manager/contributions
 *
 * Record a giving for an assigned group.
 * Exactly one of amountNaira or amountEspees must be supplied.
 * The contribution service enforces group authorization,
 * calculates the conversion, and records the manager audit data.
 */
router.post("/contributions", async (req, res, next) => {
  const parsed = createContributionSchema.safeParse(req.body);

  if (!parsed.success) {
    res.status(400).json({
      success: false,
      message: "Invalid contribution data.",
      errors: parsed.error.issues,
    });
    return;
  }

  try {
    const contribution = await contributionService.create(
      parsed.data,
      {
        role: "groupManager",
        managerId: getManagerId(req),
      },
    );

    res.status(201).json({
      success: true,
      message: "Giving recorded successfully.",
      data: contribution,
    });
  } catch (error) {
    next(error);
  }
});

export default router;