import { Request, Response } from "express";
import { z } from "zod";
import { pool } from "../config/db";
import { HttpError } from "../middleware/errorHandler";
import { appendAuditLog } from "../services/auditLog";

const createProjectSchema = z.object({
  title: z.string().min(1),
  description: z.string().min(1),
  location: z.string().min(1),
  country: z.string().min(1),
  zipCode: z.string().optional(),
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
  const { title, description, location, country, zipCode, goalAmount, currency } = parsed.data;

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const result = await client.query(
      `INSERT INTO projects (entrepreneur_id, title, description, location, country, zip_code, goal_amount, currency)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
      [req.user!.sub, title, description, location, country, zipCode ?? null, goalAmount, currency ?? "USD"]
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

export async function updateLineItem(req: Request, res: Response) {
  const parsed = createLineItemSchema.safeParse(req.body);
  if (!parsed.success) {
    throw new HttpError(400, parsed.error.issues.map((i) => i.message).join(", "));
  }
  const project = await loadProjectOr404(req.params.id);
  if (project.entrepreneur_id !== req.user!.sub) {
    throw new HttpError(403, "Only the project owner can edit its budget");
  }
  if (project.status !== "draft") {
    throw new HttpError(409, "Line items can only be edited while the project is still a draft");
  }

  const lineItem = await pool.query(
    "SELECT id FROM budget_line_items WHERE id = $1 AND project_id = $2",
    [req.params.lineItemId, project.id]
  );
  if (!lineItem.rows[0]) throw new HttpError(404, "Budget line item not found");

  const { description, category, location, quantity, unitCost } = parsed.data;
  const amount = Math.round(quantity * unitCost * 100) / 100;

  const result = await pool.query(
    `UPDATE budget_line_items
     SET description = $1, category = $2, location = $3, quantity = $4, unit_cost = $5, amount = $6, updated_at = now()
     WHERE id = $7 RETURNING *`,
    [description, category, location, quantity, unitCost, amount, req.params.lineItemId]
  );
  res.json({ lineItem: result.rows[0] });
}

export async function deleteLineItem(req: Request, res: Response) {
  const project = await loadProjectOr404(req.params.id);
  if (project.entrepreneur_id !== req.user!.sub) {
    throw new HttpError(403, "Only the project owner can edit its budget");
  }
  if (project.status !== "draft") {
    throw new HttpError(409, "Line items can only be removed while the project is still a draft");
  }

  const result = await pool.query(
    "DELETE FROM budget_line_items WHERE id = $1 AND project_id = $2 RETURNING id",
    [req.params.lineItemId, project.id]
  );
  if (!result.rows[0]) throw new HttpError(404, "Budget line item not found");
  res.status(204).send();
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
    "SELECT id, amount FROM budget_line_items WHERE project_id = $1",
    [project.id]
  );
  if (lineItems.rows.length === 0) {
    throw new HttpError(400, "Add at least one budget line item before publishing");
  }

  const allocated = lineItems.rows.reduce((sum, li) => sum + Number(li.amount), 0);
  const goal = Number(project.goal_amount);
  if (Math.round(allocated * 100) !== Math.round(goal * 100)) {
    throw new HttpError(
      400,
      `Budget line items must add up exactly to the funding goal before publishing (currently ${allocated.toFixed(
        2
      )} of ${goal.toFixed(2)})`
    );
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
  const images = await pool.query(
    "SELECT * FROM project_images WHERE project_id = $1 ORDER BY created_at ASC",
    [project.id]
  );

  res.json({
    project: { ...project, raised_amount: Number(raised.rows[0].raised) },
    lineItems: lineItems.rows,
    images: images.rows,
  });
}

const projectImageSchema = z.object({
  imageUrl: z.string().min(1),
  caption: z.string().max(500).optional(),
});

export async function addProjectImage(req: Request, res: Response) {
  const parsed = projectImageSchema.safeParse(req.body);
  if (!parsed.success) {
    throw new HttpError(400, parsed.error.issues.map((i) => i.message).join(", "));
  }
  const project = await loadProjectOr404(req.params.id);
  if (project.entrepreneur_id !== req.user!.sub) {
    throw new HttpError(403, "Only the project owner can add photos to this project");
  }

  const { imageUrl, caption } = parsed.data;
  const result = await pool.query(
    `INSERT INTO project_images (project_id, image_url, caption) VALUES ($1, $2, $3) RETURNING *`,
    [project.id, imageUrl, caption ?? null]
  );
  res.status(201).json({ image: result.rows[0] });
}

export async function deleteProjectImage(req: Request, res: Response) {
  const project = await loadProjectOr404(req.params.id);
  if (project.entrepreneur_id !== req.user!.sub) {
    throw new HttpError(403, "Only the project owner can remove photos from this project");
  }

  const result = await pool.query(
    "DELETE FROM project_images WHERE id = $1 AND project_id = $2 RETURNING id",
    [req.params.imageId, project.id]
  );
  if (!result.rows[0]) throw new HttpError(404, "Project image not found");
  res.status(204).send();
}

// Owner-facing analytics: funding progress, per-line bid activity, and the
// escrow drawdown (how much of what's been awarded is still held vs. paid
// out), plus a heads-up on any open disputes.
export async function getProjectAnalytics(req: Request, res: Response) {
  const project = await loadProjectOr404(req.params.id);
  if (project.entrepreneur_id !== req.user!.sub) {
    throw new HttpError(403, "Only the project owner can view this project's analytics");
  }

  const raisedResult = await pool.query(
    `SELECT COALESCE(SUM(amount), 0) AS raised FROM contributions WHERE project_id = $1 AND status = 'recorded'`,
    [project.id]
  );
  const contributorResult = await pool.query(
    `SELECT COUNT(DISTINCT contributor_id) AS count FROM contributions WHERE project_id = $1 AND status = 'recorded'`,
    [project.id]
  );

  const lineItemsResult = await pool.query(
    `SELECT
       bli.id, bli.description, bli.category, bli.amount, bli.status, bli.disputed,
       COALESCE(bid_stats.bid_count, 0) AS bid_count,
       bid_stats.min_bid, bid_stats.max_bid, bid_stats.avg_bid,
       selected.amount AS selected_bid_amount,
       selected.vendor_id AS selected_vendor_id,
       d.status AS disbursement_status,
       d.amount AS disbursement_amount
     FROM budget_line_items bli
     LEFT JOIN (
       SELECT budget_line_item_id, COUNT(*) AS bid_count, MIN(amount) AS min_bid, MAX(amount) AS max_bid, AVG(amount) AS avg_bid
       FROM bids GROUP BY budget_line_item_id
     ) bid_stats ON bid_stats.budget_line_item_id = bli.id
     LEFT JOIN bids selected ON selected.budget_line_item_id = bli.id AND selected.status = 'selected'
     LEFT JOIN disbursements d ON d.budget_line_item_id = bli.id
     WHERE bli.project_id = $1
     ORDER BY bli.created_at ASC`,
    [project.id]
  );

  const disputeResult = await pool.query(
    `SELECT COUNT(*) AS count FROM disputes d
     JOIN budget_line_items bli ON bli.id = d.budget_line_item_id
     WHERE bli.project_id = $1 AND d.status = 'open'`,
    [project.id]
  );

  const lineItems = lineItemsResult.rows.map((row) => ({
    id: row.id,
    description: row.description,
    category: row.category,
    budgetedAmount: Number(row.amount),
    status: row.status,
    disputed: row.disputed,
    bidCount: Number(row.bid_count),
    minBid: row.min_bid !== null ? Number(row.min_bid) : null,
    maxBid: row.max_bid !== null ? Number(row.max_bid) : null,
    avgBid: row.avg_bid !== null ? Number(row.avg_bid) : null,
    selectedBidAmount: row.selected_bid_amount !== null ? Number(row.selected_bid_amount) : null,
    disbursementStatus: row.disbursement_status,
    disbursementAmount: row.disbursement_amount !== null ? Number(row.disbursement_amount) : null,
  }));

  const totalBudgeted = lineItems.reduce((sum, li) => sum + li.budgetedAmount, 0);
  const totalAwarded = lineItems
    .filter((li) => li.selectedBidAmount !== null)
    .reduce((sum, li) => sum + (li.selectedBidAmount ?? 0), 0);
  const totalHeld = lineItems
    .filter((li) => li.disbursementStatus === "held")
    .reduce((sum, li) => sum + (li.disbursementAmount ?? 0), 0);
  const totalReleased = lineItems
    .filter((li) => li.disbursementStatus === "released")
    .reduce((sum, li) => sum + (li.disbursementAmount ?? 0), 0);

  const raised = Number(raisedResult.rows[0].raised);
  const goal = Number(project.goal_amount);

  res.json({
    fundingProgressPct: goal > 0 ? Math.min(100, Math.round((raised / goal) * 10000) / 100) : 0,
    raisedAmount: raised,
    goalAmount: goal,
    contributorCount: Number(contributorResult.rows[0].count),
    openDisputeCount: Number(disputeResult.rows[0].count),
    drawdown: {
      totalBudgeted,
      totalAwarded,
      totalHeld,
      totalReleased,
      remainingToDisburse: Math.round((totalAwarded - totalReleased) * 100) / 100,
    },
    lineItems,
  });
}
