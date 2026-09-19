import cors from "cors";
import express from "express";
import { env } from "./config/env";
import { errorHandler, notFoundHandler } from "./middleware/errorHandler";
import { adminRouter } from "./routes/admin";
import { auditLogRouter } from "./routes/auditLog";
import { authRouter } from "./routes/auth";
import { bidsRouter, lineItemBidsRouter } from "./routes/bids";
import { contributionsRouter } from "./routes/contributions";
import { disputesRouter } from "./routes/disputes";
import { projectsRouter } from "./routes/projects";
import { usersRouter } from "./routes/users";

const app = express();

app.use(cors());
app.use(express.json());

app.get("/health", (_req, res) => res.json({ status: "ok" }));

app.use("/auth", authRouter);
app.use("/users", usersRouter);
app.use("/projects", projectsRouter);
app.use("/line-items", lineItemBidsRouter);
app.use("/bids", bidsRouter);
app.use("/contributions", contributionsRouter);
app.use("/audit-log", auditLogRouter);
app.use("/admin", adminRouter);
app.use("/disputes", disputesRouter);

app.use(notFoundHandler);
app.use(errorHandler);

app.listen(env.port, () => {
  console.log(`AXUM backend listening on port ${env.port}`);
});
