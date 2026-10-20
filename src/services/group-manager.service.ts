import mongoose from "mongoose";

import { Group } from "../models/Group";
import { GroupManager } from "../models/GroupManager";
import {
  hashPassword,
  verifyPassword,
} from "../utils/password";
import { createManagerToken } from "../utils/manager-token";

export class GroupManagerServiceError extends Error {
  constructor(
    message: string,
    public readonly statusCode: number,
  ) {
    super(message);
    this.name = "GroupManagerServiceError";
  }
}

export interface CreateGroupManagerInput {
  fullName: string;
  username: string;
  password: string;
  groupIds: string[];
}

export interface UpdateGroupManagerInput {
  fullName?: string;
  username?: string;
  password?: string;
  groupIds?: string[];
}

function validateManagerId(managerId: string): void {
  if (!mongoose.isValidObjectId(managerId)) {
    throw new GroupManagerServiceError(
      "Invalid Group Manager ID.",
      400,
    );
  }
}

function normalizeUsername(username: string): string {
  return username.trim().toLowerCase();
}

function validateUsername(username: string): void {
  if (
    username.length < 3 ||
    username.length > 60 ||
    !/^[a-z0-9._-]+$/.test(username)
  ) {
    throw new GroupManagerServiceError(
      "Username must be 3–60 characters and contain only letters, numbers, periods, underscores, or hyphens.",
      400,
    );
  }
}

function validateFullName(fullName: string): string {
  const value = fullName.trim();

  if (!value || value.length > 160) {
    throw new GroupManagerServiceError(
      "Full name is required and cannot exceed 160 characters.",
      400,
    );
  }

  return value;
}

function normalizeGroupIds(groupIds: string[]): string[] {
  if (!Array.isArray(groupIds)) {
    throw new GroupManagerServiceError(
      "Group assignments must be an array.",
      400,
    );
  }

  const normalized = groupIds.map((id: string) => {
    if (!mongoose.isValidObjectId(id)) {
      throw new GroupManagerServiceError(
        "One or more group IDs are invalid.",
        400,
      );
    }

    return id.toLowerCase();
  });

  return [...new Set(normalized)];
}

function isDuplicateKeyError(error: unknown): boolean {
  return (
    error instanceof mongoose.mongo.MongoServerError &&
    error.code === 11000
  );
}

async function hashManagerPassword(
  password: string,
): Promise<string> {
  try {
    return await hashPassword(password);
  } catch (error) {
    throw new GroupManagerServiceError(
      error instanceof Error
        ? error.message
        : "The supplied password is invalid.",
      400,
    );
  }
}

export class GroupManagerService {
  private async validateActiveGroups(
    groupIds: string[],
  ): Promise<void> {
    if (groupIds.length === 0) {
      return;
    }

    const groups = await Group.find({
      _id: { $in: groupIds },
      isActive: true,
    })
      .select("_id")
      .lean();

    if (groups.length !== groupIds.length) {
      throw new GroupManagerServiceError(
        "One or more assigned groups do not exist or are inactive.",
        400,
      );
    }
  }

  async create(input: CreateGroupManagerInput) {
    const fullName = validateFullName(input.fullName);
    const username = normalizeUsername(input.username);

    validateUsername(username);

    const groupIds = normalizeGroupIds(input.groupIds);

    if (groupIds.length === 0) {
      throw new GroupManagerServiceError(
        "Assign at least one group to the Group Manager.",
        400,
      );
    }

    await this.validateActiveGroups(groupIds);

    const passwordHash = await hashManagerPassword(input.password);

    try {
      const manager = await GroupManager.create({
        fullName,
        username,
        passwordHash,
        groupIds,
        isActive: true,
      });

      return {
        id: manager._id.toString(),
        fullName: manager.fullName,
        username: manager.username,
        groupIds: manager.groupIds.map(
          (id: mongoose.Types.ObjectId) => id.toString(),
        ),
        isActive: manager.isActive,
        createdAt: manager.createdAt,
      };
    } catch (error) {
      if (isDuplicateKeyError(error)) {
        throw new GroupManagerServiceError(
          "That username is already in use.",
          409,
        );
      }

      throw error;
    }
  }

