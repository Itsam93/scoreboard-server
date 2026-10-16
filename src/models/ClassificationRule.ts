
import mongoose, { Schema, type InferSchemaType } from "mongoose";

const classificationRuleSchema = new Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 80,
    },
    minEspees: {
      type: Number,
      required: true,
      min: 0,
    },
    maxEspees: {
      type: Number,
      min: 0,
      default: null,
    },
    nairaEquivalent: {
      type: Number,
      required: true,
      min: 0,
    },
    displayOrder: {
      type: Number,
      required: true,
      min: 0,
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

classificationRuleSchema.index(
  { name: 1 },
  { unique: true }
);

classificationRuleSchema.index({
  isActive: 1,
  displayOrder: 1,
});

export type ClassificationRuleDocument =
  InferSchemaType<typeof classificationRuleSchema>;

export const ClassificationRule =
  mongoose.models.ClassificationRule ??
  mongoose.model(
    "ClassificationRule",
    classificationRuleSchema
  );
