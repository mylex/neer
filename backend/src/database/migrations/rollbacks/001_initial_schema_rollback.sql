-- Rollback for migration: 001_initial_schema
-- Description: Rollback initial database schema
-- Created: 2024-01-01

-- Drop views first (dependent objects)
DROP VIEW IF EXISTS property_stats;
DROP VIEW IF EXISTS properties_translated;

-- Drop triggers
DROP TRIGGER IF EXISTS update_properties_updated_at ON properties;

-- Drop functions
DROP FUNCTION IF EXISTS update_updated_at_column();

-- Drop indexes
DROP INDEX IF EXISTS idx_properties_location_price;
DROP INDEX IF EXISTS idx_properties_price_type;
DROP INDEX IF EXISTS idx_properties_fulltext;
DROP INDEX IF EXISTS idx_properties_created_at;
DROP INDEX IF EXISTS idx_properties_translation_status;
DROP INDEX IF EXISTS idx_properties_listing_date;
DROP INDEX IF EXISTS idx_properties_source;
DROP INDEX IF EXISTS idx_properties_size;
DROP INDEX IF EXISTS idx_properties_type;
DROP INDEX IF EXISTS idx_properties_location_en;
DROP INDEX IF EXISTS idx_properties_price;

-- Drop main table
DROP TABLE IF EXISTS properties;

-- Drop migrations table (be careful with this in production)
-- DROP TABLE IF EXISTS migrations;