import cors from "cors";
import express from "express";
import rateLimit from "express-rate-limit";
import helmet from "helmet";
import { env } from "./config/env";
import { errorHandler, notFoundHandler } from "./middleware/errorHandler";
import { adminRouter } from "./routes/admin";
import { auditLogRouter } from "./routes/auditLog";
import { authRouter } from "./routes/auth";
import { bidsRouter, lineItemBidsRouter } from "./routes/bids";
import { contributionsRouter } from "./routes/contributions";
import { disputesRouter } from "./routes/disputes";
import { escrowRouter } from "./routes/escrow";
import { projectsRouter } from "./routes/projects";
import { uploadsRouter } from "./routes/uploads";
import { usersRouter } from "./routes/users";
import { vendorsRouter } from "./routes/vendors";

const app = express();

app.use(helmet());

// Empty allowlist (dev default) reflects the request origin via the cors
// package's default behavior; production sets CORS_ORIGINS explicitly.
app.use(cors(env.corsOrigins.length > 0 ? { origin: env.corsOrigins } : undefined));
app.use(express.json());

const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
});
app.use(generalLimiter);

// Blunts credential brute-forcing specifically, on top of the general limiter above.
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many attempts. Please try again later." },
});

app.get("/health", (_req, res) => res.json({ status: "ok" }));

app.use("/auth", authLimiter, authRouter);
app.use("/users", usersRouter);
app.use("/projects", projectsRouter);
app.use("/line-items", lineItemBidsRouter);
app.use("/bids", bidsRouter);
app.use("/contributions", contributionsRouter);
app.use("/audit-log", auditLogRouter);
app.use("/admin", adminRouter);
app.use("/escrow", escrowRouter);
app.use("/disputes", disputesRouter);
app.use("/vendors", vendorsRouter);
app.use("/uploads", uploadsRouter);

app.use(notFoundHandler);
app.use(errorHandler);

app.listen(env.port, () => {
  console.log(`AXUM backend listening on port ${env.port}`);
});
