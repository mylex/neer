# Japanese Real Estate Scraper

A comprehensive web application that scrapes affordable housing information from Japanese real estate websites, translates the content into English, and provides a user-friendly interface for searching and viewing properties.

## 🏗️ Project Architecture

```
japanese-real-estate-scraper/
├── backend/                    # Node.js/Express API server
│   ├── src/
│   │   ├── config/            # Configuration management
│   │   ├── database/          # Database models, repositories, migrations
│   │   ├── models/            # Data models and types
│   │   ├── services/          # Business logic services
│   │   │   ├── scraper/       # Web scraping services
│   │   │   ├── translation/   # Translation services
│   │   │   ├── cache/         # Caching services
│   │   │   ├── scheduler/     # Task scheduling
│   │   │   └── monitoring/    # System monitoring
│   │   ├── routes/            # API routes
│   │   ├── middleware/        # Express middleware
│   │   └── utils/             # Utility functions
│   ├── logs/                  # Application logs
│   └── __tests__/             # Test files
├── frontend/                   # React web application
│   ├── src/
│   │   ├── components/        # React components
│   │   ├── pages/             # Page components
│   │   ├── services/          # API service layer
│   │   ├── hooks/             # Custom React hooks
│   │   ├── utils/             # Utility functions
│   │   └── __tests__/         # Test files
│   ├── public/                # Static assets
│   └── scripts/               # Build optimization scripts
├── shared/                     # Shared utilities and types
│   ├── src/
│   │   ├── types/             # TypeScript type definitions
│   │   └── utils/             # Shared utility functions
├── database/                   # Database schema and migrations
├── scripts/                    # Deployment and utility scripts
├── nginx/                      # Nginx configuration
├── docker-compose.yml          # Docker services configuration
└── package.json               # Root workspace configuration
```

## ✨ Features

### Core Functionality
- **🕷️ Web Scraping**: Automated scraping of Japanese real estate websites (Suumo, Homes, etc.)
- **🌐 Translation**: Japanese-to-English translation with Google Translate API
- **🗄️ Database Storage**: Structured storage with PostgreSQL and Redis caching
- **🔍 Advanced Search**: Full-text search with filters (price, location, size, type)
- **📱 Responsive UI**: Mobile-friendly React interface with Material-UI
- **⏰ Scheduled Updates**: Automated scraping with cron jobs
- **📊 Monitoring**: Comprehensive logging, metrics, and health checks

### Technical Features
- **🔄 Error Handling**: Graceful degradation and retry mechanisms
- **⚡ Performance**: Optimized with caching, lazy loading, and pagination
- **🧪 Testing**: Comprehensive unit, integration, and E2E tests
- **🔒 Security**: Input validation, rate limiting, and CORS protection
- **📈 Scalability**: Microservices architecture with Docker containers

## 🛠️ Technology Stack

### Backend
- **Node.js 18+** with **Express.js** for API services
- **TypeScript** for type safety and better development experience
- **PostgreSQL 15+** for primary data storage
- **Redis 7+** for caching and session management
- **Puppeteer** for web scraping with stealth plugins
- **Google Translate API** for Japanese-English translation
- **Winston** for structured logging
- **Jest** for testing with Supertest for API testing

### Frontend
- **React 18** with **TypeScript** for type-safe UI development
- **Material-UI (MUI)** for consistent component library
- **React Query** for efficient data fetching and caching
- **React Router** for client-side navigation
- **Axios** for HTTP requests with interceptors
- **Jest & React Testing Library** for component testing

### DevOps & Infrastructure
- **Docker** for containerization
- **Docker Compose** for local development orchestration
- **Nginx** for reverse proxy and static file serving
- **ESLint & Prettier** for code quality and formatting
- **GitHub Actions** for CI/CD (when configured)

## 🚀 Quick Start

### Prerequisites
- **Node.js 18+** and **npm 8+**
- **Docker** and **Docker Compose** (recommended)
- **PostgreSQL 15+** and **Redis 7+** (if not using Docker)
- **Google Translate API key** (for translation features)

### 1. Clone and Install

```bash
# Clone the repository
git clone <repository-url>
cd japanese-real-estate-scraper

# Install all dependencies
npm run install:all
```

### 2. Environment Setup

