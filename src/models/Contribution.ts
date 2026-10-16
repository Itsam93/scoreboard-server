
import mongoose, { Schema, type InferSchemaType } from "mongoose";

export const CONTRIBUTION_STATUSES = [
  "pending",
  "verified",
  "rejected",
  "reversed",
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
      min: 0,
    },
    status: {
      type: String,
      enum: CONTRIBUTION_STATUSES,
      default: "pending",
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
    reversedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
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
