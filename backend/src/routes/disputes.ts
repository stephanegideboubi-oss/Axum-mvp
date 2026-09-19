import { Router } from "express";
import { listDisputes } from "../controllers/disputesController";
import { requireAuth, requireRole } from "../middleware/auth";
import { asyncHandler } from "../utils/asyncHandler";

export const disputesRouter = Router();
disputesRouter.get("/", requireAuth, requireRole("admin"), asyncHandler(listDisputes));
