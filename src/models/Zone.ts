
import mongoose, { Schema, type InferSchemaType } from "mongoose";

const zoneSchema = new Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 120,
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

zoneSchema.index({ name: 1 }, { unique: true });

export type ZoneDocument = InferSchemaType<typeof zoneSchema>;

export const Zone =
  mongoose.models.Zone ??
  mongoose.model("Zone", zoneSchema);
