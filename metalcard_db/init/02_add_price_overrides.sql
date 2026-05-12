-- Migration: Add price_overrides field to designs table
-- This allows per-design, per-color price overrides

-- Add price_overrides JSONB field to designs table
ALTER TABLE designs 
ADD COLUMN IF NOT EXISTS price_overrides JSONB DEFAULT '{}'::jsonb;

-- Add comment
COMMENT ON COLUMN designs.price_overrides IS 'Price overrides per color code: {"color_code": price}. If base_price > 0, it takes precedence.';

