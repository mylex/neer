-- Performance optimization migration
-- This migration adds additional indexes and optimizations for better query performance

-- Add partial indexes for better performance on filtered queries
CREATE INDEX IF NOT EXISTS idx_properties_translated_complete 
ON properties(id, price, location_en, property_type, size_sqm, created_at) 
WHERE translation_status = 'complete';

-- Add covering index for common search patterns
CREATE INDEX IF NOT EXISTS idx_properties_search_covering 
ON properties(price, property_type, size_sqm) 
WHERE translation_status = 'complete' AND price IS NOT NULL;

-- Add index for recent properties (commonly accessed)
CREATE INDEX IF NOT EXISTS idx_properties_recent 
ON properties(created_at DESC, id);

-- Add index for price range queries with location
CREATE INDEX IF NOT EXISTS idx_properties_price_location_type 
ON properties(price, location_en, property_type, created_at DESC) 
WHERE price IS NOT NULL AND location_en IS NOT NULL;

-- Optimize full-text search with better GIN index
DROP INDEX IF EXISTS idx_properties_fulltext;
CREATE INDEX IF NOT EXISTS idx_properties_fulltext_optimized 
ON properties USING gin(
  to_tsvector('english', 
    COALESCE(title_en, '') || ' ' || 
    COALESCE(description_en, '') || ' ' || 
    COALESCE(location_en, '') || ' ' ||
    COALESCE(property_type, '')
  )
) 
WHERE translation_status = 'complete';

-- Add index for property type distribution queries
CREATE INDEX IF NOT EXISTS idx_properties_type_stats 
ON properties(property_type, translation_status, created_at) 
WHERE property_type IS NOT NULL;

-- Add index for source website performance tracking
CREATE INDEX IF NOT EXISTS idx_properties_source_performance 
ON properties(source_website, translation_status, created_at, updated_at);

-- Create materialized view for frequently accessed statistics
CREATE MATERIALIZED VIEW IF NOT EXISTS property_stats_materialized AS
SELECT 
    COUNT(*) as total_properties,
    COUNT(*) FILTER (WHERE translation_status = 'complete') as translated_properties,
    COUNT(*) FILTER (WHERE translation_status = 'pending') as pending_translation,
    COUNT(*) FILTER (WHERE translation_status = 'failed') as failed_translation,
    AVG(price) FILTER (WHERE price IS NOT NULL) as avg_price,
    MIN(price) FILTER (WHERE price IS NOT NULL) as min_price,
    MAX(price) FILTER (WHERE price IS NOT NULL) as max_price,
    COUNT(DISTINCT source_website) as source_websites,
    MAX(created_at) as last_scraped,
    -- Property type distribution
    COUNT(*) FILTER (WHERE property_type = 'apartment') as apartment_count,
    COUNT(*) FILTER (WHERE property_type = 'house') as house_count,
    COUNT(*) FILTER (WHERE property_type = 'mansion') as mansion_count,
    COUNT(*) FILTER (WHERE property_type = 'land') as land_count,
    COUNT(*) FILTER (WHERE property_type IS NULL OR property_type NOT IN ('apartment', 'house', 'mansion', 'land')) as other_count,
    -- Recent activity
    COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '24 hours') as properties_last_24h,
    COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '7 days') as properties_last_7d,
    COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '30 days') as properties_last_30d
FROM properties;

-- Create unique index on materialized view for faster refresh
CREATE UNIQUE INDEX IF NOT EXISTS idx_property_stats_materialized_unique 
ON property_stats_materialized((1));

-- Function to refresh materialized view
CREATE OR REPLACE FUNCTION refresh_property_stats()
RETURNS void AS $$
BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY property_stats_materialized;
END;
$$ LANGUAGE plpgsql;