```bash
# Backend environment
cp backend/.env.example backend/.env.development
# Edit backend/.env.development with your configuration

# Frontend environment  
cp frontend/.env.example frontend/.env.development
# Edit frontend/.env.development with your configuration
```

**Required Environment Variables:**
```bash
# Backend (.env.development)
DATABASE_URL=postgresql://username:password@localhost:5432/japanese_real_estate_scraper
REDIS_URL=redis://localhost:6379
GOOGLE_TRANSLATE_API_KEY=your_google_translate_api_key
PORT=3001

# Frontend (.env.development)
REACT_APP_API_BASE_URL=http://localhost:3001
```

### 3. Database Setup

**Option A: Using Docker (Recommended)**
```bash
# Start database and cache services
docker-compose up -d postgres redis

# Run database migrations
npm run migrate:backend
```

**Option B: Local Services**
```bash
# Make sure PostgreSQL and Redis are running locally
# Create database
createdb japanese_real_estate_scraper

# Run migrations
npm run migrate:backend
```

### 4. Start Development Servers

```bash
# Start both frontend and backend in development mode
npm run dev

# Or start individually:
npm run dev:backend  # Backend only (http://localhost:3001)
npm run dev:frontend # Frontend only (http://localhost:3000)
```

### 5. Access the Application

- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:3001
- **Health Check**: http://localhost:3001/health
- **API Metrics**: http://localhost:3001/api/metrics

## 📋 Available Scripts

### Root Level Commands
```bash
# Development
npm run dev                 # Start both frontend and backend
npm run dev:backend        # Start backend only
npm run dev:frontend       # Start frontend only

# Installation
npm run install:all        # Install all dependencies
npm run install:backend    # Install backend dependencies
npm run install:frontend   # Install frontend dependencies

# Building
npm run build              # Build all projects
npm run build:backend      # Build backend only
npm run build:frontend     # Build frontend only

# Testing
npm run test               # Run all tests
npm run test:backend       # Run backend tests
npm run test:frontend      # Run frontend tests

# Code Quality
npm run lint               # Lint all projects
npm run lint:fix           # Fix linting issues
npm run clean              # Clean build artifacts
```

### Backend Specific Commands
```bash
cd backend

npm run dev                # Start development server
npm run build              # Build TypeScript
npm run start              # Start production server
npm run test               # Run tests
npm run test:watch         # Run tests in watch mode
npm run migrate:run        # Run database migrations
npm run migrate:status     # Check migration status
npm run db:init            # Initialize database
```

### Frontend Specific Commands
```bash
cd frontend

npm start                  # Start development server
npm run build              # Build for production
npm run build:optimized    # Build with optimizations
npm run test               # Run tests
npm run analyze            # Analyze bundle size
```

## 🐳 Docker Development

### Full Stack with Docker Compose
```bash
# Start all services (database, cache, backend, frontend)
docker-compose up

# Start only infrastructure services
docker-compose up postgres redis

# Build and start with fresh containers
docker-compose up --build

# Run in background
docker-compose up -d

# View logs
docker-compose logs -f

# Stop all services
docker-compose down
```

### Individual Service Management
```bash
# Backend only
docker-compose up backend

# Frontend only  
docker-compose up frontend

# Database only
docker-compose up postgres redis
```

## 🧪 Testing

### Running Tests
```bash
# Run all tests
npm run test

# Run specific test suites
npm run test:backend       # Backend unit & integration tests
npm run test:frontend      # Frontend component tests

# Run with coverage
cd backend && npm run test -- --coverage
cd frontend && npm run test -- --coverage --watchAll=false
```

### Test Types
- **Unit Tests**: Individual component/function testing
- **Integration Tests**: API endpoint and service integration
- **E2E Tests**: Complete user workflow testing
- **Performance Tests**: Load and stress testing

### Custom Test Scripts
```bash
# Performance testing
node scripts/performance-test.js

# System integration validation
node scripts/validate-system.js

# Integration testing
node scripts/integration-test.js
```

## 📊 Monitoring & Debugging

### Health Checks
- **Backend Health**: http://localhost:3001/health
- **System Metrics**: http://localhost:3001/api/metrics
- **Database Status**: Included in health check response

### Logging
- **Backend Logs**: `backend/logs/`
- **Error Logs**: `backend/logs/error.log`
- **Access Logs**: Console output in development

