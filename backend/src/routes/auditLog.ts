import { Router } from "express";
import { getAuditLog } from "../controllers/auditLogController";
import { asyncHandler } from "../utils/asyncHandler";

export const auditLogRouter = Router();
auditLogRouter.get("/:entityType/:entityId", asyncHandler(getAuditLog));
