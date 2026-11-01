import crypto from "crypto";
import { pool } from "../config/db";

const GENESIS_HASH = "0".repeat(64);

// Arbitrary constant identifying the audit-log append lock (see appendAuditLog).
const AUDIT_APPEND_LOCK_KEY = 727001;

// Rows written before payloads were canonicalized were hashed with the payload's
// keys in whatever order the calling code wrote them, which Postgres' JSONB
// does not preserve. Verification recovers that by trying key orders, which is
// only affordable for small payloads; beyond this many keys it checks the
// canonical form only.
const MAX_KEYS_FOR_LEGACY_ORDER_SEARCH = 7;

interface HashedFields {
  entity_type: string;
  entity_id: string;
  action: string;
  actor_id: string | null;
  payload: unknown;
  created_at: string;
}

// Same value, with object keys sorted at every level, so the serialized form
// (and therefore the hash) does not depend on key order.
function canonicalize(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (value && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const key of Object.keys(value).sort()) {
      out[key] = canonicalize((value as Record<string, unknown>)[key]);
    }
    return out;
  }
  return value;
}

function hashEntry(prevHash: string, entry: HashedFields): string {
  // Field order here is fixed and must never change: it is part of the hash.
  const serialized = JSON.stringify({
    entity_type: entry.entity_type,
    entity_id: entry.entity_id,
    action: entry.action,
    actor_id: entry.actor_id,
    payload: entry.payload,
    created_at: entry.created_at,
  });
  return crypto.createHash("sha256").update(serialized + prevHash).digest("hex");
}

function computeHash(prevHash: string, entry: HashedFields): string {
  return hashEntry(prevHash, { ...entry, payload: canonicalize(entry.payload) });
}

function* keyOrders(keys: string[]): Generator<string[]> {
  if (keys.length <= 1) {
    yield keys;
    return;
  }
  for (let i = 0; i < keys.length; i++) {
    const rest = [...keys.slice(0, i), ...keys.slice(i + 1)];
    for (const order of keyOrders(rest)) yield [keys[i], ...order];
  }
}

// True if `storedHash` is what the pre-canonicalization code would have produced
// for this row under some key order of its payload. Content is still fully
// covered: any change to a field or value changes the hash under every order.
function matchesLegacyHash(prevHash: string, entry: HashedFields, storedHash: string): boolean {
  const payload = entry.payload;
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) return false;
  const keys = Object.keys(payload);
  if (keys.length > MAX_KEYS_FOR_LEGACY_ORDER_SEARCH) return false;
  for (const order of keyOrders(keys)) {
    const reordered: Record<string, unknown> = {};
    for (const key of order) {
      reordered[key] = canonicalize((payload as Record<string, unknown>)[key]);
    }
    if (hashEntry(prevHash, { ...entry, payload: reordered }) === storedHash) return true;
  }
  return false;
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
  // Serialize appenders until the surrounding transaction ends. Locking the last
  // row (FOR UPDATE) is not enough: a transaction waiting on it would resume
  // reading the same "last" row even after another one inserted a newer row, and
  // both would chain off it, forking the log.
  await client.query("SELECT pg_advisory_xact_lock($1)", [AUDIT_APPEND_LOCK_KEY]);

  const lastResult = await client.query(`SELECT hash FROM audit_log ORDER BY id DESC LIMIT 1`);
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
      JSON.stringify(canonicalize(params.payload)),
      prevHash,
      hash,
      createdAt,
    ]
  );
}

export interface AuditChainResult {
  valid: boolean;
  checked: number;
  // Rows written before payload canonicalization that verified under a recovered key order.
  legacyRows: number;
  brokenAtId?: string;
  reason?: "prev_hash_mismatch" | "hash_mismatch";
}

/**
 * Recomputes the chain from the first row and confirms every link and hash.
 * Gaps in `id` are not errors: a rolled-back transaction permanently consumes
 * a sequence value. Only the hash links matter.
 */
export async function verifyAuditChain(): Promise<AuditChainResult> {
  const { rows } = await pool.query(
    `SELECT id, entity_type, entity_id, action, actor_id, payload, prev_hash, hash, created_at
     FROM audit_log ORDER BY id ASC`
  );

  let expectedPrevHash = GENESIS_HASH;
  let legacyRows = 0;
  let checked = 0;
  for (const row of rows) {
    if (row.prev_hash !== expectedPrevHash) {
      return { valid: false, checked, legacyRows, brokenAtId: String(row.id), reason: "prev_hash_mismatch" };
    }
    const entry: HashedFields = {
      entity_type: row.entity_type,
      entity_id: row.entity_id,
      action: row.action,
      actor_id: row.actor_id,
      payload: row.payload,
      created_at: new Date(row.created_at).toISOString(),
    };
    if (row.hash !== computeHash(expectedPrevHash, entry)) {
      if (!matchesLegacyHash(expectedPrevHash, entry, row.hash)) {
        return { valid: false, checked, legacyRows, brokenAtId: String(row.id), reason: "hash_mismatch" };
      }
      legacyRows++;
    }
    expectedPrevHash = row.hash;
    checked++;
  }
  return { valid: true, checked, legacyRows };
}
