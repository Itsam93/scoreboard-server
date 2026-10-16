
import { Router } from "express";
import { z } from "zod";

import { Zone } from "../models/Zone";

const router = Router();

const zoneSchema = z.object({
  name: z.string().trim().min(1).max(120),
  description: z.string().trim().max(500).optional(),
});

router.get("/", async (_req, res) => {
  const zones = await Zone.find()
    .sort({ name: 1 })
    .lean();

  res.json({
    success: true,
    count: zones.length,
    data: zones,
  });
});

router.post("/", async (req, res) => {
  const parsed = zoneSchema.safeParse(req.body);

  if (!parsed.success) {
    res.status(400).json({
      success: false,
      message: "Invalid zone data.",
      errors: parsed.error.issues,
    });
    return;
  }

  const existing = await Zone.findOne({
    name: parsed.data.name,
  }).lean();

  if (existing) {
    res.status(409).json({
      success: false,
      message: "A zone with this name already exists.",
    });
    return;
  }

  const zone = await Zone.create(parsed.data);

  res.status(201).json({
    success: true,
    data: zone,
  });
});

router.patch("/:zoneId/status", async (req, res) => {
  const parsed = z.object({
    isActive: z.boolean(),
  }).safeParse(req.body);

  if (!parsed.success) {
    res.status(400).json({
      success: false,
      message: "isActive must be a boolean.",
    });
    return;
  }

  const zone = await Zone.findByIdAndUpdate(
    req.params.zoneId,
    { $set: { isActive: parsed.data.isActive } },
    { new: true, runValidators: true }
  );

  if (!zone) {
    res.status(404).json({
      success: false,
      message: "Zone not found.",
    });
    return;
  }

  res.json({
    success: true,
    data: zone,
  });
});

export default router;
