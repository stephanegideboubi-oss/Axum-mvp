import { Router } from "express";
import { flutterwaveWebhook, stripeWebhook } from "../controllers/webhooksController";
import { asyncHandler } from "../utils/asyncHandler";

// No auth middleware: callers are payment providers, authenticated by signature.
export const webhooksRouter = Router();
webhooksRouter.post("/stripe", asyncHandler(stripeWebhook));
webhooksRouter.post("/flutterwave", asyncHandler(flutterwaveWebhook));
