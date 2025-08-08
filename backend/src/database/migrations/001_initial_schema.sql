-- Migration: 001_initial_schema
-- Description: Create initial database schema for Japanese real estate scraper
-- Created: 2024-01-01

-- Create migrations table to track applied migrations
CREATE TABLE IF NOT EXISTS migrations (
    id SERIAL PRIMARY KEY,
    migration_name VARCHAR(255) UNIQUE NOT NULL,
    applied_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Properties table - stores all scraped property information
CREATE TABLE IF NOT EXISTS properties (
    id SERIAL PRIMARY KEY,
    url VARCHAR(500) UNIQUE NOT NULL,
    title TEXT NOT NULL,
    title_en TEXT,
    price DECIMAL(12,2),
    location TEXT NOT NULL,
    location_en TEXT,
    size_sqm DECIMAL(8,2),
    property_type VARCHAR(50),
    description TEXT,
    description_en TEXT,
    images JSONB DEFAULT '[]'::jsonb,
    listing_date DATE,
    source_website VARCHAR(100) NOT NULL,
    translation_status VARCHAR(20) DEFAULT 'pending' CHECK (translation_status IN ('pending', 'complete', 'partial', 'failed')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance optimization
CREATE INDEX IF NOT EXISTS idx_properties_price ON properties(price) WHERE price IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_properties_location_en ON properties(location_en) WHERE location_en IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_properties_type ON properties(property_type) WHERE property_type IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_properties_size ON properties(size_sqm) WHERE size_sqm IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_properties_source ON properties(source_website);
CREATE INDEX IF NOT EXISTS idx_properties_listing_date ON properties(listing_date) WHERE listing_date IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_properties_translation_status ON properties(translation_status);
CREATE INDEX IF NOT EXISTS idx_properties_created_at ON properties(created_at);

-- Full-text search index for English content
CREATE INDEX IF NOT EXISTS idx_properties_fulltext ON properties 
USING gin(to_tsvector('english', COALESCE(title_en, '') || ' ' || COALESCE(description_en, '') || ' ' || COALESCE(location_en, '')))
WHERE title_en IS NOT NULL OR description_en IS NOT NULL OR location_en IS NOT NULL;

-- Composite indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_properties_price_type ON properties(price, property_type) WHERE price IS NOT NULL AND property_type IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_properties_location_price ON properties(location_en, price) WHERE location_en IS NOT NULL AND price IS NOT NULL;

-- Function to automatically update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger to automatically update updated_at on row updates
DROP TRIGGER IF EXISTS update_properties_updated_at ON properties;
CREATE TRIGGER update_properties_updated_at
    BEFORE UPDATE ON properties
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- View for properties with complete translations
CREATE OR REPLACE VIEW properties_translated AS
SELECT *
FROM properties
WHERE translation_status = 'complete'
AND title_en IS NOT NULL
AND description_en IS NOT NULL;

-- View for properties summary statistics
CREATE OR REPLACE VIEW property_stats AS
SELECT 
    COUNT(*) as total_properties,
    COUNT(*) FILTER (WHERE translation_status = 'complete') as translated_properties,
    COUNT(*) FILTER (WHERE translation_status = 'pending') as pending_translation,
    COUNT(*) FILTER (WHERE translation_status = 'failed') as failed_translation,
    AVG(price) FILTER (WHERE price IS NOT NULL) as avg_price,
    MIN(price) FILTER (WHERE price IS NOT NULL) as min_price,
    MAX(price) FILTER (WHERE price IS NOT NULL) as max_price,
    COUNT(DISTINCT source_website) as source_websites,
    MAX(created_at) as last_scraped
FROM properties;

-- Record this migration as applied
INSERT INTO migrations (migration_name) VALUES ('001_initial_schema') ON CONFLICT (migration_name) DO NOTHING;