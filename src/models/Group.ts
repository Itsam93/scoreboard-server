
import mongoose, { Schema, type InferSchemaType } from "mongoose";

const groupSchema = new Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 160,
    },
    zoneId: {
      type: Schema.Types.ObjectId,
      ref: "Zone",
      required: true,
      index: true,
    },
    description: {
      type: String,
      trim: true,
      maxlength: 500,
      default: "",
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

groupSchema.index(
  { zoneId: 1, name: 1 },
  { unique: true }
);

groupSchema.index({ isActive: 1, name: 1 });

export type GroupDocument = InferSchemaType<typeof groupSchema>;

export const Group =
  mongoose.models.Group ??
  mongoose.model("Group", groupSchema);
