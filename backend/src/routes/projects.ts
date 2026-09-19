import { Router } from "express";
import {
  addLineItem,
  createProject,
  getProject,
  listProjects,
  markProjectFailed,
  publishProject,
} from "../controllers/projectsController";
import { contribute } from "../controllers/contributionsController";
import { optionalAuth, requireAuth, requireRole } from "../middleware/auth";
import { asyncHandler } from "../utils/asyncHandler";

export const projectsRouter = Router();

projectsRouter.post("/", requireAuth, requireRole("entrepreneur"), asyncHandler(createProject));
projectsRouter.get("/", optionalAuth, asyncHandler(listProjects));
projectsRouter.get("/:id", optionalAuth, asyncHandler(getProject));
projectsRouter.post(
  "/:id/line-items",
  requireAuth,
  requireRole("entrepreneur"),
  asyncHandler(addLineItem)
);
projectsRouter.patch(
  "/:id/publish",
  requireAuth,
  requireRole("entrepreneur"),
  asyncHandler(publishProject)
);
projectsRouter.patch("/:id/fail", requireAuth, asyncHandler(markProjectFailed));
projectsRouter.post(
  "/:id/contributions",
  requireAuth,
  requireRole("contributor"),
  asyncHandler(contribute)
);
