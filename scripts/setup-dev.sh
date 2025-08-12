#!/bin/bash

# Japanese Real Estate Scraper - Development Setup Script
# This script sets up the development environment

set -e

echo "🏗️  Japanese Real Estate Scraper - Development Setup"
echo "=================================================="

# Check prerequisites
echo "📋 Checking prerequisites..."

# Check Node.js
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js 18+ and try again."
    exit 1
fi

NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    echo "❌ Node.js version $NODE_VERSION is too old. Please install Node.js 18+ and try again."
    exit 1
fi

echo "✅ Node.js $(node -v) found"

# Check npm
if ! command -v npm &> /dev/null; then
    echo "❌ npm is not installed. Please install npm and try again."
    exit 1
fi

echo "✅ npm $(npm -v) found"

# Check Docker (optional)
if command -v docker &> /dev/null; then
    echo "✅ Docker $(docker --version | cut -d' ' -f3 | cut -d',' -f1) found"
    DOCKER_AVAILABLE=true
else
    echo "⚠️  Docker not found. You'll need to run PostgreSQL and Redis manually."
    DOCKER_AVAILABLE=false
fi

# Check Docker Compose (optional)
if command -v docker-compose &> /dev/null; then
    echo "✅ Docker Compose $(docker-compose --version | cut -d' ' -f3 | cut -d',' -f1) found"
    COMPOSE_AVAILABLE=true
else
    echo "⚠️  Docker Compose not found. You'll need to run services manually."
    COMPOSE_AVAILABLE=false
fi

echo ""

# Install dependencies
echo "📦 Installing dependencies..."
npm run install:all

echo ""

# Setup environment files
echo "⚙️  Setting up environment files..."

if [ ! -f "backend/.env.development" ]; then
    echo "📝 Creating backend/.env.development from template..."
    cp backend/.env.example backend/.env.development
    echo "✅ Created backend/.env.development"
else
    echo "✅ backend/.env.development already exists"
fi

if [ ! -f "frontend/.env.development" ]; then
    echo "📝 Creating frontend/.env.development from template..."
    cp frontend/.env.example frontend/.env.development
    echo "✅ Created frontend/.env.development"
else
    echo "✅ frontend/.env.development already exists"
fi

echo ""

# Setup database
echo "🗄️  Setting up database..."

if [ "$DOCKER_AVAILABLE" = true ] && [ "$COMPOSE_AVAILABLE" = true ]; then
    echo "🐳 Starting PostgreSQL and Redis with Docker..."
    docker-compose up -d postgres redis
    
    echo "⏳ Waiting for database to be ready..."
    sleep 10
    
    echo "🔄 Running database migrations..."
    npm run migrate:backend
    
    echo "✅ Database setup complete"
else
    echo "⚠️  Docker not available. Please ensure PostgreSQL and Redis are running locally:"
    echo "   - PostgreSQL on localhost:5432"
    echo "   - Redis on localhost:6379"
    echo "   - Database name: japanese_real_estate_scraper"
    echo ""
    echo "Then run: npm run migrate:backend"
fi

echo ""

# Final instructions
echo "🎉 Setup complete!"
echo ""
echo "📋 Next steps:"
echo "1. Edit environment files if needed:"
echo "   - backend/.env.development"
echo "   - frontend/.env.development"
echo ""
echo "2. Add your Google Translate API key to backend/.env.development:"
echo "   GOOGLE_TRANSLATE_API_KEY=your_api_key_here"
echo ""
echo "3. Start the development servers:"
echo "   npm run dev"
echo ""
echo "4. Access the application:"
echo "   - Frontend: http://localhost:3000"
echo "   - Backend API: http://localhost:3001"
echo "   - Health Check: http://localhost:3001/health"
echo ""
echo "📚 For more information, see README.md"
echo ""
echo "🚀 Happy coding!"