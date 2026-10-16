import { Router } from "express";
import mongoose from "mongoose";
import { z } from "zod";

import { Group } from "../models/Group";
import { Zone } from "../models/Zone";

const router = Router();

const createGroupSchema = z.object({
  name: z.string().trim().min(1).max(160),
  zoneId: z.string().trim().min(1),
  description: z.string().trim().max(500).optional(),
});

const updateGroupSchema = z
  .object({
    name: z.string().trim().min(1).max(160).optional(),
    zoneId: z.string().trim().min(1).optional(),
    description: z.string().trim().max(500).optional(),
  })
  .refine(
    (data) =>
      data.name !== undefined ||
      data.zoneId !== undefined ||
      data.description !== undefined,
    {
      message: "Provide at least one field to update.",
    }
  );

const groupStatusSchema = z.object({
  isActive: z.boolean(),
});

/**
 * GET /api/admin/groups
 *
 * Retrieve groups, optionally filtered by zone and activation status.
 *
 * Query parameters:
 * - zoneId: MongoDB zone ID
 * - active: true | false
 */
router.get("/", async (req, res) => {
  const filter: Record<string, unknown> = {};

  if (req.query.zoneId !== undefined) {
    const zoneId = String(req.query.zoneId);

    if (!mongoose.isValidObjectId(zoneId)) {
      res.status(400).json({
        success: false,
        message: "Invalid zone ID.",
      });
      return;
    }

    filter.zoneId = zoneId;
  }

  if (req.query.active === "true") {
    filter.isActive = true;
  } else if (req.query.active === "false") {
    filter.isActive = false;
  }

  const groups = await Group.find(filter)
    .populate("zoneId", "name")
    .sort({ name: 1 })
    .lean();

  res.json({
    success: true,
    count: groups.length,
    data: groups,
  });
});

/**
 * GET /api/admin/groups/:groupId
 *
 * Retrieve a single group.
 */
router.get("/:groupId", async (req, res) => {
  const { groupId } = req.params;

  if (!mongoose.isValidObjectId(groupId)) {
    res.status(400).json({
      success: false,
      message: "Invalid group ID.",
    });
    return;
  }

  const group = await Group.findById(groupId)
    .populate("zoneId", "name")
    .lean();

  if (!group) {
    res.status(404).json({
      success: false,
      message: "Group not found.",
    });
    return;
  }

  res.json({
    success: true,
    data: group,
  });
});

/**
 * POST /api/admin/groups
 *
 * Create a group within an existing active zone.
 */
router.post("/", async (req, res) => {
  const parsed = createGroupSchema.safeParse(req.body);

  if (!parsed.success) {
    res.status(400).json({
      success: false,
      message: "Invalid group data.",
      errors: parsed.error.issues,
    });
    return;
  }

  const { name, zoneId, description } = parsed.data;

  if (!mongoose.isValidObjectId(zoneId)) {
    res.status(400).json({
      success: false,
      message: "Invalid zone ID.",
    });
    return;
  }

  const zone = await Zone.findOne({
    _id: zoneId,
    isActive: true,
  }).lean();

  if (!zone) {
    res.status(404).json({
      success: false,
      message: "The selected zone does not exist or is inactive.",
    });
    return;
  }

  const existing = await Group.findOne({
    zoneId: zone._id,
    name,
  }).lean();

  if (existing) {
    res.status(409).json({
      success: false,
      message: "This group already exists in the selected zone.",
    });
    return;
  }

  const group = await Group.create({
    name,
    zoneId: zone._id,
    description: description ?? "",
  });

  const populatedGroup = await Group.findById(group._id)
    .populate("zoneId", "name")
    .lean();

  res.status(201).json({
    success: true,
    message: "Group created successfully.",
    data: populatedGroup,
  });
});

/**
 * PATCH /api/admin/groups/:groupId
 *
 * Update a group's name, zone, or description.
 * Only supplied fields are changed.
 */
router.patch("/:groupId", async (req, res) => {
  const { groupId } = req.params;

  if (!mongoose.isValidObjectId(groupId)) {
    res.status(400).json({
      success: false,
      message: "Invalid group ID.",
    });
    return;
  }

  const parsed = updateGroupSchema.safeParse(req.body);

  if (!parsed.success) {
    res.status(400).json({
      success: false,
      message: "Invalid group update data.",
      errors: parsed.error.issues,
    });
    return;
  }

  const existingGroup = await Group.findById(groupId);

  if (!existingGroup) {
    res.status(404).json({
      success: false,
      message: "Group not found.",
    });
    return;
  }

  const updates = parsed.data;

  const targetZoneId = updates.zoneId ?? String(existingGroup.zoneId);

  if (!mongoose.isValidObjectId(targetZoneId)) {
    res.status(400).json({
      success: false,
      message: "Invalid zone ID.",
    });
    return;
  }

  if (updates.zoneId !== undefined) {
    const zone = await Zone.findOne({
      _id: targetZoneId,
      isActive: true,
    }).lean();

    if (!zone) {
      res.status(404).json({
        success: false,
        message: "The selected zone does not exist or is inactive.",
      });
      return;
    }
  }

  const targetName = updates.name ?? existingGroup.name;

  const duplicate = await Group.findOne({
    _id: { $ne: existingGroup._id },
    zoneId: targetZoneId,
    name: targetName,
  }).lean();

  if (duplicate) {
    res.status(409).json({
      success: false,
      message: "This group already exists in the selected zone.",
    });
    return;
  }

  if (updates.name !== undefined) {
    existingGroup.name = updates.name;
  }

  if (updates.zoneId !== undefined) {
    existingGroup.zoneId = new mongoose.Types.ObjectId(
      updates.zoneId
    );
  }

  if (updates.description !== undefined) {
    existingGroup.description = updates.description;
  }

  await existingGroup.save();

  const updatedGroup = await Group.findById(existingGroup._id)
    .populate("zoneId", "name")
    .lean();

  res.json({
    success: true,
    message: "Group updated successfully.",
    data: updatedGroup,
  });
});

/**
 * PATCH /api/admin/groups/:groupId/status
 *
 * Activate or deactivate a group.
 */
router.patch("/:groupId/status", async (req, res) => {
  const { groupId } = req.params;

  if (!mongoose.isValidObjectId(groupId)) {
    res.status(400).json({
      success: false,
      message: "Invalid group ID.",
    });
    return;
  }

  const parsed = groupStatusSchema.safeParse(req.body);

  if (!parsed.success) {
    res.status(400).json({
      success: false,
      message: "isActive must be a boolean.",
      errors: parsed.error.issues,
    });
    return;
  }

  const group = await Group.findByIdAndUpdate(
    groupId,
    {
      $set: {
        isActive: parsed.data.isActive,
      },
    },
    {
      new: true,
      runValidators: true,
    }
  )
    .populate("zoneId", "name")
    .lean();

  if (!group) {
    res.status(404).json({
      success: false,
      message: "Group not found.",
    });
    return;
  }

  res.json({
    success: true,
    message: parsed.data.isActive
      ? "Group activated successfully."
      : "Group deactivated successfully.",
    data: group,
  });
});

export default router;
