-- Rollback for migration: 002_enhanced_search_indexes
-- Description: Rollback enhanced search indexes
-- Created: 2024-01-01

-- Drop enhanced indexes
DROP INDEX IF EXISTS idx_properties_type_stats;
DROP INDEX IF EXISTS idx_properties_source_performance;
DROP INDEX IF EXISTS idx_properties_price_location_type;
DROP INDEX IF EXISTS idx_properties_recent;
DROP INDEX IF EXISTS idx_properties_search_covering;
DROP INDEX IF EXISTS idx_properties_translated_complete;
DROP INDEX IF EXISTS idx_properties_fulltext_optimized;
DROP INDEX IF EXISTS idx_properties_japanese_text;
DROP INDEX IF EXISTS idx_properties_size_range;
DROP INDEX IF EXISTS idx_properties_price_range;
DROP INDEX IF EXISTS idx_properties_type_price_size;
DROP INDEX IF EXISTS idx_properties_price_size;

-- Recreate original full-text index
CREATE INDEX IF NOT EXISTS idx_properties_fulltext ON properties 
USING gin(to_tsvector('english', COALESCE(title_en, '') || ' ' || COALESCE(description_en, '') || ' ' || COALESCE(location_en, '')))
WHERE title_en IS NOT NULL OR description_en IS NOT NULL OR location_en IS NOT NULL;