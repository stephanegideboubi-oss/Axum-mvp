-- Vendor profile showcase: a short bio plus portfolio images (goods/services
-- they can provide). Images are stored as URLs, consistent with how proof
-- documents already work in this MVP — no file storage integration yet.

ALTER TABLE users ADD COLUMN IF NOT EXISTS bio TEXT;

CREATE TABLE IF NOT EXISTS vendor_portfolio_images (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    vendor_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    image_url TEXT NOT NULL,
    caption TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_vendor_portfolio_vendor ON vendor_portfolio_images(vendor_id);
