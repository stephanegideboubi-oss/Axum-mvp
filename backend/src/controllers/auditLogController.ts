import { Request, Response } from "express";
import { pool } from "../config/db";
import { verifyAuditChain } from "../services/auditLog";

export async function getAuditLog(req: Request, res: Response) {
  const { entityType, entityId } = req.params;
  const result = await pool.query(
    `SELECT id, entity_type, entity_id, action, actor_id, payload, hash, prev_hash, created_at
     FROM audit_log
     WHERE entity_type = $1 AND entity_id = $2
     ORDER BY id ASC`,
    [entityType, entityId]
  );
  res.json({ entries: result.rows });
}

export async function verifyChain(_req: Request, res: Response) {
  res.json(await verifyAuditChain());
}
