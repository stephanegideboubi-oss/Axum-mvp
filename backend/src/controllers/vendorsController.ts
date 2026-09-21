import { Request, Response } from "express";
import { z } from "zod";
import { pool } from "../config/db";
import { HttpError } from "../middleware/errorHandler";
import { appendAuditLog } from "../services/auditLog";

export async function getVendorProfile(req: Request, res: Response) {
  const userResult = await pool.query(
    `SELECT id, name, business_registration_info, verification_status, bio, created_at
     FROM users WHERE id = $1 AND role = 'vendor'`,
    [req.params.id]
  );
  const vendor = userResult.rows[0];
  if (!vendor) throw new HttpError(404, "Vendor not found");

  const portfolioResult = await pool.query(
    "SELECT id, image_url, caption, created_at FROM vendor_portfolio_images WHERE vendor_id = $1 ORDER BY created_at DESC",
    [vendor.id]
  );

  const statsResult = await pool.query(
    `SELECT
       COUNT(*) FILTER (WHERE status IN ('submitted', 'selected', 'rejected')) AS total_bids,
       COUNT(*) FILTER (WHERE status = 'selected') AS jobs_won
     FROM bids WHERE vendor_id = $1`,
    [vendor.id]
  );
  const releasedResult = await pool.query(
    "SELECT COUNT(*) AS jobs_completed FROM disbursements WHERE vendor_id = $1 AND status = 'released'",
    [vendor.id]
  );

  res.json({
    vendor,
    portfolio: portfolioResult.rows,
    stats: {
      totalBids: Number(statsResult.rows[0].total_bids),
      jobsWon: Number(statsResult.rows[0].jobs_won),
      jobsCompleted: Number(releasedResult.rows[0].jobs_completed),
    },
  });
}

const updateProfileSchema = z.object({
  bio: z.string().max(2000).optional(),
  businessRegistrationInfo: z.string().min(1).optional(),
});

export async function updateMyVendorProfile(req: Request, res: Response) {
  const parsed = updateProfileSchema.safeParse(req.body);
  if (!parsed.success) {
    throw new HttpError(400, parsed.error.issues.map((i) => i.message).join(", "));
  }
  const { bio, businessRegistrationInfo } = parsed.data;

  const result = await pool.query(
    `UPDATE users SET
       bio = COALESCE($1, bio),
       business_registration_info = COALESCE($2, business_registration_info),
       updated_at = now()
     WHERE id = $3
     RETURNING id, name, business_registration_info, verification_status, bio, created_at`,
    [bio ?? null, businessRegistrationInfo ?? null, req.user!.sub]
  );
  await appendAuditLog(pool, {
    entityType: "user",
    entityId: req.user!.sub,
    action: "vendor.profile_updated",
    actorId: req.user!.sub,
    payload: {},
  });
  res.json({ vendor: result.rows[0] });
}

const portfolioImageSchema = z.object({
  imageUrl: z.string().min(1),
  caption: z.string().max(500).optional(),
});

export async function addPortfolioImage(req: Request, res: Response) {
  const parsed = portfolioImageSchema.safeParse(req.body);
  if (!parsed.success) {
    throw new HttpError(400, parsed.error.issues.map((i) => i.message).join(", "));
  }
  const { imageUrl, caption } = parsed.data;

  const result = await pool.query(
    `INSERT INTO vendor_portfolio_images (vendor_id, image_url, caption)
     VALUES ($1, $2, $3) RETURNING *`,
    [req.user!.sub, imageUrl, caption ?? null]
  );
  await appendAuditLog(pool, {
    entityType: "user",
    entityId: req.user!.sub,
    action: "vendor.portfolio_image_added",
    actorId: req.user!.sub,
    payload: {},
  });
  res.status(201).json({ image: result.rows[0] });
}

export async function deletePortfolioImage(req: Request, res: Response) {
  const result = await pool.query(
    "DELETE FROM vendor_portfolio_images WHERE id = $1 AND vendor_id = $2 RETURNING id",
    [req.params.imageId, req.user!.sub]
  );
  if (!result.rows[0]) throw new HttpError(404, "Portfolio image not found");
  await appendAuditLog(pool, {
    entityType: "user",
    entityId: req.user!.sub,
    action: "vendor.portfolio_image_removed",
    actorId: req.user!.sub,
    payload: {},
  });
  res.status(204).send();
}
