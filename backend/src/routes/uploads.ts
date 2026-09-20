import { Router } from "express";
import multer from "multer";
import { getFile, uploadFile } from "../controllers/uploadsController";
import { requireAuth } from "../middleware/auth";
import { HttpError } from "../middleware/errorHandler";
import { asyncHandler } from "../utils/asyncHandler";

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (_req, file, cb) => {
    if (!file.mimetype.startsWith("image/")) {
      cb(new HttpError(400, "Only image files are allowed"));
      return;
    }
    cb(null, true);
  },
});

export const uploadsRouter = Router();

uploadsRouter.post("/", requireAuth, upload.single("file"), asyncHandler(uploadFile));
uploadsRouter.get("/:id", asyncHandler(getFile));
