import crypto from "crypto";
import { pool } from "../config/db";

const GENESIS_HASH = "0".repeat(64);

function computeHash(prevHash: string, entry: {
  entity_type: string;
  entity_id: string;
  action: string;
  actor_id: string | null;
  payload: unknown;
  created_at: string;
}): string {
  const canonical = JSON.stringify(entry) + prevHash;
  return crypto.createHash("sha256").update(canonical).digest("hex");
}

/**
 * Appends a tamper-evident record: hash = sha256(entry + prevHash).
 * Runs inside the caller's transaction (pass a client) so the log write
 * commits atomically with the state change it describes.
 */
export async function appendAuditLog(
  client: { query: typeof pool.query },
  params: {
    entityType: string;
    entityId: string;
    action: string;
    actorId: string | null;
    payload: unknown;
  }
): Promise<void> {
  const lastResult = await client.query(
    `SELECT hash FROM audit_log ORDER BY id DESC LIMIT 1 FOR UPDATE`
  );
  const prevHash = lastResult.rows[0]?.hash ?? GENESIS_HASH;
  const createdAt = new Date().toISOString();

  const hash = computeHash(prevHash, {
    entity_type: params.entityType,
    entity_id: params.entityId,
    action: params.action,
    actor_id: params.actorId,
    payload: params.payload,
    created_at: createdAt,
  });

  await client.query(
    `INSERT INTO audit_log (entity_type, entity_id, action, actor_id, payload, prev_hash, hash, created_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
    [
      params.entityType,
      params.entityId,
      params.action,
      params.actorId,
      JSON.stringify(params.payload),
      prevHash,
      hash,
      createdAt,
    ]
  );
}

/** Recomputes the chain from row 1 and confirms every hash matches. Used by the admin integrity check. */
export async function verifyAuditChain(): Promise<{ valid: boolean; brokenAtId?: number }> {
  const { rows } = await pool.query(
    `SELECT id, entity_type, entity_id, action, actor_id, payload, prev_hash, hash, created_at
     FROM audit_log ORDER BY id ASC`
  );

  let expectedPrevHash = GENESIS_HASH;
  for (const row of rows) {
    const recomputed = computeHash(expectedPrevHash, {
      entity_type: row.entity_type,
      entity_id: row.entity_id,
      action: row.action,
      actor_id: row.actor_id,
      payload: row.payload,
      created_at: new Date(row.created_at).toISOString(),
    });
    if (row.prev_hash !== expectedPrevHash || row.hash !== recomputed) {
      return { valid: false, brokenAtId: row.id };
    }
    expectedPrevHash = row.hash;
  }
  return { valid: true };
}
