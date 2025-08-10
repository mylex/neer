-- Migration: 002_enhanced_search_indexes
-- Description: Add enhanced indexes for improved search and filtering performance
-- Created: 2024-01-01

-- Additional composite indexes for common search patterns
CREATE INDEX IF NOT EXISTS idx_properties_price_size ON properties(price, size_sqm) 
WHERE price IS NOT NULL AND size_sqm IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_properties_type_price_size ON properties(property_type, price, size_sqm) 
WHERE property_type IS NOT NULL AND price IS NOT NULL AND size_sqm IS NOT NULL;

-- Enhanced full-text search index with weights
DROP INDEX IF EXISTS idx_properties_fulltext;
CREATE INDEX idx_properties_fulltext ON properties 
USING gin(
  setweight(to_tsvector('english', COALESCE(title_en, '')), 'A') ||
  setweight(to_tsvector('english', COALESCE(location_en, '')), 'B') ||
  setweight(to_tsvector('english', COALESCE(description_en, '')), 'C')
)
WHERE title_en IS NOT NULL OR description_en IS NOT NULL OR location_en IS NOT NULL;

-- Index for Japanese text search (partial matching)
CREATE INDEX IF NOT EXISTS idx_properties_japanese_text ON properties 
USING gin(
  (title || ' ' || location || ' ' || COALESCE(description, '')) gin_trgm_ops
);

-- Ensure trigram extension is available for partial text matching
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Index for price range queries with better performance
CREATE INDEX IF NOT EXISTS idx_properties_price_range ON properties(price) 
WHERE price IS NOT NULL AND price > 0;

-- Index for size range queries
CREATE INDEX IF NOT EXISTS idx_properties_size_range ON properties(size_sqm) 
WHERE size_sqm IS NOT NULL AND size_sqm > 0;

-- Record this migration as applied
INSERT INTO migrations (migration_name) VALUES ('002_enhanced_search_indexes') ON CONFLICT (migration_name) DO NOTHING;