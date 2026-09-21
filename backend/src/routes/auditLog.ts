import { Router } from "express";
import { getAuditLog, verifyChain } from "../controllers/auditLogController";
import { requireAuth, requireRole } from "../middleware/auth";
import { asyncHandler } from "../utils/asyncHandler";

export const auditLogRouter = Router();
auditLogRouter.get(
  "/verify",
  requireAuth,
  requireRole("admin", "escrow_partner"),
  asyncHandler(verifyChain)
);
auditLogRouter.get("/:entityType/:entityId", asyncHandler(getAuditLog));
