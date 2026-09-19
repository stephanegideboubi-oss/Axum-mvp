import { Request, Response } from "express";
import { z } from "zod";
import { pool } from "../config/db";
import { HttpError } from "../middleware/errorHandler";
import { appendAuditLog } from "../services/auditLog";

const createProjectSchema = z.object({
  title: z.string().min(1),
  description: z.string().min(1),
  location: z.string().min(1),
  goalAmount: z.number().positive(),
  currency: z.string().length(3).optional(),
});

const createLineItemSchema = z.object({
  description: z.string().min(1),
  category: z.string().min(1),
  location: z.string().min(1),
  quantity: z.number().positive(),
  unitCost: z.number().positive(),
});

async function loadProjectOr404(id: string) {
  const result = await pool.query("SELECT * FROM projects WHERE id = $1", [id]);
  if (!result.rows[0]) throw new HttpError(404, "Project not found");
  return result.rows[0];
}

export async function createProject(req: Request, res: Response) {
  const parsed = createProjectSchema.safeParse(req.body);
  if (!parsed.success) {
    throw new HttpError(400, parsed.error.issues.map((i) => i.message).join(", "));
  }
  const { title, description, location, goalAmount, currency } = parsed.data;

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const result = await client.query(
      `INSERT INTO projects (entrepreneur_id, title, description, location, goal_amount, currency)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [req.user!.sub, title, description, location, goalAmount, currency ?? "USD"]
    );
    const project = result.rows[0];
    await appendAuditLog(client, {
      entityType: "project",
      entityId: project.id,
      action: "project.created",
      actorId: req.user!.sub,
      payload: { title, goalAmount },
    });
    await client.query("COMMIT");
    res.status(201).json({ project });
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}

export async function addLineItem(req: Request, res: Response) {
  const parsed = createLineItemSchema.safeParse(req.body);
  if (!parsed.success) {
    throw new HttpError(400, parsed.error.issues.map((i) => i.message).join(", "));
  }
  const project = await loadProjectOr404(req.params.id);
  if (project.entrepreneur_id !== req.user!.sub) {
    throw new HttpError(403, "Only the project owner can edit its budget");
  }
  if (project.status !== "draft") {
    throw new HttpError(409, "Line items can only be added while the project is still a draft");
  }

  const { description, category, location, quantity, unitCost } = parsed.data;
  const amount = Math.round(quantity * unitCost * 100) / 100;

  const result = await pool.query(
    `INSERT INTO budget_line_items (project_id, description, category, location, quantity, unit_cost, amount)
     VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
    [project.id, description, category, location, quantity, unitCost, amount]
  );
  res.status(201).json({ lineItem: result.rows[0] });
}

export async function publishProject(req: Request, res: Response) {
  const project = await loadProjectOr404(req.params.id);
  if (project.entrepreneur_id !== req.user!.sub) {
    throw new HttpError(403, "Only the project owner can publish this project");
  }
  if (project.status !== "draft") {
    throw new HttpError(409, "Only draft projects can be published");
  }

  const lineItems = await pool.query(
    "SELECT id FROM budget_line_items WHERE project_id = $1",
    [project.id]
  );
  if (lineItems.rows.length === 0) {
    throw new HttpError(400, "Add at least one budget line item before publishing");
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const result = await client.query(
      "UPDATE projects SET status = 'open', updated_at = now() WHERE id = $1 RETURNING *",
      [project.id]
    );
    await appendAuditLog(client, {
      entityType: "project",
      entityId: project.id,
      action: "project.published",
      actorId: req.user!.sub,
      payload: {},
    });
    await client.query("COMMIT");
    res.json({ project: result.rows[0] });
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}

export async function markProjectFailed(req: Request, res: Response) {
  const project = await loadProjectOr404(req.params.id);
  const isOwner = project.entrepreneur_id === req.user!.sub;
  const isAdmin = req.user!.role === "admin";
  if (!isOwner && !isAdmin) {
    throw new HttpError(403, "Only the project owner or an admin can cancel a project");
  }
  if (project.status === "funded" || project.status === "closed") {
    throw new HttpError(409, "A funded or closed project can no longer be marked as failed");
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query(
      "UPDATE projects SET status = 'failed', updated_at = now() WHERE id = $1",
      [project.id]
    );
    const refunded = await client.query(
      `UPDATE contributions SET status = 'refunded' WHERE project_id = $1 AND status = 'recorded' RETURNING id, contributor_id, amount`,
      [project.id]
    );
    await appendAuditLog(client, {
      entityType: "project",
      entityId: project.id,
      action: "project.failed_and_refunded",
      actorId: req.user!.sub,
      payload: { refundedContributions: refunded.rows.length },
    });
    await client.query("COMMIT");
    res.json({ project: { ...project, status: "failed" }, refundedCount: refunded.rows.length });
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}

const PROJECTS_WITH_RAISED = `
  SELECT p.*, COALESCE(c.raised, 0) AS raised_amount
  FROM projects p
  LEFT JOIN (
    SELECT project_id, SUM(amount) AS raised FROM contributions WHERE status = 'recorded' GROUP BY project_id
  ) c ON c.project_id = p.id
`;

export async function listProjects(req: Request, res: Response) {
  const mine = req.query.mine === "true";
  if (mine) {
    if (!req.user) throw new HttpError(401, "Login required to view your own projects");
    const result = await pool.query(
      `${PROJECTS_WITH_RAISED} WHERE p.entrepreneur_id = $1 ORDER BY p.created_at DESC`,
      [req.user.sub]
    );
    return res.json({ projects: result.rows });
  }

  const result = await pool.query(
    `${PROJECTS_WITH_RAISED} WHERE p.status != 'draft' ORDER BY p.created_at DESC`
  );
  res.json({ projects: result.rows });
}

export async function getProject(req: Request, res: Response) {
  const project = await loadProjectOr404(req.params.id);

  if (project.status === "draft" && project.entrepreneur_id !== req.user?.sub) {
    throw new HttpError(404, "Project not found");
  }

  const lineItems = await pool.query(
    "SELECT * FROM budget_line_items WHERE project_id = $1 ORDER BY created_at ASC",
    [project.id]
  );
  const raised = await pool.query(
    `SELECT COALESCE(SUM(amount), 0) AS raised FROM contributions WHERE project_id = $1 AND status = 'recorded'`,
    [project.id]
  );

  res.json({
    project: { ...project, raised_amount: Number(raised.rows[0].raised) },
    lineItems: lineItems.rows,
  });
}
