
import mongoose, { Schema, type InferSchemaType } from "mongoose";

const groupManagerSchema = new Schema(
  {
    fullName: {
      type: String,
      required: true,
      trim: true,
      maxlength: 160,
    },
    username: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      minlength: 3,
      maxlength: 60,
    },
    passwordHash: {
      type: String,
      required: true,
      select: false,
    },
    groupIds: [
      {
        type: Schema.Types.ObjectId,
        ref: "Group",
      },
    ],
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
    lastLoginAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

groupManagerSchema.index(
  { username: 1 },
  { unique: true }
);

groupManagerSchema.index({ groupIds: 1, isActive: 1 });

export type GroupManagerDocument =
  InferSchemaType<typeof groupManagerSchema>;

export const GroupManager =
  mongoose.models.GroupManager ??
  mongoose.model("GroupManager", groupManagerSchema);
