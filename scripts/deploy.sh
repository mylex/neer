#!/bin/bash

# Deployment Script
# Usage: ./scripts/deploy.sh [development|production|test] [--build] [--migrate]

set -e

ENVIRONMENT=${1:-development}
BUILD_FLAG=${2}
MIGRATE_FLAG=${3}
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

echo "🚀 Starting deployment for environment: $ENVIRONMENT"

# Validate environment
case $ENVIRONMENT in
  development|production|test)
    ;;
  *)
    echo "❌ Error: Invalid environment. Use: development, production, or test"
    exit 1
    ;;
esac

# Setup environment
echo "📋 Setting up environment configuration..."
"$ROOT_DIR/scripts/setup-env.sh" "$ENVIRONMENT"

# Choose docker-compose file
COMPOSE_FILE="docker-compose.yml"
COMPOSE_PROFILE=""

case $ENVIRONMENT in
  development)
    COMPOSE_PROFILE="--profile development"
    ;;
  production)
    COMPOSE_FILE="docker-compose.prod.yml"
    ;;
  test)
    COMPOSE_FILE="docker-compose.test.yml"
    ;;
esac

echo "📦 Using compose file: $COMPOSE_FILE"

# Build images if requested
if [[ "$BUILD_FLAG" == "--build" || "$MIGRATE_FLAG" == "--build" ]]; then
  echo "🔨 Building Docker images..."
  docker-compose -f "$COMPOSE_FILE" build --no-cache
fi

# Stop existing containers
echo "🛑 Stopping existing containers..."
docker-compose -f "$COMPOSE_FILE" down

# Start database and cache services first
echo "🗄️ Starting database and cache services..."
if [ "$ENVIRONMENT" == "development" ]; then
  docker-compose -f "$COMPOSE_FILE" up -d postgres redis
elif [ "$ENVIRONMENT" == "production" ]; then
  docker-compose -f "$COMPOSE_FILE" up -d postgres redis
elif [ "$ENVIRONMENT" == "test" ]; then
  docker-compose -f "$COMPOSE_FILE" up -d postgres-test redis-test
fi

# Wait for database to be ready
echo "⏳ Waiting for database to be ready..."
sleep 10

# Run migrations if requested
if [[ "$MIGRATE_FLAG" == "--migrate" || "$BUILD_FLAG" == "--migrate" ]]; then
  echo "🔄 Running database migrations..."
  if [ "$ENVIRONMENT" == "development" ]; then
    echo "Running development migrations..."
    "$ROOT_DIR/scripts/migrate.sh" up --environment=development
  elif [ "$ENVIRONMENT" == "production" ]; then
    echo "⚠️  Production migrations require explicit confirmation"
    echo "Run manually: ./scripts/migrate.sh up --environment=production"
    echo "Or use: ./scripts/migrate.sh status --environment=production"
  elif [ "$ENVIRONMENT" == "test" ]; then
    echo "Running test migrations..."
    "$ROOT_DIR/scripts/migrate.sh" up --environment=test
  fi
fi

# Start all services
echo "🚀 Starting all services..."
if [ "$ENVIRONMENT" == "test" ]; then
  docker-compose -f "$COMPOSE_FILE" up --abort-on-container-exit
else
  docker-compose -f "$COMPOSE_FILE" $COMPOSE_PROFILE up -d
fi

# Health check
echo "🏥 Performing health checks..."
sleep 15

if [ "$ENVIRONMENT" != "test" ]; then
  # Run comprehensive verification
  if "$ROOT_DIR/scripts/verify-deployment.sh" "$ENVIRONMENT"; then
    echo "✅ Deployment verification passed"
  else
    echo "❌ Deployment verification failed"
    echo "Check the issues above and run: ./scripts/verify-deployment.sh $ENVIRONMENT"
  fi
fi

echo "🎉 Deployment complete!"

# Show service URLs
if [ "$ENVIRONMENT" != "test" ]; then
  echo ""
  echo "📍 Service URLs:"
  echo "   Frontend: http://localhost:3000"
  echo "   Backend API: http://localhost:3001"
  echo "   API Health: http://localhost:3001/api/health"
  echo ""
  echo "📊 View logs: docker-compose -f $COMPOSE_FILE logs -f"
  echo "🛑 Stop services: docker-compose -f $COMPOSE_FILE down"
fi