import { pool } from "../config/db";

export interface EscrowStatus {
  totalHeld: number;
  totalReleased: number;
  confirmation: {
    bankName: string;
    confirmedAt: string;
    confirmedTotal: number;
    isCurrent: boolean;
  } | null;
  pendingAuthorization: { lineItemId: string; description: string; amount: number }[];
}

// Live-computed from disbursements — this is the number the escrow partner's
// confirmation is checked against, not anything cached or self-reported.
export async function getProjectEscrowStatus(projectId: string): Promise<EscrowStatus> {
  const totals = await pool.query(
    `SELECT
       COALESCE(SUM(d.amount) FILTER (WHERE d.status = 'held'), 0) AS total_held,
       COALESCE(SUM(d.amount) FILTER (WHERE d.status = 'released'), 0) AS total_released
     FROM disbursements d
     JOIN budget_line_items bli ON bli.id = d.budget_line_item_id
     WHERE bli.project_id = $1`,
    [projectId]
  );
  const totalHeld = Number(totals.rows[0].total_held);
  const totalReleased = Number(totals.rows[0].total_released);

  const confirmationResult = await pool.query(
    `SELECT ec.confirmed_total, ec.confirmed_at, u.name AS bank_name
     FROM escrow_confirmations ec
     JOIN users u ON u.id = ec.confirmed_by
     WHERE ec.project_id = $1
     ORDER BY ec.confirmed_at DESC LIMIT 1`,
    [projectId]
  );
  const confirmationRow = confirmationResult.rows[0];
  const confirmation = confirmationRow
    ? {
        bankName: confirmationRow.bank_name as string,
        confirmedAt: confirmationRow.confirmed_at as string,
        confirmedTotal: Number(confirmationRow.confirmed_total),
        isCurrent: Number(confirmationRow.confirmed_total) === totalHeld,
      }
    : null;

  const pendingResult = await pool.query(
    `SELECT bli.id AS line_item_id, bli.description, d.amount
     FROM budget_line_items bli
     JOIN disbursements d ON d.budget_line_item_id = bli.id
     WHERE bli.project_id = $1 AND bli.status = 'proof_submitted' AND d.release_authorized_by IS NULL`,
    [projectId]
  );

  return {
    totalHeld,
    totalReleased,
    confirmation,
    pendingAuthorization: pendingResult.rows.map((r) => ({
      lineItemId: r.line_item_id,
      description: r.description,
      amount: Number(r.amount),
    })),
  };
}