### Performance Monitoring
```bash
# Run performance tests
node scripts/performance-test.js

# Analyze frontend bundle
cd frontend && npm run analyze

# Monitor backend metrics
curl http://localhost:3001/api/metrics
```

## 🔧 Configuration

### Environment Files
- **Development**: `.env.development`
- **Production**: `.env.production`
- **Testing**: `.env.test`
- **Examples**: `.env.example`

### Key Configuration Options

**Backend Configuration:**
- Database connection settings
- Redis cache configuration
- Translation API keys
- Scraping parameters (delays, concurrency)
- Logging levels and file paths
- Scheduler settings (cron expressions)
- Security settings (CORS, rate limiting)

**Frontend Configuration:**
- API base URL
- Feature flags
- UI settings (pagination, search limits)
- External service keys (Google Maps)

## 🚀 Deployment

### Production Build
```bash
# Build all projects for production
npm run build

# Build optimized frontend
cd frontend && npm run build:optimized
```

### Docker Production
```bash
# Build production images
docker-compose -f docker-compose.prod.yml build

# Start production stack
docker-compose -f docker-compose.prod.yml up -d
```

### Environment Setup
```bash
# Copy production environment template
cp .env.production.template .env.production
# Edit with production values

# Run database migrations
NODE_ENV=production npm run migrate:backend
```

For detailed deployment instructions, see [DEPLOYMENT.md](DEPLOYMENT.md).

## 📈 Project Status

### ✅ Completed Features
- [x] Project structure and configuration
- [x] Database schema and migrations
- [x] Basic API endpoints (properties, search, health)
- [x] Frontend components and routing
- [x] Web scraping infrastructure
- [x] Translation services
- [x] Caching layer with Redis
- [x] Error handling and monitoring
- [x] Comprehensive testing suite
- [x] Docker containerization
- [x] Performance optimizations

### 🚧 In Progress
- [ ] Production deployment automation
- [ ] Advanced search features
- [ ] User authentication (if required)
- [ ] Real-time notifications
- [ ] Analytics dashboard

### 📋 Task Tracking
Detailed task progress is tracked in `.kiro/specs/japanese-real-estate-scraper/tasks.md`

## 🤝 Contributing

### Development Workflow
1. **Fork** the repository
2. **Create** a feature branch (`git checkout -b feature/amazing-feature`)
3. **Follow** the existing code style and linting rules
4. **Write** tests for new functionality
5. **Update** documentation as needed
6. **Commit** changes (`git commit -m 'Add amazing feature'`)
7. **Push** to branch (`git push origin feature/amazing-feature`)
8. **Open** a Pull Request

### Code Standards
- **TypeScript** for type safety
- **ESLint** for code quality
- **Prettier** for formatting
- **Jest** for testing
- **Conventional Commits** for commit messages

### Testing Requirements
- Unit tests for new functions/components
- Integration tests for API endpoints
- E2E tests for user workflows
- Maintain >80% code coverage

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

### Quick Setup (Recommended)
```bash
# Automated setup script
npm run setup:dev

# Or manual setup
npm run install:all
cp backend/.env.example backend/.env.development
cp frontend/.env.example frontend/.env.development
# Edit environment files, then:
npm run docker:up postgres redis
npm run migrate:backend
npm run dev
```

### Health Checks & Diagnostics
```bash
# Check system health
npm run health

# Run integration tests
npm run test:integration

# Validate complete system
npm run test:system
```

### Common Issues
For detailed troubleshooting, see [TROUBLESHOOTING.md](TROUBLESHOOTING.md)

1. **Port conflicts**: Change ports in environment files
2. **Database connection**: Run `npm run health` to diagnose
3. **Translation API**: Verify Google Translate API key is valid
4. **Docker issues**: Ensure Docker Desktop is running

### Getting Help
- Run diagnostics: `npm run health`
- Check troubleshooting guide: [TROUBLESHOOTING.md](TROUBLESHOOTING.md)
- Review logs in `backend/logs/` for error details
- Check the [Issues](../../issues) page for known problems

### Performance Optimization
- Enable Redis caching for better response times
- Use Docker for consistent development environment
- Monitor metrics at `/api/metrics` endpoint
- Run performance tests regularly

---

**Built with ❤️ for the Japanese real estate market**