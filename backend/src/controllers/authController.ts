import bcrypt from "bcryptjs";
import { Request, Response } from "express";
import { z } from "zod";
import { pool } from "../config/db";
import { HttpError } from "../middleware/errorHandler";
import { appendAuditLog } from "../services/auditLog";
import { signToken } from "../utils/jwt";

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8, "Password must be at least 8 characters"),
  name: z.string().min(1),
  // Admin accounts are never self-registered; see README for how to create the first one.
  role: z.enum(["entrepreneur", "contributor", "vendor"]),
  // Only used when role === "vendor"; ignored otherwise.
  businessRegistrationInfo: z.string().min(1).optional(),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
});

const PUBLIC_USER_FIELDS =
  "id, email, name, role, business_registration_info, verification_status, bio, created_at";

export async function register(req: Request, res: Response) {
  const parsed = registerSchema.safeParse(req.body);
  if (!parsed.success) {
    throw new HttpError(400, parsed.error.issues.map((i) => i.message).join(", "));
  }
  const { email, password, name, role, businessRegistrationInfo } = parsed.data;

  if (role === "vendor" && !businessRegistrationInfo) {
    throw new HttpError(400, "Vendors must provide business registration info");
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const existing = await client.query("SELECT id FROM users WHERE email = $1", [email]);
    if (existing.rows.length > 0) {
      throw new HttpError(409, "An account with this email already exists");
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const result = await client.query(
      `INSERT INTO users (email, password_hash, name, role, business_registration_info, verification_status)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING ${PUBLIC_USER_FIELDS}`,
      [
        email,
        passwordHash,
        name,
        role,
        role === "vendor" ? businessRegistrationInfo : null,
        role === "vendor" ? "pending" : null,
      ]
    );
    const user = result.rows[0];

    await appendAuditLog(client, {
      entityType: "user",
      entityId: user.id,
      action: "user.registered",
      actorId: user.id,
      payload: { email: user.email, role: user.role },
    });

    await client.query("COMMIT");

    const token = signToken({ sub: user.id, role: user.role });
    res.status(201).json({ token, user });
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}

export async function login(req: Request, res: Response) {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) {
    throw new HttpError(400, "Invalid email or password");
  }
  const { email, password } = parsed.data;

  const result = await pool.query(
    `SELECT ${PUBLIC_USER_FIELDS}, password_hash FROM users WHERE email = $1`,
    [email]
  );
  const user = result.rows[0];
  if (!user) throw new HttpError(401, "Invalid email or password");

  const valid = await bcrypt.compare(password, user.password_hash);
  if (!valid) throw new HttpError(401, "Invalid email or password");

  const token = signToken({ sub: user.id, role: user.role });
  delete user.password_hash;

  await appendAuditLog(pool, {
    entityType: "user",
    entityId: user.id,
    action: "user.logged_in",
    actorId: user.id,
    payload: {},
  });

  res.json({ token, user });
}

export async function me(req: Request, res: Response) {
  const result = await pool.query(`SELECT ${PUBLIC_USER_FIELDS} FROM users WHERE id = $1`, [
    req.user!.sub,
  ]);
  const user = result.rows[0];
  if (!user) throw new HttpError(404, "User not found");
  res.json({ user });
}
