-- Initial database setup for Japanese Real Estate Scraper
-- This will be expanded in later tasks with the full schema

-- Create database if it doesn't exist (handled by Docker environment)
-- CREATE DATABASE japanese_real_estate_dev;

-- Create extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- Basic health check table
CREATE TABLE IF NOT EXISTS health_check (
    id SERIAL PRIMARY KEY,
    status VARCHAR(50) NOT NULL DEFAULT 'healthy',
    last_check TIMESTAMP DEFAULT NOW()
);

-- Insert initial health check record
INSERT INTO health_check (status) VALUES ('initialized');