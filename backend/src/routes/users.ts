import { Router } from "express";
import { me } from "../controllers/authController";
import { requireAuth } from "../middleware/auth";
import { asyncHandler } from "../utils/asyncHandler";

export const usersRouter = Router();

usersRouter.get("/me", requireAuth, asyncHandler(me));
