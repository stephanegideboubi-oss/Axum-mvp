import crypto from "crypto";
import { Request, Response } from "express";
import { z } from "zod";
import { env } from "../config/env";
import { pool } from "../config/db";
import { HttpError } from "../middleware/errorHandler";
import { reconcileContribution } from "../payments/contributionService";
import { enabledProviders, getProvider } from "../payments/registry";
import { getProjectEscrowStatus } from "../services/escrow";

const contributeSchema = z.object({
  amount: z.number().positive(),
  // Optional: defaults to the first real provider that is configured, else the simulated one.
  provider: z.string().optional(),
});

function generateUin(): string {
  const random = crypto.randomBytes(5).toString("hex").toUpperCase();
  return `AXM-${random}`;
}

// Provider references identify the payment on the provider's side; they are not
// something a tracking-number lookup or the contributor's list needs to reveal.
function publicContribution(row: any) {
  const { provider_ref, refund_ref, ...rest } = row;
  return rest;
}

/** Payment methods currently available, for the contribute form. */
export async function listProviders(_req: Request, res: Response) {
  res.json({
    providers: enabledProviders().map((p) => ({
      id: p.id,
      label: p.label,
      description: p.description,
      simulated: p.mode === "instant",
    })),
  });
}

export async function contribute(req: Request, res: Response) {
  const parsed = contributeSchema.safeParse(req.body);
  if (!parsed.success) {
    throw new HttpError(400, parsed.error.issues.map((i) => i.message).join(", "));
  }
  const { amount } = parsed.data;

  const available = enabledProviders();
  const chosenId =
    parsed.data.provider ?? (available.find((p) => p.mode === "redirect") ?? available[0])?.id;
  const provider = chosenId ? getProvider(chosenId) : undefined;
  if (!provider || !provider.isEnabled()) {
    throw new HttpError(400, "That payment method is not available");
  }

  const client = await pool.connect();
  let contribution: any;
  let project: any;
  try {
    await client.query("BEGIN");

    const projectResult = await client.query("SELECT * FROM projects WHERE id = $1 FOR UPDATE", [
      req.params.id,
    ]);
    project = projectResult.rows[0];
    if (!project) throw new HttpError(404, "Project not found");
    if (project.status !== "open") {
      throw new HttpError(409, "This project is not currently accepting contributions");
    }

    let uin = generateUin();
    for (let attempts = 0; attempts < 5; attempts++) {
      const clash = await client.query("SELECT 1 FROM contributions WHERE uin = $1", [uin]);
      if (clash.rows.length === 0) break;
      uin = generateUin();
    }

    // Created 'pending'; it only counts toward the project's total once the
    // provider confirms the money (see reconcileContribution).
    const inserted = await client.query(
      `INSERT INTO contributions (project_id, contributor_id, amount, currency, uin, status, provider)
       VALUES ($1, $2, $3, $4, $5, 'pending', $6) RETURNING *`,
      [project.id, req.user!.sub, amount, project.currency, uin, provider.id]
    );
    contribution = inserted.rows[0];

    if (provider.mode === "instant") {
      await client.query("UPDATE contributions SET provider_ref = $2 WHERE id = $1", [
        contribution.id,
        `sim-${contribution.id}`,
      ]);
    }

    await client.query("COMMIT");
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }

  if (provider.mode === "instant") {
    const result = await reconcileContribution(contribution.id);
    res.status(201).json({
      contribution: publicContribution(result.contribution),
      projectStatus: result.projectStatus,
      raised: result.raised,
    });
    return;
  }

  try {
    const userResult = await pool.query("SELECT email, name FROM users WHERE id = $1", [req.user!.sub]);
    const user = userResult.rows[0];
    const returnUrl = `${env.payments.frontendUrl}/contribution/return?c=${contribution.id}`;

    const checkout = await provider.createCheckout({
      contributionId: contribution.id,
      amount,
      currency: String(project.currency).trim(),
      description: `Contribution to ${project.title}`,
      customerEmail: user.email,
      customerName: user.name,
      successUrl: returnUrl,
      cancelUrl: `${returnUrl}&cancelled=1`,
    });

    const updated = await pool.query(
      "UPDATE contributions SET provider_ref = $2 WHERE id = $1 RETURNING *",
      [contribution.id, checkout.providerRef]
    );
    res.status(201).json({
      contribution: publicContribution(updated.rows[0]),
      redirectUrl: checkout.redirectUrl,
    });
  } catch (err) {
    console.error(`Could not start ${provider.id} checkout for contribution ${contribution.id}:`, err);
    await pool.query("UPDATE contributions SET status = 'failed' WHERE id = $1 AND status = 'pending'", [
      contribution.id,
    ]);
    throw new HttpError(502, "Could not start the payment. Please try again, or choose another method.");
  }
}

/**
 * The customer's return page asks us to check on their payment. We never take
 * the browser's word for it: the provider is asked directly (see reconcileContribution).
 */
export async function confirmContribution(req: Request, res: Response) {
  const owned = await pool.query("SELECT id FROM contributions WHERE id = $1 AND contributor_id = $2", [
    req.params.id,
    req.user!.sub,
  ]);
  if (owned.rows.length === 0) throw new HttpError(404, "Contribution not found");

  const result = await reconcileContribution(req.params.id);
  res.json({
    contribution: publicContribution(result.contribution),
    projectStatus: result.projectStatus,
    raised: result.raised,
  });
}

export async function myContributions(req: Request, res: Response) {
  const result = await pool.query(
    `SELECT c.*, p.title AS project_title, p.status AS project_status
     FROM contributions c JOIN projects p ON p.id = c.project_id
     WHERE c.contributor_id = $1 ORDER BY c.created_at DESC`,
    [req.user!.sub]
  );
  res.json({ contributions: result.rows.map(publicContribution) });
}

// Public lookup: anyone holding a UIN (e.g. from a receipt) can check that
// contribution's project status and line-item progress, per the spec's
// "log back in via UIN to track a project" flow.
export async function lookupByUin(req: Request, res: Response) {
  const contributionResult = await pool.query(
    "SELECT * FROM contributions WHERE uin = $1",
    [req.params.uin]
  );
  const contribution = contributionResult.rows[0];
  if (!contribution) throw new HttpError(404, "No contribution found for that UIN");

  const projectResult = await pool.query("SELECT * FROM projects WHERE id = $1", [
    contribution.project_id,
  ]);
  const lineItemsResult = await pool.query(
    "SELECT * FROM budget_line_items WHERE project_id = $1 ORDER BY created_at ASC",
    [contribution.project_id]
  );
  const escrow = await getProjectEscrowStatus(contribution.project_id);

  res.json({
    contribution: publicContribution(contribution),
    project: projectResult.rows[0],
    lineItems: lineItemsResult.rows,
    escrow,
  });
}
