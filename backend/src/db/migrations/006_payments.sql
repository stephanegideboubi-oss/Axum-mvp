-- Real payment providers. Every statement is idempotent: this file is applied
-- automatically at backend startup (see src/db/migrate.ts), including against
-- databases created before it existed.

-- A contribution now waits as 'pending' until the payment provider confirms it.
ALTER TYPE contribution_status ADD VALUE IF NOT EXISTS 'pending';
ALTER TYPE contribution_status ADD VALUE IF NOT EXISTS 'failed';

ALTER TABLE contributions
    ADD COLUMN IF NOT EXISTS provider TEXT NOT NULL DEFAULT 'simulated',
    ADD COLUMN IF NOT EXISTS provider_ref TEXT,
    ADD COLUMN IF NOT EXISTS payment_method TEXT,
    ADD COLUMN IF NOT EXISTS refund_ref TEXT;

-- A provider's reference identifies exactly one contribution.
CREATE UNIQUE INDEX IF NOT EXISTS idx_contributions_provider_ref
    ON contributions(provider, provider_ref)
    WHERE provider_ref IS NOT NULL;
