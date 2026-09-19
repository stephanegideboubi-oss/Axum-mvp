import { Request, Response } from "express";
import { z } from "zod";
import { pool } from "../config/db";
import { HttpError } from "../middleware/errorHandler";
import { appendAuditLog } from "../services/auditLog";

export async function listVendors(req: Request, res: Response) {
  const status = typeof req.query.verification_status === "string" ? req.query.verification_status : undefined;
  const result = await pool.query(
    `SELECT id, email, name, business_registration_info, verification_status, created_at
     FROM users WHERE role = 'vendor' AND ($1::text IS NULL OR verification_status = $1::vendor_verification_status)
     ORDER BY created_at ASC`,
    [status ?? null]
  );
  res.json({ vendors: result.rows });
}

const verifySchema = z.object({
  status: z.enum(["verified", "rejected"]),
});

export async function verifyVendor(req: Request, res: Response) {
  const parsed = verifySchema.safeParse(req.body);
  if (!parsed.success) {
    throw new HttpError(400, parsed.error.issues.map((i) => i.message).join(", "));
  }

  const userResult = await pool.query("SELECT * FROM users WHERE id = $1 AND role = 'vendor'", [
    req.params.id,
  ]);
  if (!userResult.rows[0]) throw new HttpError(404, "Vendor not found");

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const result = await client.query(
      `UPDATE users SET verification_status = $1, updated_at = now() WHERE id = $2
       RETURNING id, email, name, business_registration_info, verification_status`,
      [parsed.data.status, req.params.id]
    );
    await appendAuditLog(client, {
      entityType: "user",
      entityId: req.params.id,
      action: `vendor.${parsed.data.status}`,
      actorId: req.user!.sub,
      payload: {},
    });
    await client.query("COMMIT");
    res.json({ vendor: result.rows[0] });
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}
