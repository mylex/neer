-- Rollback for migration: 003_performance_optimizations
-- Description: Rollback performance optimizations
-- Created: 2024-01-01

-- Drop functions
DROP FUNCTION IF EXISTS search_properties_ranked(text, decimal, decimal, text, text, decimal, decimal, text, text, integer, integer);
DROP FUNCTION IF EXISTS refresh_property_stats();

-- Drop materialized view and its index
DROP INDEX IF EXISTS idx_property_stats_materialized_unique;
DROP MATERIALIZED VIEW IF EXISTS property_stats_materialized;

-- Drop performance indexes
DROP INDEX IF EXISTS idx_properties_source_performance;
DROP INDEX IF EXISTS idx_properties_type_stats;
DROP INDEX IF EXISTS idx_properties_fulltext_optimized;
DROP INDEX IF EXISTS idx_properties_price_location_type;
DROP INDEX IF EXISTS idx_properties_recent;
DROP INDEX IF EXISTS idx_properties_search_covering;
DROP INDEX IF EXISTS idx_properties_translated_complete;

-- Note: Database configuration changes need to be reverted manually by DBA
-- Examples of what might need to be reverted:
-- ALTER SYSTEM SET shared_buffers = 'default_value';
-- ALTER SYSTEM SET work_mem = 'default_value';
-- etc.