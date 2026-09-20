import { Request, Response } from "express";
import { env } from "../config/env";
import { pool } from "../config/db";
import { HttpError } from "../middleware/errorHandler";

export async function uploadFile(req: Request, res: Response) {
  if (!req.file) throw new HttpError(400, "No file uploaded");

  const result = await pool.query(
    `INSERT INTO uploaded_files (uploaded_by, mime_type, data) VALUES ($1, $2, $3) RETURNING id`,
    [req.user!.sub, req.file.mimetype, req.file.buffer]
  );
  const id = result.rows[0].id;
  res.status(201).json({ id, url: `${env.publicBaseUrl}/uploads/${id}` });
}

export async function getFile(req: Request, res: Response) {
  const result = await pool.query(
    "SELECT mime_type, data FROM uploaded_files WHERE id = $1",
    [req.params.id]
  );
  const file = result.rows[0];
  if (!file) throw new HttpError(404, "File not found");

  res.setHeader("Content-Type", file.mime_type);
  res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
  res.send(file.data);
}
