
import mongoose from "mongoose";

import {
  Contribution,
  type ContributionStatus,
} from "../models/Contribution";
import { Group } from "../models/Group";
import { leagueEvents } from "../events/league-events";

const NAIRA_PER_ESPEE = 2050;
const ESPEES_DECIMAL_PLACES = 4;

export class ContributionServiceError extends Error {
  constructor(
    message: string,
    public readonly statusCode: number,
  ) {
    super(message);
    this.name = "ContributionServiceError";
  }
}

function validateObjectId(
  id: string,
  label: string,
): void {
  if (!mongoose.isValidObjectId(id)) {
    throw new ContributionServiceError(
      `Invalid ${label}.`,
      400,
    );
  }
}

function calculateEspees(amountNaira: number): number {
  return Number(
    (amountNaira / NAIRA_PER_ESPEE).toFixed(
      ESPEES_DECIMAL_PLACES,
    ),
  );
}

export interface CreateContributionInput {
  groupId: string;
  amountNaira: number;
  amountEspees?: number;
  reference?: string;
  note?: string;
}

export class ContributionService {
  async create(input: CreateContributionInput) {
    validateObjectId(input.groupId, "group ID");

    if (
      !Number.isFinite(input.amountNaira) ||
      input.amountNaira <= 0
    ) {
      throw new ContributionServiceError(
        "Naira amount must be greater than zero.",
        400,
      );
    }

    const amountEspees = calculateEspees(
      input.amountNaira,
    );

    if (
      !Number.isFinite(amountEspees) ||
      amountEspees <= 0
    ) {
      throw new ContributionServiceError(
        "The contribution is too small to calculate a valid Espees amount.",
        400,
      );
    }

    const group = await Group.findOne({
      _id: input.groupId,
      isActive: true,
    }).lean();

    if (!group) {
      throw new ContributionServiceError(
        "The selected group does not exist or is inactive.",
        404,
      );
    }

    return Contribution.create({
      groupId: group._id,
      zoneId: group.zoneId,
      amountEspees,
      amountNaira: input.amountNaira,
      reference: input.reference?.trim() || undefined,
      note: input.note?.trim() || "",
      status: "pending",
    });
  }

  async verify(contributionId: string) {
    validateObjectId(
      contributionId,
      "contribution ID",
    );

    const contribution =
      await Contribution.findOneAndUpdate(
        {
          _id: contributionId,
          status: "pending",
        },
        {
          $set: {
            status: "verified",
            verifiedAt: new Date(),
            rejectedAt: null,
            rejectionReason: "",
          },
        },
        {
          new: true,
          runValidators: true,
        },
      );

    if (contribution) {
      leagueEvents.publishContributionVerified({
        contributionId: contribution._id.toString(),
        groupId: contribution.groupId.toString(),
        amountEspees: contribution.amountEspees,
        amountNaira: contribution.amountNaira,
      });

      return contribution;
    }

    const existing = await Contribution.findById(
      contributionId,
    ).lean();

    if (!existing) {
      throw new ContributionServiceError(
        "Contribution not found.",
        404,
      );
    }

    throw new ContributionServiceError(
      `This contribution cannot be verified because its current status is "${existing.status}".`,
      409,
    );
  }

  async reject(
    contributionId: string,
    reason: string,
  ) {
    validateObjectId(
      contributionId,
      "contribution ID",
    );

    const cleanReason = reason.trim();

    if (!cleanReason) {
      throw new ContributionServiceError(
        "A rejection reason is required.",
        400,
      );
    }

    if (cleanReason.length > 1000) {
      throw new ContributionServiceError(
        "The rejection reason cannot exceed 1000 characters.",
        400,
      );
    }

    const contribution =
      await Contribution.findOneAndUpdate(
        {
          _id: contributionId,
          status: "pending",
        },
        {
          $set: {
            status: "rejected",
            rejectedAt: new Date(),
            rejectionReason: cleanReason,
            verifiedAt: null,
          },
        },
        {
          new: true,
          runValidators: true,
        },
      );

    if (contribution) {
      return contribution;
    }

    const existing = await Contribution.findById(
      contributionId,
    ).lean();

    if (!existing) {
      throw new ContributionServiceError(
        "Contribution not found.",
        404,
      );
    }

    throw new ContributionServiceError(
      `This contribution cannot be rejected because its current status is "${existing.status}".`,
      409,
    );
  }

  async reverse(
    contributionId: string,
    reason: string,
  ) {
    validateObjectId(
      contributionId,
      "contribution ID",
    );

    const cleanReason = reason.trim();

    if (!cleanReason) {
      throw new ContributionServiceError(
        "A reason is required to reverse this contribution.",
        400,
      );
    }

    if (cleanReason.length > 1000) {
      throw new ContributionServiceError(
        "The reversal reason cannot exceed 1000 characters.",
        400,
      );
    }

    const contribution =
      await Contribution.findOneAndUpdate(
        {
          _id: contributionId,
          status: "verified",
        },
        {
          $set: {
            status: "reversed",
            reversedAt: new Date(),
            reversalReason: cleanReason,
          },
        },
        {
          new: true,
          runValidators: true,
        },
      );

    if (contribution) {
      return contribution;
    }

    const existing = await Contribution.findById(
      contributionId,
    ).lean();

    if (!existing) {
      throw new ContributionServiceError(
        "Contribution not found.",
        404,
      );
    }

    throw new ContributionServiceError(
      `This contribution cannot be reversed because its current status is "${existing.status}". Only verified contributions can be reversed.`,
      409,
    );
  }

  async list(status?: ContributionStatus) {
    return Contribution.find(
      status ? { status } : {},
    )
      .populate("groupId", "name zoneId")
      .populate("zoneId", "name")
      .sort({ createdAt: -1 })
      .lean();
  }
}
