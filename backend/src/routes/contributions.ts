import { Router } from "express";
import { lookupByUin, myContributions } from "../controllers/contributionsController";
import { requireAuth, requireRole } from "../middleware/auth";
import { asyncHandler } from "../utils/asyncHandler";

export const contributionsRouter = Router();
contributionsRouter.get(
  "/mine",
  requireAuth,
  requireRole("contributor"),
  asyncHandler(myContributions)
);
contributionsRouter.get("/uin/:uin", asyncHandler(lookupByUin));
