import { Router } from "express";

import {
  createGroupManager,
  deleteGroupManager,
  listGroupManagers,
  setGroupManagerActive,
  updateGroupManager,
  updateGroupManagerGroups,
} from "../controllers/group-manager.controller";

import { requireAdminApiKey } from "../middleware/admin-api-key";

const router = Router();

// All endpoints in this router require the admin API key.
router.use(requireAdminApiKey);

// GET /api/admin/group-managers
router.get("/", listGroupManagers);

// POST /api/admin/group-managers
router.post("/", createGroupManager);

// PATCH /api/admin/group-managers/:managerId
router.patch("/:managerId", updateGroupManager);

// PATCH /api/admin/group-managers/:managerId/groups
router.patch("/:managerId/groups", updateGroupManagerGroups);

// PATCH /api/admin/group-managers/:managerId/status
router.patch("/:managerId/status", setGroupManagerActive);

// DELETE /api/admin/group-managers/:managerId
router.delete("/:managerId", deleteGroupManager);

export default router;
