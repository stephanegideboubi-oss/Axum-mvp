import { Router } from "express";
import { listBidsForLineItem, rejectBid, selectBid, submitBid } from "../controllers/bidsController";
import { holdFunds, listProofForLineItem, releaseFunds, uploadProof } from "../controllers/disbursementsController";
import { flagLineItem } from "../controllers/disputesController";
import { requireAuth, requireRole } from "../middleware/auth";
import { asyncHandler } from "../utils/asyncHandler";

export const lineItemBidsRouter = Router();
lineItemBidsRouter.post("/:id/bids", requireAuth, requireRole("vendor"), asyncHandler(submitBid));
lineItemBidsRouter.get("/:id/bids", asyncHandler(listBidsForLineItem));
lineItemBidsRouter.post("/:id/hold", requireAuth, requireRole("escrow_partner"), asyncHandler(holdFunds));
lineItemBidsRouter.post(
  "/:id/release",
  requireAuth,
  requireRole("escrow_partner"),
  asyncHandler(releaseFunds)
);
lineItemBidsRouter.post("/:id/proof", requireAuth, requireRole("vendor"), asyncHandler(uploadProof));
lineItemBidsRouter.get("/:id/proof", asyncHandler(listProofForLineItem));
lineItemBidsRouter.post(
  "/:id/disputes",
  requireAuth,
  requireRole("contributor"),
  asyncHandler(flagLineItem)
);

export const bidsRouter = Router();
bidsRouter.patch("/:id/select", requireAuth, requireRole("entrepreneur"), asyncHandler(selectBid));
bidsRouter.patch("/:id/reject", requireAuth, requireRole("entrepreneur"), asyncHandler(rejectBid));
