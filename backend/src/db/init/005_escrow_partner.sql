-- Escrow partner role, a confirmation ledger contributors can point to as
-- proof the displayed escrow balance matches the bank's own records, and
-- dual-control release authorization (admin authorizes, bank executes).

ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'escrow_partner';

CREATE TABLE IF NOT EXISTS escrow_confirmations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    confirmed_total NUMERIC(14, 2) NOT NULL,
    confirmed_by UUID NOT NULL REFERENCES users(id),
    confirmed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_escrow_confirmations_project ON escrow_confirmations(project_id, confirmed_at DESC);

ALTER TABLE disbursements ADD COLUMN IF NOT EXISTS release_authorized_by UUID REFERENCES users(id);
ALTER TABLE disbursements ADD COLUMN IF NOT EXISTS release_authorized_at TIMESTAMPTZ;
