
import mongoose, { Schema, type InferSchemaType } from "mongoose";

export const CONTRIBUTION_STATUSES = [
  "recorded",
  "reversed",

  // Legacy values retained temporarily for historical records.
  // New contributions must never use these statuses.
  "pending",
  "verified",
  "rejected",
] as const;

export type ContributionStatus =
  (typeof CONTRIBUTION_STATUSES)[number];

const contributionSchema = new Schema(
  {
    groupId: {
      type: Schema.Types.ObjectId,
      ref: "Group",
      required: true,
      index: true,
    },
    zoneId: {
      type: Schema.Types.ObjectId,
      ref: "Zone",
      required: true,
      index: true,
    },
    amountEspees: {
      type: Number,
      required: true,
      min: 0.01,
    },
    amountNaira: {
      type: Number,
      required: true,
      min: 0.01,
    },
    status: {
      type: String,
      enum: CONTRIBUTION_STATUSES,
      default: "recorded",
      required: true,
      index: true,
    },
    reference: {
      type: String,
      trim: true,
      maxlength: 160,
      default: undefined,
    },
    note: {
      type: String,
      trim: true,
      maxlength: 1000,
      default: "",
    },

    // Audit trail for new entries.
    recordedByRole: {
      type: String,
      enum: ["admin", "groupManager"],
      default: "admin",
      required: true,
    },
    recordedByManagerId: {
      type: Schema.Types.ObjectId,
      ref: "GroupManager",
      default: null,
    },

    // Legacy verification/rejection metadata. Retained so old
    // records remain readable while the workflow is migrated.
    verifiedAt: {
      type: Date,
      default: null,
    },
    rejectedAt: {
      type: Date,
      default: null,
    },
    rejectionReason: {
      type: String,
      trim: true,
      maxlength: 1000,
      default: "",
    },

    // Reversal is retained for documented corrections.
    reversedAt: {
      type: Date,
      default: null,
    },
    reversalReason: {
      type: String,
      trim: true,
      maxlength: 1000,
      default: "",
    },
    reversedByRole: {
      type: String,
      enum: ["admin", "groupManager"],
      default: null,
    },
    reversedByManagerId: {
      type: Schema.Types.ObjectId,
      ref: "GroupManager",
      default: null,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

contributionSchema.index({
  groupId: 1,
  status: 1,
  createdAt: -1,
});

contributionSchema.index({
  status: 1,
  createdAt: -1,
});

export type ContributionDocument =
  InferSchemaType<typeof contributionSchema>;

export const Contribution =
  mongoose.models.Contribution ??
  mongoose.model("Contribution", contributionSchema);
