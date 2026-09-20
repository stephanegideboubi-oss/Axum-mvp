-- Real file uploads (project photos, vendor portfolio photos, proof
-- documents) stored directly in Postgres, since there's no cloud storage
-- (S3, etc.) wired up yet. Fine for MVP-scale image volume; a real
-- storage bucket is the natural next step if usage grows.

CREATE TABLE IF NOT EXISTS uploaded_files (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    uploaded_by UUID NOT NULL REFERENCES users(id),
    mime_type TEXT NOT NULL,
    data BYTEA NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
