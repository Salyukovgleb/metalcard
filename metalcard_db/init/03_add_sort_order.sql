-- Migration: sort order for storefront / admin (matches app expectations)
ALTER TABLE designs
  ADD COLUMN IF NOT EXISTS sort_order INTEGER;
