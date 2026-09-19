-- AXUM MVP schema (Phase 1 — donation-based, no real money movement)
-- audit_log is append-only and hash-chained (see backend/src/services/auditLog.ts).
-- This is the MVP stand-in for an "immutable disbursement log" per the spec.

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TYPE user_role AS ENUM ('entrepreneur', 'contributor', 'vendor', 'admin');
CREATE TYPE vendor_verification_status AS ENUM ('pending', 'verified', 'rejected');
CREATE TYPE project_status AS ENUM ('draft', 'open', 'funded', 'closed', 'failed');
CREATE TYPE line_item_status AS ENUM ('open', 'bidding', 'awarded', 'held', 'proof_submitted', 'released');
CREATE TYPE bid_status AS ENUM ('submitted', 'selected', 'rejected');
CREATE TYPE contribution_status AS ENUM ('recorded', 'refunded');
CREATE TYPE disbursement_status AS ENUM ('held', 'released');
CREATE TYPE proof_type AS ENUM ('invoice', 'payment_proof', 'photo');
CREATE TYPE dispute_status AS ENUM ('open', 'resolved');

CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    name TEXT NOT NULL,
    role user_role NOT NULL,
    -- vendor-only fields; NULL for other roles
    business_registration_info TEXT,
    verification_status vendor_verification_status,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE projects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    entrepreneur_id UUID NOT NULL REFERENCES users(id),
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    location TEXT NOT NULL,
    goal_amount NUMERIC(14, 2) NOT NULL CHECK (goal_amount > 0),
    currency CHAR(3) NOT NULL DEFAULT 'USD',
    status project_status NOT NULL DEFAULT 'draft',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE budget_line_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    description TEXT NOT NULL,
    category TEXT NOT NULL,
    location TEXT NOT NULL,
    quantity NUMERIC(14, 2) NOT NULL CHECK (quantity > 0),
    unit_cost NUMERIC(14, 2) NOT NULL CHECK (unit_cost > 0),
    amount NUMERIC(14, 2) NOT NULL CHECK (amount > 0),
    status line_item_status NOT NULL DEFAULT 'open',
    disputed BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE bids (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    budget_line_item_id UUID NOT NULL REFERENCES budget_line_items(id) ON DELETE CASCADE,
    vendor_id UUID NOT NULL REFERENCES users(id),
    amount NUMERIC(14, 2) NOT NULL CHECK (amount > 0),
    notes TEXT NOT NULL,
    status bid_status NOT NULL DEFAULT 'submitted',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Simulated contributions: no real payment gateway in Phase 1. Each row is
-- one contributor's pledge to one project, tagged with the UIN they use to
-- track it later.
CREATE TABLE contributions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES projects(id),
    contributor_id UUID NOT NULL REFERENCES users(id),
    amount NUMERIC(14, 2) NOT NULL CHECK (amount > 0),
    currency CHAR(3) NOT NULL DEFAULT 'USD',
    uin TEXT UNIQUE NOT NULL,
    status contribution_status NOT NULL DEFAULT 'recorded',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- One row per line item once its vendor is selected. status moves
-- held -> released via explicit admin actions (manual escrow simulation).
CREATE TABLE disbursements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    budget_line_item_id UUID UNIQUE NOT NULL REFERENCES budget_line_items(id) ON DELETE CASCADE,
    vendor_id UUID NOT NULL REFERENCES users(id),
    amount NUMERIC(14, 2) NOT NULL CHECK (amount > 0),
    status disbursement_status NOT NULL DEFAULT 'held',
    held_by UUID NOT NULL REFERENCES users(id),
    held_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    released_by UUID REFERENCES users(id),
    released_at TIMESTAMPTZ
);

CREATE TABLE proof_documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    budget_line_item_id UUID NOT NULL REFERENCES budget_line_items(id) ON DELETE CASCADE,
    uploaded_by UUID NOT NULL REFERENCES users(id),
    type proof_type NOT NULL,
    file_url TEXT NOT NULL,
    description TEXT,
    metadata JSONB NOT NULL DEFAULT '{}',
    uploaded_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- A contributor flags a single budget line as suspicious. Freezing is
-- automatic once flaggers' combined contribution amount reaches the
-- threshold share of the project's total funding (see disputes service).
CREATE TABLE disputes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    budget_line_item_id UUID NOT NULL REFERENCES budget_line_items(id) ON DELETE CASCADE,
    raised_by UUID NOT NULL REFERENCES users(id),
    reason TEXT NOT NULL,
    status dispute_status NOT NULL DEFAULT 'open',
    resolution_notes TEXT,
    resolved_by UUID REFERENCES users(id),
    resolved_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (budget_line_item_id, raised_by)
);

-- Append-only, hash-chained audit log. Never UPDATE/DELETE rows here from app code.
CREATE TABLE audit_log (
    id BIGSERIAL PRIMARY KEY,
    entity_type TEXT NOT NULL,
    entity_id UUID NOT NULL,
    action TEXT NOT NULL,
    actor_id UUID REFERENCES users(id),
    payload JSONB NOT NULL,
    prev_hash TEXT NOT NULL,
    hash TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_budget_line_items_project ON budget_line_items(project_id);
CREATE INDEX idx_bids_line_item ON bids(budget_line_item_id);
CREATE INDEX idx_contributions_project ON contributions(project_id);
CREATE INDEX idx_contributions_contributor ON contributions(contributor_id);
CREATE INDEX idx_disputes_line_item ON disputes(budget_line_item_id);
CREATE INDEX idx_audit_log_entity ON audit_log(entity_type, entity_id);
