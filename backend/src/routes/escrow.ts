import { Router } from "express";
import { confirmProjectBalance, getEscrowOverview } from "../controllers/escrowController";
import { requireAuth, requireRole } from "../middleware/auth";
import { asyncHandler } from "../utils/asyncHandler";

export const escrowRouter = Router();
escrowRouter.use(requireAuth, requireRole("escrow_partner"));

escrowRouter.get("/overview", asyncHandler(getEscrowOverview));
escrowRouter.post("/projects/:id/confirm", asyncHandler(confirmProjectBalance));
