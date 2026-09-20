import { Router } from "express";
import {
  addLineItem,
  addProjectImage,
  createProject,
  deleteLineItem,
  deleteProjectImage,
  getProject,
  getProjectAnalytics,
  listProjects,
  markProjectFailed,
  publishProject,
  updateLineItem,
} from "../controllers/projectsController";
import { contribute } from "../controllers/contributionsController";
import { optionalAuth, requireAuth, requireRole } from "../middleware/auth";
import { asyncHandler } from "../utils/asyncHandler";

export const projectsRouter = Router();

projectsRouter.post("/", requireAuth, requireRole("entrepreneur"), asyncHandler(createProject));
projectsRouter.get("/", optionalAuth, asyncHandler(listProjects));
projectsRouter.get("/:id", optionalAuth, asyncHandler(getProject));
projectsRouter.get(
  "/:id/analytics",
  requireAuth,
  requireRole("entrepreneur"),
  asyncHandler(getProjectAnalytics)
);
projectsRouter.post(
  "/:id/line-items",
  requireAuth,
  requireRole("entrepreneur"),
  asyncHandler(addLineItem)
);
projectsRouter.patch(
  "/:id/line-items/:lineItemId",
  requireAuth,
  requireRole("entrepreneur"),
  asyncHandler(updateLineItem)
);
projectsRouter.delete(
  "/:id/line-items/:lineItemId",
  requireAuth,
  requireRole("entrepreneur"),
  asyncHandler(deleteLineItem)
);
projectsRouter.patch(
  "/:id/publish",
  requireAuth,
  requireRole("entrepreneur"),
  asyncHandler(publishProject)
);
projectsRouter.patch("/:id/fail", requireAuth, asyncHandler(markProjectFailed));
projectsRouter.post(
  "/:id/images",
  requireAuth,
  requireRole("entrepreneur"),
  asyncHandler(addProjectImage)
);
projectsRouter.delete(
  "/:id/images/:imageId",
  requireAuth,
  requireRole("entrepreneur"),
  asyncHandler(deleteProjectImage)
);
projectsRouter.post(
  "/:id/contributions",
  requireAuth,
  requireRole("contributor"),
  asyncHandler(contribute)
);
