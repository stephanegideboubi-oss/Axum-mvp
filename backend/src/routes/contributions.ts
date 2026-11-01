import { Router } from "express";
import {
  confirmContribution,
  listProviders,
  lookupByUin,
  myContributions,
} from "../controllers/contributionsController";
import { requireAuth, requireRole } from "../middleware/auth";
import { asyncHandler } from "../utils/asyncHandler";

export const contributionsRouter = Router();
contributionsRouter.get(
  "/mine",
  requireAuth,
  requireRole("contributor"),
  asyncHandler(myContributions)
);
contributionsRouter.get("/providers", asyncHandler(listProviders));
contributionsRouter.get("/uin/:uin", asyncHandler(lookupByUin));
contributionsRouter.post(
  "/:id/confirm",
  requireAuth,
  requireRole("contributor"),
  asyncHandler(confirmContribution)
);
