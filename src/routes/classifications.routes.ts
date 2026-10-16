
import { Router } from "express";
import { z } from "zod";

import { ClassificationRule } from "../models/ClassificationRule";

const router = Router();

const ruleSchema = z.object({
  name: z.string().trim().min(1).max(80),
  minEspees: z.number().finite().min(0),
  maxEspees: z.number().finite().min(0).nullable().optional(),
  nairaEquivalent: z.number().finite().min(0),
  displayOrder: z.number().int().min(0),
  isActive: z.boolean().optional(),
});

function hasValidRange(
  minEspees: number,
  maxEspees: number | null | undefined
): boolean {
  return maxEspees == null || maxEspees >= minEspees;
}

router.get("/", async (_req, res) => {
  const rules = await ClassificationRule.find()
    .sort({ displayOrder: 1, minEspees: 1 })
    .lean();

  res.json({
    success: true,
    count: rules.length,
    data: rules,
  });
});

router.post("/", async (req, res) => {
  const parsed = ruleSchema.safeParse(req.body);

  if (!parsed.success) {
    res.status(400).json({
      success: false,
      message: "Invalid classification rule.",
      errors: parsed.error.issues,
    });
    return;
  }

  const data = parsed.data;

  if (!hasValidRange(data.minEspees, data.maxEspees)) {
    res.status(400).json({
      success: false,
      message: "The maximum threshold cannot be below the minimum.",
    });
    return;
  }

  const duplicate = await ClassificationRule.findOne({
    name: data.name,
  }).lean();

  if (duplicate) {
    res.status(409).json({
      success: false,
      message: "A classification with this name already exists.",
    });
    return;
  }

  const overlap = await ClassificationRule.findOne({
    isActive: true,
    ...(data.isActive === false ? {} : {}),
    minEspees: {
      $lte: data.maxEspees ?? Number.MAX_SAFE_INTEGER,
    },
    $or: [
      { maxEspees: null },
      { maxEspees: { $gte: data.minEspees } },
    ],
  }).lean();

  if (data.isActive !== false && overlap) {
    res.status(409).json({
      success: false,
      message: "This classification range overlaps an active rule.",
    });
    return;
  }

  const rule = await ClassificationRule.create({
    ...data,
    maxEspees: data.maxEspees ?? null,
    isActive: data.isActive ?? true,
  });

  res.status(201).json({
    success: true,
    data: rule,
  });
});

router.patch("/:ruleId", async (req, res) => {
  const parsed = ruleSchema.partial().safeParse(req.body);

  if (!parsed.success) {
    res.status(400).json({
      success: false,
      message: "Invalid classification update.",
      errors: parsed.error.issues,
    });
    return;
  }

  const current = await ClassificationRule.findById(
    req.params.ruleId
  ).lean();

  if (!current) {
    res.status(404).json({
      success: false,
      message: "Classification rule not found.",
    });
    return;
  }

  const nextMin = parsed.data.minEspees ?? current.minEspees;
  const nextMax =
    parsed.data.maxEspees === undefined
      ? current.maxEspees
      : parsed.data.maxEspees;

  if (!hasValidRange(nextMin, nextMax)) {
    res.status(400).json({
      success: false,
      message: "The maximum threshold cannot be below the minimum.",
    });
    return;
  }

  const nextActive =
    parsed.data.isActive ?? current.isActive;

  if (nextActive) {
    const overlap = await ClassificationRule.findOne({
      _id: { $ne: current._id },
      isActive: true,
      minEspees: {
        $lte: nextMax ?? Number.MAX_SAFE_INTEGER,
      },
      $or: [
        { maxEspees: null },
        { maxEspees: { $gte: nextMin } },
      ],
    }).lean();

    if (overlap) {
      res.status(409).json({
        success: false,
        message: "This classification range overlaps another active rule.",
      });
      return;
    }
  }

  const rule = await ClassificationRule.findByIdAndUpdate(
    req.params.ruleId,
    {
      $set: {
        ...parsed.data,
        maxEspees: nextMax,
      },
    },
    {
      new: true,
      runValidators: true,
    }
  );

  res.json({
    success: true,
    data: rule,
  });
});

export default router;
