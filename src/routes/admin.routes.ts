import { Router } from "express";
import { z } from "zod";

import { ContributionService } from "../services/contribution.service";

const router = Router();
const contributionService = new ContributionService();

const createContributionSchema = z.object({
  groupId: z.string().trim().min(1),
  amountEspees: z.number().finite().positive(),
  amountNaira: z.number().finite().positive(),
  reference: z.string().trim().max(160).optional(),
  note: z.string().trim().max(1000).optional(),
});

const statusSchema = z.enum([
  "pending",
  "verified",
  "rejected",
  "reversed",
]);

const rejectSchema = z.object({
  reason: z.string().trim().min(1).max(1000),
});

const reverseSchema = z.object({
  reason: z.string().trim().min(1).max(1000),
});

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
  );

  res.status(201).json({
    success: true,
    message: "Contribution recorded and awaiting verification.",
    data: contribution,
  });
});

router.get("/contributions", async (req, res) => {
  const rawStatus = req.query.status;

  let status:
    | "pending"
    | "verified"
    | "rejected"
    | "reversed"
    | undefined;

  if (rawStatus !== undefined) {
    const parsed = statusSchema.safeParse(rawStatus);

    if (!parsed.success) {
      res.status(400).json({
        success: false,
        message: "Invalid contribution status filter.",
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

router.patch(
  "/contributions/:contributionId/verify",
  async (req, res) => {
    const contribution = await contributionService.verify(
      req.params.contributionId,
    );

    res.json({
      success: true,
      message: "Contribution verified successfully.",
      data: contribution,
    });
  },
);

router.patch(
  "/contributions/:contributionId/reject",
  async (req, res) => {
    const parsed = rejectSchema.safeParse(req.body);

    if (!parsed.success) {
      res.status(400).json({
        success: false,
        message: "A valid rejection reason is required.",
        errors: parsed.error.issues,
      });
      return;
    }

    const contribution = await contributionService.reject(
      req.params.contributionId,
      parsed.data.reason,
    );

    res.json({
      success: true,
      message: "Contribution rejected.",
      data: contribution,
    });
  },
);

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
    );

    res.json({
      success: true,
      message: "Contribution reversed successfully.",
      data: contribution,
    });
  },
);

export default router;
