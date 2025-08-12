# Troubleshooting Guide

This guide helps resolve common issues when setting up and running the Japanese Real Estate Scraper.

## 🚀 Quick Diagnostics

Run the health check script to identify issues:
```bash
npm run health
```

## 🔧 Common Issues

### 1. Port Already in Use

**Error**: `EADDRINUSE: address already in use :::3000` or `:::3001`

**Solutions**:
```bash
# Find what's using the port
lsof -i :3000  # or :3001

# Kill the process
kill -9 <PID>

# Or change the port in environment files
# Backend: Edit backend/.env.development -> PORT=3002
# Frontend: Edit frontend/.env.development -> PORT=3001
```

### 2. Database Connection Issues

**Error**: `Connection refused` or `Database connection failed`

**Solutions**:
```bash
# Check if PostgreSQL is running
npm run health

# Start with Docker
docker-compose up -d postgres

# Or install locally (macOS)
brew install postgresql
brew services start postgresql

# Create database
createdb japanese_real_estate_scraper

# Run migrations
npm run migrate:backend
```

### 3. Redis Connection Issues

**Error**: `Redis connection failed` or `ECONNREFUSED redis`

**Solutions**:
```bash
# Start with Docker
docker-compose up -d redis

# Or install locally (macOS)
brew install redis
brew services start redis

# Test connection
redis-cli ping  # Should return PONG
```

### 4. Translation API Issues

**Error**: `Translation service unavailable` or `Invalid API key`

**Solutions**:
1. Get a Google Translate API key from [Google Cloud Console](https://console.cloud.google.com/)
2. Enable the Translation API
3. Add to `backend/.env.development`:
   ```
   GOOGLE_TRANSLATE_API_KEY=your_actual_api_key_here
   ```

### 5. Node.js Version Issues

**Error**: `Unsupported Node.js version` or syntax errors

**Solutions**:
```bash
# Check version
node -v

# Install Node.js 18+ using nvm (recommended)
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
nvm install 18
nvm use 18

# Or download from nodejs.org
```

### 6. npm Install Issues

**Error**: `npm ERR!` during installation

**Solutions**:
```bash
# Clear npm cache
npm cache clean --force

# Delete node_modules and reinstall
npm run clean
npm run install:all

# Use specific npm version
npm install -g npm@latest
```

### 7. Docker Issues

**Error**: `Docker daemon not running` or `docker-compose command not found`

**Solutions**:
```bash
# Install Docker Desktop (macOS/Windows)
# Download from docker.com

# Start Docker daemon
open -a Docker  # macOS

# Install docker-compose (if not included)
pip install docker-compose
```

### 8. Permission Issues

**Error**: `EACCES` or permission denied

**Solutions**:
```bash
# Fix npm permissions (avoid sudo)
mkdir ~/.npm-global
npm config set prefix '~/.npm-global'
echo 'export PATH=~/.npm-global/bin:$PATH' >> ~/.bashrc
source ~/.bashrc

# Or use nvm (recommended)
```

### 9. Build Issues

**Error**: TypeScript compilation errors or build failures

**Solutions**:
```bash
# Clean and rebuild
npm run clean
npm run install:all
npm run build

# Check TypeScript version
npx tsc --version

# Fix specific component
cd backend && npm run build
cd frontend && npm run build
```

### 10. Test Failures

**Error**: Tests failing or not running

**Solutions**:
```bash
# Run tests individually
npm run test:backend
npm run test:frontend

# Run with verbose output
cd backend && npm test -- --verbose
cd frontend && npm test -- --verbose --watchAll=false

# Clear Jest cache
cd backend && npx jest --clearCache
cd frontend && npx jest --clearCache
```

## 🐛 Debugging Steps

### 1. Check Logs
```bash
# Backend logs
tail -f backend/logs/app.log
tail -f backend/logs/error.log

# Docker logs
docker-compose logs -f backend
docker-compose logs -f frontend
```

### 2. Verify Environment
```bash
# Check environment variables
cd backend && node -e "console.log(process.env.DATABASE_URL)"
cd frontend && node -e "console.log(process.env.REACT_APP_API_BASE_URL)"
```

### 3. Test API Endpoints
```bash
# Health check
curl http://localhost:3001/health

# Properties API
curl http://localhost:3001/api/properties

# With verbose output
curl -v http://localhost:3001/health
```

### 4. Database Debugging
```bash
# Connect to database
psql -d japanese_real_estate_scraper

# Check tables
\dt

# Check migrations
SELECT * FROM migrations;
```

### 5. Network Issues
```bash
# Check if ports are open
netstat -an | grep :3001
netstat -an | grep :3000

# Test connectivity
telnet localhost 3001
telnet localhost 5432
```

## 🔄 Reset Everything

If all else fails, completely reset the environment:

```bash
# Stop all services
docker-compose down -v

# Clean everything
npm run clean

# Remove Docker volumes (careful!)
docker volume prune

# Start fresh
npm run setup:dev
```

## 📞 Getting Help

### 1. Check System Status
```bash
npm run health
npm run test:system
```

### 2. Gather Information
When reporting issues, include:
- Operating system and version
- Node.js and npm versions
- Error messages (full stack trace)
- Steps to reproduce
- Output of `npm run health`

### 3. Common Commands for Support
```bash
# System information
node -v && npm -v && docker --version

# Service status
npm run health

# Recent logs
tail -n 50 backend/logs/error.log

# Environment check
env | grep -E "(NODE_ENV|DATABASE_URL|REDIS_URL)"
```

## 🛠️ Development Tips

### 1. Use Development Tools
```bash
# Watch mode for backend
cd backend && npm run dev

# React DevTools for frontend
# Install browser extension

# Database GUI
# Use pgAdmin, DBeaver, or similar
```

### 2. Performance Monitoring
```bash
# Run performance tests
npm run test:performance

# Monitor API response times
curl -w "@curl-format.txt" -o /dev/null -s http://localhost:3001/api/properties
```

### 3. Code Quality
```bash
# Auto-fix linting issues
npm run lint:fix

# Run tests in watch mode
cd backend && npm run test:watch
```

## 📚 Additional Resources

- [Node.js Troubleshooting](https://nodejs.org/en/docs/guides/debugging-getting-started/)
- [Docker Troubleshooting](https://docs.docker.com/config/daemon/troubleshoot/)
- [PostgreSQL Documentation](https://www.postgresql.org/docs/)
- [Redis Documentation](https://redis.io/documentation)
- [React Troubleshooting](https://reactjs.org/docs/troubleshooting.html)

---

**Still having issues?** Check the [GitHub Issues](../../issues) or create a new issue with detailed information about your problem.