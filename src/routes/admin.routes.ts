
import { Router } from "express";
import { z } from "zod";

import { ContributionService } from "../services/contribution.service";
import type { ContributionStatus } from "../models/Contribution";

const router = Router();
const contributionService = new ContributionService();

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
        "Provide either amountNaira or amountEspees, but not both.",
      path: ["amountNaira"],
    },
  );

const statusSchema = z.enum(["recorded", "reversed"]);

const reverseSchema = z.object({
  reason: z.string().trim().min(1).max(1000),
});

// POST /api/admin/contributions
// Newly recorded Givings count immediately.
router.post("/contributions", async (req, res) => {
  const parsed = createContributionSchema.safeParse(req.body);

  if (!parsed.success) {
    res.status(400).json({
      success: false,
      message: "Invalid contribution data.",
      errors: parsed.error.issues,
    });
    return;
  }

  const contribution = await contributionService.create(
    parsed.data,
    { role: "admin" },
  );

  res.status(201).json({
    success: true,
    message: "Giving recorded successfully and counted immediately.",
    data: contribution,
  });
});

// GET /api/admin/contributions
router.get("/contributions", async (req, res) => {
  const rawStatus = req.query.status;
  let status: ContributionStatus | undefined;

  if (rawStatus !== undefined) {
    const parsed = statusSchema.safeParse(rawStatus);

    if (!parsed.success) {
      res.status(400).json({
        success: false,
        message: "Invalid Giving status filter.",
        errors: parsed.error.issues,
      });
      return;
    }

    status = parsed.data;
  }

  const contributions = await contributionService.list(status);

  res.json({
    success: true,
    count: contributions.length,
    data: contributions,
  });
});

// DELETE /api/admin/contributions/:contributionId
// Permanently deletes a Giving.
router.delete(
  "/contributions/:contributionId",
  async (req, res) => {
    const contribution =
      await contributionService.deletePermanently(
        req.params.contributionId,
      );

    res.json({
      success: true,
      message: "Giving permanently deleted successfully.",
      data: contribution,
    });
  },
);

// PATCH /api/admin/contributions/:contributionId/reverse
// Retains the existing reversal functionality.
router.patch(
  "/contributions/:contributionId/reverse",
  async (req, res) => {
    const parsed = reverseSchema.safeParse(req.body);

    if (!parsed.success) {
      res.status(400).json({
        success: false,
        message: "A valid reversal reason is required.",
        errors: parsed.error.issues,
      });
      return;
    }

    const contribution = await contributionService.reverse(
      req.params.contributionId,
      parsed.data.reason,
      { role: "admin" },
    );

    res.json({
      success: true,
      message:
        "Giving reversed successfully and excluded from the standings.",
      data: contribution,
    });
  },
);

export default router;
