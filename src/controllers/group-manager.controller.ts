import type { Request, Response, NextFunction } from "express";
import { z } from "zod";

import {
  GroupManagerService,
  GroupManagerServiceError,
} from "../services/group-manager.service";

const groupManagerService = new GroupManagerService();

const createGroupManagerSchema = z.object({
  fullName: z.string().trim().min(1).max(160),
  username: z
    .string()
    .trim()
    .min(3)
    .max(60)
    .regex(/^[a-zA-Z0-9._-]+$/),
  password: z.string().min(1),
  groupIds: z.array(z.string().trim().min(1)).min(1),
});

const updateGroupManagerSchema = z
  .object({
    fullName: z.string().trim().min(1).max(160).optional(),
    username: z
      .string()
      .trim()
      .min(3)
      .max(60)
      .regex(/^[a-zA-Z0-9._-]+$/)
      .optional(),
    password: z.string().min(1).optional(),
    groupIds: z.array(z.string().trim().min(1)).min(1).optional(),
  })
  .refine(
    (data) =>
      Object.values(data).some(
        (value) => value !== undefined,
      ),
    {
      message: "Provide at least one field to update.",
    },
  );

const updateGroupsSchema = z.object({
  groupIds: z.array(z.string().trim().min(1)),
});

const setActiveSchema = z.object({
  isActive: z.boolean(),
});

function getManagerIdParam(
  req: Request,
  res: Response,
): string | null {
  const managerId = req.params.managerId;

  if (
    typeof managerId !== "string" ||
    !managerId.trim()
  ) {
    res.status(400).json({
      success: false,
      message: "A valid Group Manager ID is required.",
    });

    return null;
  }

  return managerId;
}

function handleError(
  error: unknown,
  res: Response,
  next: NextFunction,
): void {
  if (error instanceof GroupManagerServiceError) {
    res.status(error.statusCode).json({
      success: false,
      message: error.message,
    });
    return;
  }

  if (error instanceof z.ZodError) {
    res.status(400).json({
      success: false,
      message: "Invalid Group Manager data.",
      errors: error.issues,
    });
    return;
  }

  next(error);
}

export async function listGroupManagers(
  _req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const managers = await groupManagerService.list();

    res.status(200).json({
      success: true,
      count: managers.length,
      data: managers,
    });
  } catch (error) {
    handleError(error, res, next);
  }
}

export async function createGroupManager(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const input = createGroupManagerSchema.parse(req.body);
    const manager = await groupManagerService.create(input);

    res.status(201).json({
      success: true,
      message: "Group Manager created successfully.",
      data: manager,
    });
  } catch (error) {
    handleError(error, res, next);
  }
}

export async function updateGroupManager(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const managerId = getManagerIdParam(req, res);

    if (!managerId) {
      return;
    }

    const input = updateGroupManagerSchema.parse(req.body);
    const manager = await groupManagerService.update(
      managerId,
      input,
    );

    res.status(200).json({
      success: true,
      message: "Group Manager updated successfully.",
      data: manager,
    });
  } catch (error) {
    handleError(error, res, next);
  }
}

export async function updateGroupManagerGroups(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const managerId = getManagerIdParam(req, res);

    if (!managerId) {
      return;
    }

    const input = updateGroupsSchema.parse(req.body);
    const manager = await groupManagerService.updateGroups(
      managerId,
      input.groupIds,
    );

    res.status(200).json({
      success: true,
      message: "Group assignments updated successfully.",
      data: manager,
    });
  } catch (error) {
    handleError(error, res, next);
  }
}

export async function setGroupManagerActive(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const managerId = getManagerIdParam(req, res);

    if (!managerId) {
      return;
    }

    const input = setActiveSchema.parse(req.body);
    const manager = await groupManagerService.setActive(
      managerId,
      input.isActive,
    );

    res.status(200).json({
      success: true,
      message: input.isActive
        ? "Group Manager activated successfully."
        : "Group Manager deactivated successfully.",
      data: manager,
    });
  } catch (error) {
    handleError(error, res, next);
  }
}

export async function deleteGroupManager(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const managerId = getManagerIdParam(req, res);

    if (!managerId) {
      return;
    }

    const manager = await groupManagerService.delete(
      managerId,
    );

    res.status(200).json({
      success: true,
      message: "Group Manager deleted successfully.",
      data: manager,
    });
  } catch (error) {
    handleError(error, res, next);
  }
}
