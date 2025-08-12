#!/bin/bash

# Japanese Real Estate Scraper - Health Check Script
# This script checks if all services are running correctly

set -e

echo "🏥 Japanese Real Estate Scraper - Health Check"
echo "============================================="

BACKEND_URL="http://localhost:3001"
FRONTEND_URL="http://localhost:3000"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to check HTTP endpoint
check_endpoint() {
    local url=$1
    local name=$2
    local expected_status=${3:-200}
    
    echo -n "🔍 Checking $name... "
    
    if command -v curl &> /dev/null; then
        response=$(curl -s -o /dev/null -w "%{http_code}" "$url" 2>/dev/null || echo "000")
        if [ "$response" = "$expected_status" ]; then
            echo -e "${GREEN}✅ OK${NC} (HTTP $response)"
            return 0
        else
            echo -e "${RED}❌ FAIL${NC} (HTTP $response)"
            return 1
        fi
    else
        echo -e "${YELLOW}⚠️  SKIP${NC} (curl not available)"
        return 0
    fi
}

# Function to check if port is open
check_port() {
    local host=$1
    local port=$2
    local name=$3
    
    echo -n "🔍 Checking $name port... "
    
    if command -v nc &> /dev/null; then
        if nc -z "$host" "$port" 2>/dev/null; then
            echo -e "${GREEN}✅ OPEN${NC} ($host:$port)"
            return 0
        else
            echo -e "${RED}❌ CLOSED${NC} ($host:$port)"
            return 1
        fi
    elif command -v telnet &> /dev/null; then
        if timeout 3 telnet "$host" "$port" &>/dev/null; then
            echo -e "${GREEN}✅ OPEN${NC} ($host:$port)"
            return 0
        else
            echo -e "${RED}❌ CLOSED${NC} ($host:$port)"
            return 1
        fi
    else
        echo -e "${YELLOW}⚠️  SKIP${NC} (nc/telnet not available)"
        return 0
    fi
}

# Check backend services
echo "🔧 Backend Services:"
check_endpoint "$BACKEND_URL/health" "Backend Health"
check_endpoint "$BACKEND_URL/api/properties" "Properties API"
check_endpoint "$BACKEND_URL/api/metrics" "Metrics API"

echo ""

# Check frontend service
echo "🎨 Frontend Service:"
check_endpoint "$FRONTEND_URL" "Frontend App"

echo ""

# Check infrastructure services
echo "🏗️  Infrastructure Services:"
check_port "localhost" "5432" "PostgreSQL"
check_port "localhost" "6379" "Redis"

echo ""

# Check Docker services (if available)
if command -v docker &> /dev/null; then
    echo "🐳 Docker Services:"
    
    # Check if containers are running
    if docker ps --format "table {{.Names}}\t{{.Status}}" | grep -E "(postgres|redis)" &>/dev/null; then
        echo -e "✅ Docker containers running:"
        docker ps --format "table {{.Names}}\t{{.Status}}" | grep -E "(postgres|redis)" | while read line; do
            echo "   $line"
        done
    else
        echo -e "${YELLOW}⚠️  No Docker containers found${NC}"
    fi
else
    echo -e "${YELLOW}⚠️  Docker not available${NC}"
fi

echo ""

# System information
echo "📊 System Information:"
echo "   Node.js: $(node -v 2>/dev/null || echo 'Not available')"
echo "   npm: $(npm -v 2>/dev/null || echo 'Not available')"
echo "   Docker: $(docker --version 2>/dev/null | cut -d' ' -f3 | cut -d',' -f1 || echo 'Not available')"
echo "   OS: $(uname -s) $(uname -r)"
echo "   Date: $(date)"

echo ""

# Final status
echo "🎯 Quick Test Commands:"
echo "   Backend Health: curl $BACKEND_URL/health"
echo "   Properties API: curl $BACKEND_URL/api/properties"
echo "   Frontend: open $FRONTEND_URL"

echo ""
echo "✅ Health check complete!"
echo "📚 For troubleshooting, see README.md"