  async login(usernameInput: string, password: string) {
    const username = normalizeUsername(usernameInput);

    if (!username || typeof password !== "string") {
      throw new GroupManagerServiceError(
        "Invalid username or password.",
        401,
      );
    }

    const manager = await GroupManager.findOne({
      username,
      isActive: true,
    }).select("+passwordHash");

    if (
      !manager ||
      !(await verifyPassword(password, manager.passwordHash))
    ) {
      throw new GroupManagerServiceError(
        "Invalid username or password.",
        401,
      );
    }

    manager.lastLoginAt = new Date();
    await manager.save();

    const token = createManagerToken(manager._id.toString());

    return {
      token,
      tokenType: "Bearer",
      expiresIn: 3600,
      manager: {
        id: manager._id.toString(),
        fullName: manager.fullName,
        username: manager.username,
        groupIds: manager.groupIds.map(
          (id: mongoose.Types.ObjectId) => id.toString(),
        ),
        isActive: manager.isActive,
        lastLoginAt: manager.lastLoginAt,
      },
    };
  }

  async list() {
    return GroupManager.find()
      .select("-passwordHash")
      .populate({
        path: "groupIds",
        select: "name zoneId isActive",
        populate: {
          path: "zoneId",
          select: "name",
        },
      })
      .sort({ fullName: 1 })
      .lean();
  }

  async update(
    managerId: string,
    input: UpdateGroupManagerInput,
  ) {
    validateManagerId(managerId);

    const manager = await GroupManager.findById(managerId);

    if (!manager) {
      throw new GroupManagerServiceError(
        "Group Manager not found.",
        404,
      );
    }

    if (input.fullName !== undefined) {
      manager.fullName = validateFullName(input.fullName);
    }

    if (input.username !== undefined) {
      const username = normalizeUsername(input.username);

      validateUsername(username);
      manager.username = username;
    }

    if (input.groupIds !== undefined) {
      const groupIds = normalizeGroupIds(input.groupIds);

      if (groupIds.length === 0) {
        throw new GroupManagerServiceError(
          "Assign at least one group to the Group Manager.",
          400,
        );
      }

      await this.validateActiveGroups(groupIds);

      manager.groupIds = groupIds.map(
        (id) => new mongoose.Types.ObjectId(id),
      );
    }

    if (input.password !== undefined && input.password !== "") {
      manager.passwordHash = await hashManagerPassword(
        input.password,
      );
    }

    try {
      await manager.save();
    } catch (error) {
      if (isDuplicateKeyError(error)) {
        throw new GroupManagerServiceError(
          "That username is already in use.",
          409,
        );
      }

      throw error;
    }

    return {
      id: manager._id.toString(),
      fullName: manager.fullName,
      username: manager.username,
      groupIds: manager.groupIds.map(
        (id: mongoose.Types.ObjectId) => id.toString(),
      ),
      isActive: manager.isActive,
      lastLoginAt: manager.lastLoginAt,
      createdAt: manager.createdAt,
      updatedAt: manager.updatedAt,
    };
  }

  async updateGroups(
    managerId: string,
    requestedGroupIds: string[],
  ) {
    validateManagerId(managerId);

    const groupIds = normalizeGroupIds(requestedGroupIds);

    await this.validateActiveGroups(groupIds);

    const manager = await GroupManager.findByIdAndUpdate(
      managerId,
      { $set: { groupIds } },
      { new: true, runValidators: true },
    )
      .select("-passwordHash")
      .lean();

    if (!manager) {
      throw new GroupManagerServiceError(
        "Group Manager not found.",
        404,
      );
    }

    return manager;
  }

  async setActive(
    managerId: string,
    isActive: boolean,
  ) {
    validateManagerId(managerId);

    if (typeof isActive !== "boolean") {
      throw new GroupManagerServiceError(
        "isActive must be a boolean.",
        400,
      );
    }

    const manager = await GroupManager.findByIdAndUpdate(
      managerId,
      { $set: { isActive } },
      { new: true, runValidators: true },
    )
      .select("-passwordHash")
      .lean();

    if (!manager) {
      throw new GroupManagerServiceError(
        "Group Manager not found.",
        404,
      );
    }

    return manager;
  }

  async delete(managerId: string) {
    validateManagerId(managerId);

    const manager = await GroupManager.findByIdAndDelete(
      managerId,
    )
      .select("-passwordHash")
      .lean();

    if (!manager) {
      throw new GroupManagerServiceError(
        "Group Manager not found.",
        404,
      );
    }

    return {
      id: manager._id.toString(),
      fullName: manager.fullName,
      username: manager.username,
    };
  }
}
