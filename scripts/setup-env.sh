#!/bin/bash

# Environment Setup Script
# Usage: ./scripts/setup-env.sh [development|production|test] [--validate]

set -e

ENVIRONMENT=${1:-development}
VALIDATE_FLAG=${2}
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

echo "🔧 Setting up environment: $ENVIRONMENT"

# Validate environment
case $ENVIRONMENT in
  development|production|test)
    ;;
  *)
    echo "❌ Error: Invalid environment. Use: development, production, or test"
    exit 1
    ;;
esac

# Function to validate required environment variables for production
validate_production_env() {
  echo "🔍 Validating production environment variables..."
  
  REQUIRED_VARS=(
    "DB_HOST"
    "DB_NAME" 
    "DB_USER"
    "DB_PASSWORD"
    "REDIS_HOST"
    "REDIS_PASSWORD"
    "CORS_ORIGIN"
    "REACT_APP_API_BASE_URL"
    "GOOGLE_TRANSLATE_API_KEY"
    "JWT_SECRET"
  )
  
  MISSING_VARS=()
  
  for var in "${REQUIRED_VARS[@]}"; do
    if [ -z "${!var}" ]; then
      MISSING_VARS+=("$var")
    fi
  done
  
  if [ ${#MISSING_VARS[@]} -ne 0 ]; then
    echo "❌ Missing required environment variables for production:"
    printf '   - %s\n' "${MISSING_VARS[@]}"
    echo ""
    echo "Please set these variables in your environment or .env.production file"
    return 1
  fi
  
  echo "✅ All required production environment variables are set"
  return 0
}

# Copy environment-specific files
echo "📋 Copying environment configuration..."

# Root environment file
if [ -f "$ROOT_DIR/.env.$ENVIRONMENT" ]; then
  cp "$ROOT_DIR/.env.$ENVIRONMENT" "$ROOT_DIR/.env"
  echo "✓ Copied .env.$ENVIRONMENT to .env"
fi

# Backend environment file
if [ -f "$ROOT_DIR/backend/.env.$ENVIRONMENT" ]; then
  cp "$ROOT_DIR/backend/.env.$ENVIRONMENT" "$ROOT_DIR/backend/.env"
  echo "✓ Copied backend/.env.$ENVIRONMENT to backend/.env"
else
  # Create backend .env from root if it doesn't exist
  if [ -f "$ROOT_DIR/.env" ]; then
    cp "$ROOT_DIR/.env" "$ROOT_DIR/backend/.env"
    echo "✓ Copied root .env to backend/.env"
  fi
fi

# Frontend environment file
if [ -f "$ROOT_DIR/frontend/.env.$ENVIRONMENT" ]; then
  cp "$ROOT_DIR/frontend/.env.$ENVIRONMENT" "$ROOT_DIR/frontend/.env"
  echo "✓ Copied frontend/.env.$ENVIRONMENT to frontend/.env"
else
  # Create frontend .env with React-specific variables
  echo "REACT_APP_API_BASE_URL=http://localhost:3001" > "$ROOT_DIR/frontend/.env"
  echo "REACT_APP_ENVIRONMENT=$ENVIRONMENT" >> "$ROOT_DIR/frontend/.env"
  echo "✓ Created frontend/.env with default values"
fi

# Shared environment file (if exists)
if [ -f "$ROOT_DIR/shared/.env.$ENVIRONMENT" ]; then
  cp "$ROOT_DIR/shared/.env.$ENVIRONMENT" "$ROOT_DIR/shared/.env"
  echo "✓ Copied shared/.env.$ENVIRONMENT to shared/.env"
fi

# Set executable permissions for scripts
chmod +x "$ROOT_DIR/scripts/"*.sh

# Create necessary directories
mkdir -p "$ROOT_DIR/logs"
mkdir -p "$ROOT_DIR/backend/logs"
mkdir -p "$ROOT_DIR/coverage/backend"
mkdir -p "$ROOT_DIR/coverage/frontend"
mkdir -p "$ROOT_DIR/coverage/shared"

echo "✅ Environment setup complete for: $ENVIRONMENT"

# Validate production environment if requested
if [ "$ENVIRONMENT" = "production" ] && [ "$VALIDATE_FLAG" = "--validate" ]; then
  # Source the environment file to load variables
  if [ -f "$ROOT_DIR/.env" ]; then
    set -a  # automatically export all variables
    source "$ROOT_DIR/.env"
    set +a
  fi
  
  validate_production_env || exit 1
fi

# Show environment-specific information
echo ""
echo "📊 Environment Information:"
echo "   Environment: $ENVIRONMENT"
echo "   Root directory: $ROOT_DIR"
echo "   Configuration files:"
echo "     - Root: .env"
echo "     - Backend: backend/.env"
echo "     - Frontend: frontend/.env"

# Show next steps
case $ENVIRONMENT in
  development)
    echo ""
    echo "🚀 Next steps for development:"
    echo "   1. Start all services: docker-compose --profile development up -d"
    echo "   2. Start with hot reload: docker-compose --profile development up"
    echo "   3. Or start individual services: npm run dev"
    echo "   4. View logs: docker-compose logs -f"
    echo ""
    echo "🔗 Service URLs:"
    echo "   - Frontend: http://localhost:3000"
    echo "   - Backend API: http://localhost:3001"
    echo "   - Database: localhost:5432"
    echo "   - Redis: localhost:6379"
    ;;
  production)
    echo ""
    echo "🚀 Next steps for production:"
    echo "   1. Validate environment: ./scripts/setup-env.sh production --validate"
    echo "   2. Build and start: ./scripts/deploy.sh production --build"
    echo "   3. Or start services: docker-compose -f docker-compose.prod.yml up -d"
    echo "   4. Run migrations: ./scripts/deploy.sh production --migrate"
    echo ""
    echo "⚠️  Production checklist:"
    echo "   - Set all required environment variables"
    echo "   - Configure SSL certificates in nginx/ssl/"
    echo "   - Set up monitoring and alerting"
    echo "   - Configure backup strategies"
    ;;
  test)
    echo ""
    echo "🧪 Next steps for testing:"
    echo "   1. Run all tests: docker-compose -f docker-compose.test.yml up --abort-on-container-exit"
    echo "   2. Run backend tests: cd backend && npm test"
    echo "   3. Run frontend tests: cd frontend && npm test"
    echo "   4. Run with coverage: npm run test:coverage"
    ;;
esac