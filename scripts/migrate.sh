#!/bin/bash

# Database Migration Script
# Usage: ./scripts/migrate.sh [up|down|status|create] [migration_name] [--environment=development]

set -e

COMMAND=${1:-up}
MIGRATION_NAME=${2}
ENVIRONMENT=${3:-development}
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

# Parse environment flag
if [[ $ENVIRONMENT == --environment=* ]]; then
  ENVIRONMENT=${ENVIRONMENT#*=}
elif [[ $3 == --environment=* ]]; then
  ENVIRONMENT=${3#*=}
fi

echo "🗄️ Database Migration Tool"
echo "Command: $COMMAND"
echo "Environment: $ENVIRONMENT"

# Load environment configuration
case $ENVIRONMENT in
  development)
    DB_HOST=${DB_HOST:-localhost}
    DB_PORT=${DB_PORT:-5432}
    DB_NAME=${DB_NAME:-japanese_real_estate_dev}
    DB_USER=${DB_USER:-dev_user}
    DB_PASSWORD=${DB_PASSWORD:-dev_password}
    ;;
  production)
    if [ -z "$DB_HOST" ] || [ -z "$DB_NAME" ] || [ -z "$DB_USER" ] || [ -z "$DB_PASSWORD" ]; then
      echo "❌ Error: Production database environment variables not set"
      echo "Required: DB_HOST, DB_NAME, DB_USER, DB_PASSWORD"
      exit 1
    fi
    DB_PORT=${DB_PORT:-5432}
    ;;
  test)
    DB_HOST=${DB_HOST:-localhost}
    DB_PORT=${DB_PORT:-5433}
    DB_NAME=${DB_NAME:-japanese_real_estate_test}
    DB_USER=${DB_USER:-test_user}
    DB_PASSWORD=${DB_PASSWORD:-test_password}
    ;;
  *)
    echo "❌ Error: Invalid environment. Use: development, production, or test"
    exit 1
    ;;
esac

MIGRATIONS_DIR="$ROOT_DIR/backend/src/database/migrations"
PSQL_CMD="PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME"

# Function to check if database is accessible
check_database() {
  echo "🔍 Checking database connection..."
  if ! $PSQL_CMD -c "SELECT 1;" > /dev/null 2>&1; then
    echo "❌ Error: Cannot connect to database"
    echo "   Host: $DB_HOST:$DB_PORT"
    echo "   Database: $DB_NAME"
    echo "   User: $DB_USER"
    exit 1
  fi
  echo "✅ Database connection successful"
}

# Function to ensure migrations table exists
ensure_migrations_table() {
  echo "📋 Ensuring migrations table exists..."
  $PSQL_CMD -c "
    CREATE TABLE IF NOT EXISTS migrations (
      id SERIAL PRIMARY KEY,
      migration_name VARCHAR(255) UNIQUE NOT NULL,
      applied_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );
  " > /dev/null
}

# Function to get applied migrations
get_applied_migrations() {
  $PSQL_CMD -t -c "SELECT migration_name FROM migrations ORDER BY migration_name;" | sed 's/^ *//' | sed 's/ *$//'
}

# Function to get available migrations
get_available_migrations() {
  find "$MIGRATIONS_DIR" -name "*.sql" -type f | sort | xargs -I {} basename {} .sql
}

# Function to apply a migration
apply_migration() {
  local migration_file="$1"
  local migration_name=$(basename "$migration_file" .sql)
  
  echo "⬆️  Applying migration: $migration_name"
  
  # Check if already applied
  if $PSQL_CMD -t -c "SELECT 1 FROM migrations WHERE migration_name = '$migration_name';" | grep -q 1; then
    echo "⚠️  Migration $migration_name already applied, skipping"
    return 0
  fi
  
  # Apply migration
  if $PSQL_CMD -f "$migration_file"; then
    # Record migration as applied
    $PSQL_CMD -c "INSERT INTO migrations (migration_name) VALUES ('$migration_name');" > /dev/null
    echo "✅ Migration $migration_name applied successfully"
  else
    echo "❌ Error applying migration: $migration_name"
    exit 1
  fi
}

# Function to rollback a migration (if rollback file exists)
rollback_migration() {
  local migration_name="$1"
  local rollback_file="$MIGRATIONS_DIR/${migration_name}_rollback.sql"
  
  echo "⬇️  Rolling back migration: $migration_name"
  
  # Check if migration was applied
  if ! $PSQL_CMD -t -c "SELECT 1 FROM migrations WHERE migration_name = '$migration_name';" | grep -q 1; then
    echo "⚠️  Migration $migration_name not applied, skipping rollback"
    return 0
  fi
  
  # Check if rollback file exists
  if [ ! -f "$rollback_file" ]; then
    echo "❌ Error: Rollback file not found: $rollback_file"
    echo "Manual rollback required for migration: $migration_name"
    exit 1
  fi
  
  # Apply rollback
  if $PSQL_CMD -f "$rollback_file"; then
    # Remove migration record
    $PSQL_CMD -c "DELETE FROM migrations WHERE migration_name = '$migration_name';" > /dev/null
    echo "✅ Migration $migration_name rolled back successfully"
  else
    echo "❌ Error rolling back migration: $migration_name"
    exit 1
  fi
}

