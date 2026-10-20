
import mongoose from "mongoose";

import {
  Contribution,
  type ContributionStatus,
} from "../models/Contribution";
import { Group } from "../models/Group";
import { GroupManager } from "../models/GroupManager";
import { leagueEvents } from "../events/league-events";

const NAIRA_PER_ESPEE = 2050;
const ESPEES_DECIMAL_PLACES = 4;

export type ContributionActorRole = "admin" | "groupManager";

export interface ContributionActor {
  role: ContributionActorRole;
  managerId?: string;
}

export interface CreateContributionInput {
  groupId: string;
  amountNaira?: number;
  amountEspees?: number;
  reference?: string;
  note?: string;
}

export class ContributionServiceError extends Error {
  constructor(
    message: string,
    public readonly statusCode: number,
  ) {
    super(message);
    this.name = "ContributionServiceError";
  }
}

function validateObjectId(id: string, label: string): void {
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

function calculateNaira(amountEspees: number): number {
  return Number(
    (amountEspees * NAIRA_PER_ESPEE).toFixed(2),
  );
}

function validateReason(reason: string): string {
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

  return cleanReason;
}

function validateActor(actor: ContributionActor): void {
  if (actor.role === "groupManager") {
    if (
      !actor.managerId ||
      !mongoose.isValidObjectId(actor.managerId)
    ) {
      throw new ContributionServiceError(
        "A valid Group Manager identity is required.",
        401,
      );
    }
  }
}

export class ContributionService {
  private async authorizeGroup(
    groupId: string,
    actor: ContributionActor,
  ) {
    validateActor(actor);

    const group = await Group.findOne({
      _id: groupId,
      isActive: true,
    }).lean();

    if (!group) {
      throw new ContributionServiceError(
        "The selected group does not exist or is inactive.",
        404,
      );
    }

    if (actor.role === "groupManager") {
      const manager = await GroupManager.findOne({
        _id: actor.managerId,
        isActive: true,
        groupIds: group._id,
      })
        .select("_id")
        .lean();

      if (!manager) {
        throw new ContributionServiceError(
          "You are not authorized to record contributions for this group.",
          403,
        );
      }
    }

    return group;
  }

  async create(
    input: CreateContributionInput,
    actor: ContributionActor,
  ) {
    validateObjectId(input.groupId, "group ID");

    const hasNaira = input.amountNaira !== undefined;
    const hasEspees = input.amountEspees !== undefined;

    if (hasNaira === hasEspees) {
      throw new ContributionServiceError(
        "Provide either a Naira amount or an Espees amount, but not both.",
        400,
      );
    }

    if (
      hasNaira &&
      (!Number.isFinite(input.amountNaira) ||
        input.amountNaira! <= 0)
    ) {
      throw new ContributionServiceError(
        "Naira amount must be greater than zero.",
        400,
      );
    }

    if (
      hasEspees &&
      (!Number.isFinite(input.amountEspees) ||
        input.amountEspees! <= 0)
    ) {
      throw new ContributionServiceError(
        "Espees amount must be greater than zero.",
        400,
      );
    }

    const amountNaira = hasNaira
      ? input.amountNaira!
      : calculateNaira(input.amountEspees!);

    const amountEspees = hasEspees
      ? Number(
          input.amountEspees!.toFixed(
            ESPEES_DECIMAL_PLACES,
          ),
        )
      : calculateEspees(input.amountNaira!);

    if (
      !Number.isFinite(amountNaira) ||
      amountNaira <= 0 ||
      !Number.isFinite(amountEspees) ||
      amountEspees <= 0
    ) {
      throw new ContributionServiceError(
        "The contribution amount is too small or invalid after conversion.",
        400,
      );
    }

    if (
      input.reference !== undefined &&
      input.reference.trim().length > 160
    ) {
      throw new ContributionServiceError(
        "The reference cannot exceed 160 characters.",
        400,
      );
    }

    if (
      input.note !== undefined &&
      input.note.trim().length > 1000
    ) {
      throw new ContributionServiceError(
        "The note cannot exceed 1000 characters.",
        400,
      );
    }

    const group = await this.authorizeGroup(
      input.groupId,
      actor,
    );

    const contribution = await Contribution.create({
      groupId: group._id,
      zoneId: group.zoneId,
      amountEspees,
      amountNaira,
      reference: input.reference?.trim() || undefined,
      note: input.note?.trim() || "",
      status: "recorded",
      recordedByRole: actor.role,
      recordedByManagerId:
        actor.role === "groupManager"
          ? actor.managerId
          : null,
    });

    const event = {
      contributionId: contribution._id.toString(),
      groupId: contribution.groupId.toString(),
      amountEspees: contribution.amountEspees,
      amountNaira: contribution.amountNaira,
      recordedByRole: actor.role,
      recordedByManagerId:
        actor.role === "groupManager"
          ? actor.managerId
          : null,
    } as const;

    leagueEvents.publishContributionRecorded(event);

    // Preserve compatibility with existing consumers of the legacy event.
    leagueEvents.publishContributionVerified({
      contributionId: event.contributionId,
      groupId: event.groupId,
      amountEspees: event.amountEspees,
      amountNaira: event.amountNaira,
    });

    return contribution;
  }

  async reverse(
    contributionId: string,
    reason: string,
    actor: ContributionActor,
  ) {
    validateObjectId(contributionId, "contribution ID");
    validateActor(actor);

    const cleanReason = validateReason(reason);

    if (actor.role === "groupManager") {
      throw new ContributionServiceError(
        "Only an administrator can reverse a contribution.",
        403,
      );
    }

    const now = new Date();

    const contribution =
      await Contribution.findOneAndUpdate(
        {
          _id: contributionId,
          status: { $in: ["recorded", "verified"] },
        },
        {
          $set: {
            status: "reversed",
            reversedAt: now,
            reversalReason: cleanReason,
            reversedByRole: actor.role,
            reversedByManagerId: null,
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
    )
      .select("status")
      .lean();

    if (!existing) {
      throw new ContributionServiceError(
        "Contribution not found.",
        404,
      );
    }

    throw new ContributionServiceError(
      `This contribution cannot be reversed because its current status is "${existing.status}". Only recorded or legacy verified contributions can be reversed.`,
      409,
    );
  }

  async deletePermanently(
    contributionId: string,
    actor: ContributionActor = { role: "admin" },
  ) {
    validateObjectId(contributionId, "contribution ID");
    validateActor(actor);

    if (actor.role !== "admin") {
      throw new ContributionServiceError(
        "Only an administrator can permanently delete a Giving.",
        403,
      );
    }

    const contribution =
      await Contribution.findByIdAndDelete(contributionId);

    if (!contribution) {
      throw new ContributionServiceError(
        "Giving not found. It may already have been deleted.",
        404,
      );
    }

    return {
      _id: contribution._id.toString(),
      groupId: contribution.groupId.toString(),
      amountEspees: contribution.amountEspees,
      amountNaira: contribution.amountNaira,
      status: contribution.status,
      deleted: true,
    };
  }

  async list(status?: ContributionStatus) {
    return Contribution.find(
      status ? { status } : {},
    )
      .populate("groupId", "name zoneId")
      .populate("zoneId", "name")
      .populate(
        "recordedByManagerId",
        "fullName username",
      )
      .populate(
        "reversedByManagerId",
        "fullName username",
      )
      .sort({ createdAt: -1 })
      .lean();
  }
}
