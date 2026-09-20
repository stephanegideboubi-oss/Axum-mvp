import { Router } from "express";
import { listMyBids } from "../controllers/bidsController";
import {
  addPortfolioImage,
  deletePortfolioImage,
  getVendorProfile,
  updateMyVendorProfile,
} from "../controllers/vendorsController";
import { requireAuth, requireRole } from "../middleware/auth";
import { asyncHandler } from "../utils/asyncHandler";

export const vendorsRouter = Router();

vendorsRouter.get("/me/bids", requireAuth, requireRole("vendor"), asyncHandler(listMyBids));
vendorsRouter.patch(
  "/me/profile",
  requireAuth,
  requireRole("vendor"),
  asyncHandler(updateMyVendorProfile)
);
vendorsRouter.post(
  "/me/portfolio",
  requireAuth,
  requireRole("vendor"),
  asyncHandler(addPortfolioImage)
);
vendorsRouter.delete(
  "/me/portfolio/:imageId",
  requireAuth,
  requireRole("vendor"),
  asyncHandler(deletePortfolioImage)
);
vendorsRouter.get("/:id", asyncHandler(getVendorProfile));