# Function to show migration status
show_status() {
  echo "📊 Migration Status"
  echo "=================="
  
  local applied_migrations=($(get_applied_migrations))
  local available_migrations=($(get_available_migrations))
  
  echo "Applied migrations:"
  if [ ${#applied_migrations[@]} -eq 0 ]; then
    echo "  (none)"
  else
    for migration in "${applied_migrations[@]}"; do
      echo "  ✅ $migration"
    done
  fi
  
  echo ""
  echo "Pending migrations:"
  local pending_found=false
  for migration in "${available_migrations[@]}"; do
    if [[ ! " ${applied_migrations[@]} " =~ " ${migration} " ]]; then
      echo "  ⏳ $migration"
      pending_found=true
    fi
  done
  
  if [ "$pending_found" = false ]; then
    echo "  (none)"
  fi
}

# Function to create a new migration
create_migration() {
  if [ -z "$MIGRATION_NAME" ]; then
    echo "❌ Error: Migration name required"
    echo "Usage: ./scripts/migrate.sh create migration_name"
    exit 1
  fi
  
  # Generate timestamp
  local timestamp=$(date +"%Y%m%d%H%M%S")
  local migration_file="$MIGRATIONS_DIR/${timestamp}_${MIGRATION_NAME}.sql"
  local rollback_file="$MIGRATIONS_DIR/${timestamp}_${MIGRATION_NAME}_rollback.sql"
  
  # Create migration file
  cat > "$migration_file" << EOF
-- Migration: ${timestamp}_${MIGRATION_NAME}
-- Description: ${MIGRATION_NAME}
-- Created: $(date +"%Y-%m-%d %H:%M:%S")

-- Add your migration SQL here
-- Example:
-- CREATE TABLE example (
--     id SERIAL PRIMARY KEY,
--     name VARCHAR(255) NOT NULL,
--     created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
-- );

-- Record this migration as applied
INSERT INTO migrations (migration_name) VALUES ('${timestamp}_${MIGRATION_NAME}') ON CONFLICT (migration_name) DO NOTHING;
EOF

  # Create rollback file
  cat > "$rollback_file" << EOF
-- Rollback for migration: ${timestamp}_${MIGRATION_NAME}
-- Description: Rollback ${MIGRATION_NAME}
-- Created: $(date +"%Y-%m-%d %H:%M:%S")

-- Add your rollback SQL here
-- Example:
-- DROP TABLE IF EXISTS example;

-- This rollback will be applied automatically when rolling back the migration
EOF

  echo "✅ Created migration files:"
  echo "   Migration: $migration_file"
  echo "   Rollback:  $rollback_file"
  echo ""
  echo "Edit these files and then run: ./scripts/migrate.sh up"
}

# Main command handling
case $COMMAND in
  up)
    check_database
    ensure_migrations_table
    
    echo "🚀 Running migrations..."
    local applied_count=0
    
    for migration_file in $(find "$MIGRATIONS_DIR" -name "*.sql" -not -name "*_rollback.sql" | sort); do
      apply_migration "$migration_file"
      applied_count=$((applied_count + 1))
    done
    
    echo "✅ Migration complete. Applied $applied_count migrations."
    ;;
    
  down)
    if [ -z "$MIGRATION_NAME" ]; then
      echo "❌ Error: Migration name required for rollback"
      echo "Usage: ./scripts/migrate.sh down migration_name"
      exit 1
    fi
    
    check_database
    ensure_migrations_table
    rollback_migration "$MIGRATION_NAME"
    ;;
    
  status)
    check_database
    ensure_migrations_table
    show_status
    ;;
    
  create)
    create_migration
    ;;
    
  *)
    echo "❌ Error: Invalid command: $COMMAND"
    echo ""
    echo "Usage: ./scripts/migrate.sh [command] [options]"
    echo ""
    echo "Commands:"
    echo "  up                    - Apply all pending migrations"
    echo "  down [migration]      - Rollback a specific migration"
    echo "  status                - Show migration status"
    echo "  create [name]         - Create a new migration"
    echo ""
    echo "Options:"
    echo "  --environment=ENV     - Set environment (development|production|test)"
    echo ""
    echo "Examples:"
    echo "  ./scripts/migrate.sh up"
    echo "  ./scripts/migrate.sh status --environment=production"
    echo "  ./scripts/migrate.sh create add_user_table"
    echo "  ./scripts/migrate.sh down 001_initial_schema"
    exit 1
    ;;
esac