-- Create function for efficient property search with ranking
CREATE OR REPLACE FUNCTION search_properties_ranked(
    search_query text,
    min_price decimal DEFAULT NULL,
    max_price decimal DEFAULT NULL,
    location_filter text DEFAULT NULL,
    property_type_filter text DEFAULT NULL,
    min_size decimal DEFAULT NULL,
    max_size decimal DEFAULT NULL,
    source_filter text DEFAULT NULL,
    translation_status_filter text DEFAULT NULL,
    page_limit integer DEFAULT 20,
    page_offset integer DEFAULT 0
)
RETURNS TABLE(
    id integer,
    url varchar,
    title text,
    title_en text,
    price decimal,
    location text,
    location_en text,
    size_sqm decimal,
    property_type varchar,
    description text,
    description_en text,
    images jsonb,
    listing_date date,
    source_website varchar,
    translation_status varchar,
    created_at timestamptz,
    updated_at timestamptz,
    search_rank real
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        p.id,
        p.url,
        p.title,
        p.title_en,
        p.price,
        p.location,
        p.location_en,
        p.size_sqm,
        p.property_type,
        p.description,
        p.description_en,
        p.images,
        p.listing_date,
        p.source_website,
        p.translation_status,
        p.created_at,
        p.updated_at,
        ts_rank(
            to_tsvector('english', 
                COALESCE(p.title_en, '') || ' ' || 
                COALESCE(p.description_en, '') || ' ' || 
                COALESCE(p.location_en, '') || ' ' ||
                COALESCE(p.property_type, '')
            ),
            plainto_tsquery('english', search_query)
        ) as search_rank
    FROM properties p
    WHERE 
        to_tsvector('english', 
            COALESCE(p.title_en, '') || ' ' || 
            COALESCE(p.description_en, '') || ' ' || 
            COALESCE(p.location_en, '') || ' ' ||
            COALESCE(p.property_type, '')
        ) @@ plainto_tsquery('english', search_query)
        AND (min_price IS NULL OR p.price >= min_price)
        AND (max_price IS NULL OR p.price <= max_price)
        AND (location_filter IS NULL OR p.location ILIKE '%' || location_filter || '%' OR p.location_en ILIKE '%' || location_filter || '%')
        AND (property_type_filter IS NULL OR p.property_type = property_type_filter)
        AND (min_size IS NULL OR p.size_sqm >= min_size)
        AND (max_size IS NULL OR p.size_sqm <= max_size)
        AND (source_filter IS NULL OR p.source_website = source_filter)
        AND (translation_status_filter IS NULL OR p.translation_status = translation_status_filter)
    ORDER BY search_rank DESC, p.created_at DESC
    LIMIT page_limit OFFSET page_offset;
END;
$$ LANGUAGE plpgsql;

-- Add database-level configuration optimizations
-- These should be run by a database administrator

-- Increase shared_buffers for better caching (example values)
-- ALTER SYSTEM SET shared_buffers = '256MB';

-- Optimize work_mem for sorting and hashing operations
-- ALTER SYSTEM SET work_mem = '4MB';

-- Increase effective_cache_size to help query planner
-- ALTER SYSTEM SET effective_cache_size = '1GB';

-- Enable parallel query execution
-- ALTER SYSTEM SET max_parallel_workers_per_gather = 2;

-- Optimize random page cost for SSD storage
-- ALTER SYSTEM SET random_page_cost = 1.1;

-- Enable auto-vacuum for better maintenance
-- ALTER SYSTEM SET autovacuum = on;
-- ALTER SYSTEM SET autovacuum_max_workers = 3;

-- Note: After changing system settings, run: SELECT pg_reload_conf();

-- Create indexes for better join performance if needed in the future
-- These are prepared but commented out as they're not immediately needed

-- CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_properties_url_hash 
-- ON properties USING hash(url);

-- CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_properties_jsonb_images 
-- ON properties USING gin(images);

-- Add table statistics update
ANALYZE properties;

-- Record this migration as applied
INSERT INTO migrations (migration_name) VALUES ('003_performance_optimizations') ON CONFLICT (migration_name) DO NOTHING;