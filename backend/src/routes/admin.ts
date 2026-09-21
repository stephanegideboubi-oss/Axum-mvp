import { Router } from "express";
import { listVendors, verifyVendor } from "../controllers/adminController";
import { authorizeRelease } from "../controllers/disbursementsController";
import { resolveDispute } from "../controllers/disputesController";
import { requireAuth, requireRole } from "../middleware/auth";
import { asyncHandler } from "../utils/asyncHandler";

export const adminRouter = Router();
adminRouter.use(requireAuth, requireRole("admin"));

adminRouter.get("/vendors", asyncHandler(listVendors));
adminRouter.patch("/vendors/:id/verify", asyncHandler(verifyVendor));
adminRouter.patch("/disputes/:id/resolve", asyncHandler(resolveDispute));
// Dual control: admin authorizes a release (having reviewed the vendor's
// proof); the escrow partner then executes it. Admin cannot release funds.
adminRouter.patch("/line-items/:id/authorize-release", asyncHandler(authorizeRelease));
