# Japanese Real Estate Scraper

A comprehensive web application that scrapes affordable housing information from Japanese real estate websites, translates the content into English, and provides a user-friendly interface for searching and viewing properties.

## Project Structure

```
japanese-real-estate-scraper/
├── backend/                 # Node.js/Express API server
│   ├── src/
│   │   ├── config/         # Configuration management
│   │   ├── models/         # Data models
│   │   ├── services/       # Business logic services
│   │   ├── routes/         # API routes
│   │   ├── middleware/     # Express middleware
│   │   └── utils/          # Utility functions
│   ├── package.json
│   ├── tsconfig.json
│   └── Dockerfile
├── frontend/               # React web application
│   ├── src/
│   │   ├── components/     # React components
│   │   ├── pages/          # Page components
│   │   ├── services/       # API service layer
│   │   └── utils/          # Utility functions
│   ├── package.json
│   ├── tsconfig.json
│   └── Dockerfile
├── shared/                 # Shared utilities and types
│   ├── src/
│   │   ├── types/          # TypeScript type definitions
│   │   └── utils/          # Shared utility functions
│   ├── package.json
│   └── tsconfig.json
├── docker-compose.yml      # Docker services configuration
└── package.json           # Root workspace configuration
```

## Features

- **Web Scraping**: Automated scraping of Japanese real estate websites
- **Translation**: Japanese-to-English translation of property information
- **Database Storage**: Structured storage with PostgreSQL
- **Search & Filter**: Advanced property search and filtering capabilities
- **Responsive UI**: Mobile-friendly React interface
- **Scheduled Updates**: Automated scraping on schedule
- **Monitoring**: Comprehensive logging and error tracking

## Technology Stack

### Backend
- **Node.js** with **Express.js** for API services
- **TypeScript** for type safety
- **PostgreSQL** for data storage
- **Redis** for caching
- **Puppeteer** for web scraping
- **Google Translate API** for translation

### Frontend
- **React.js** with **TypeScript**
- **Material-UI** for component library
- **React Query** for data fetching
- **React Router** for navigation

### DevOps
- **Docker** for containerization
- **Docker Compose** for local development
- **Jest** for testing
- **ESLint** for code linting

## Getting Started

### Prerequisites
- Node.js 18+ and npm 8+
- Docker and Docker Compose (optional)
- PostgreSQL 15+ (if not using Docker)
- Redis 7+ (if not using Docker)

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd japanese-real-estate-scraper
   ```

2. **Install dependencies**
   ```bash
   npm run install:all
   ```

3. **Set up environment variables**
   ```bash
   # Backend
   cp backend/.env.example backend/.env.development
   # Edit backend/.env.development with your configuration
   
   # Frontend
   cp frontend/.env.example frontend/.env.development
   # Edit frontend/.env.development with your configuration
   ```

4. **Start development services**
   
   **Option A: Using Docker Compose**
   ```bash
   # Start database and cache services
   docker-compose up postgres redis
   
   # Start development servers
   npm run dev
   ```
   
   **Option B: Local services**
   ```bash
   # Make sure PostgreSQL and Redis are running locally
   npm run dev
   ```

5. **Access the application**
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:3001
   - API Documentation: http://localhost:3001/api-docs (when implemented)

### Development Commands

```bash
# Install all dependencies
npm run install:all

# Start development servers
npm run dev

# Build all projects
npm run build

# Run tests
npm run test

# Run linting
npm run lint

# Fix linting issues
npm run lint:fix

# Clean all build artifacts and dependencies
npm run clean
```

### Environment Configuration

The project supports multiple environments:
- **Development**: `.env.development`
- **Production**: `.env.production`
- **Example**: `.env.example` (template)

Key environment variables:
- `DATABASE_URL`: PostgreSQL connection string
- `REDIS_URL`: Redis connection string
- `GOOGLE_TRANSLATE_API_KEY`: Google Translate API key
- `PORT`: Server port (default: 3001)

## Project Status

This project is currently in development. The basic project structure and configuration have been set up. Implementation of core features is in progress according to the task list in `.kiro/specs/japanese-real-estate-scraper/tasks.md`.

## Contributing

1. Follow the existing code style and linting rules
2. Write tests for new functionality
3. Update documentation as needed
4. Follow the task-based development approach outlined in the specs

## License

MIT License - see LICENSE file for details