#!/bin/bash

# Deployment Verification Script
# Usage: ./scripts/verify-deployment.sh [environment]

set -e

ENVIRONMENT=${1:-development}
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

echo "🔍 Verifying deployment for environment: $ENVIRONMENT"

# Set URLs based on environment
case $ENVIRONMENT in
  development)
    FRONTEND_URL="http://localhost:3000"
    BACKEND_URL="http://localhost:3001"
    ;;
  production)
    FRONTEND_URL=${REACT_APP_API_BASE_URL:-"http://localhost:3000"}
    BACKEND_URL=${API_BASE_URL:-"http://localhost:3001"}
    ;;
  test)
    FRONTEND_URL="http://localhost:3000"
    BACKEND_URL="http://localhost:3002"
    ;;
  *)
    echo "❌ Invalid environment: $ENVIRONMENT"
    exit 1
    ;;
esac

# Function to check HTTP endpoint
check_endpoint() {
  local url=$1
  local name=$2
  local expected_status=${3:-200}
  
  echo -n "Checking $name ($url)... "
  
  if response=$(curl -s -o /dev/null -w "%{http_code}" --connect-timeout 10 "$url" 2>/dev/null); then
    if [ "$response" -eq "$expected_status" ]; then
      echo "✅ OK ($response)"
      return 0
    else
      echo "❌ FAIL (HTTP $response, expected $expected_status)"
      return 1
    fi
  else
    echo "❌ FAIL (Connection failed)"
    return 1
  fi
}

# Function to check Docker container
check_container() {
  local container_name=$1
  local service_name=$2
  
  echo -n "Checking $service_name container... "
  
  if docker ps --format "table {{.Names}}\t{{.Status}}" | grep -q "$container_name.*Up"; then
    echo "✅ Running"
    return 0
  else
    echo "❌ Not running or unhealthy"
    return 1
  fi
}

# Function to check database connection
check_database() {
  echo -n "Checking database connection... "
  
  # Try to connect to database through backend health endpoint
  if check_endpoint "$BACKEND_URL/api/health" "Database" 200 >/dev/null 2>&1; then
    echo "✅ Connected"
    return 0
  else
    echo "❌ Connection failed"
    return 1
  fi
}

# Start verification
echo "===================="
echo "🐳 Docker Containers"
echo "===================="

CONTAINERS_OK=true

case $ENVIRONMENT in
  development)
    check_container "japanese-real-estate-db" "PostgreSQL" || CONTAINERS_OK=false
    check_container "japanese-real-estate-redis" "Redis" || CONTAINERS_OK=false
    check_container "japanese-real-estate-backend-dev" "Backend (Dev)" || CONTAINERS_OK=false
    check_container "japanese-real-estate-frontend-dev" "Frontend (Dev)" || CONTAINERS_OK=false
    ;;
  production)
    check_container "japanese-real-estate-db-prod" "PostgreSQL" || CONTAINERS_OK=false
    check_container "japanese-real-estate-redis-prod" "Redis" || CONTAINERS_OK=false
    check_container "japanese-real-estate-backend-prod" "Backend" || CONTAINERS_OK=false
    check_container "japanese-real-estate-frontend-prod" "Frontend" || CONTAINERS_OK=false
    ;;
  test)
    check_container "japanese-real-estate-db-test" "PostgreSQL (Test)" || CONTAINERS_OK=false
    check_container "japanese-real-estate-redis-test" "Redis (Test)" || CONTAINERS_OK=false
    ;;
esac

echo ""
echo "🌐 Service Endpoints"
echo "==================="

ENDPOINTS_OK=true

if [ "$ENVIRONMENT" != "test" ]; then
  check_endpoint "$BACKEND_URL/api/health" "Backend Health" || ENDPOINTS_OK=false
  check_endpoint "$FRONTEND_URL" "Frontend" || ENDPOINTS_OK=false
  
  # Additional API endpoints
  check_endpoint "$BACKEND_URL/api/properties" "Properties API" || ENDPOINTS_OK=false
fi

echo ""
echo "🗄️ Database & Cache"
echo "==================="

DATABASE_OK=true

if [ "$ENVIRONMENT" != "test" ]; then
  check_database || DATABASE_OK=false
fi

# Summary
echo ""
echo "📊 Verification Summary"
echo "======================"

if [ "$CONTAINERS_OK" = true ] && [ "$ENDPOINTS_OK" = true ] && [ "$DATABASE_OK" = true ]; then
  echo "✅ All checks passed! Deployment is healthy."
  
  if [ "$ENVIRONMENT" != "test" ]; then
    echo ""
    echo "🔗 Service URLs:"
    echo "   Frontend: $FRONTEND_URL"
    echo "   Backend API: $BACKEND_URL"
    echo "   Health Check: $BACKEND_URL/api/health"
  fi
  
  exit 0
else
  echo "❌ Some checks failed. Please review the issues above."
  
  echo ""
  echo "🔧 Troubleshooting:"
  echo "   - Check container logs: docker-compose logs [service]"
  echo "   - Verify environment configuration"
  echo "   - Ensure all required services are running"
  echo "   - Check network connectivity"
  
  exit 1
fi