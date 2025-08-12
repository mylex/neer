# Deployment Guide

This guide covers deployment configurations and procedures for the Japanese Real Estate Scraper application.

## Table of Contents

- [Overview](#overview)
- [Environment Configuration](#environment-configuration)
- [Docker Deployment](#docker-deployment)
- [Database Migrations](#database-migrations)
- [Production Deployment](#production-deployment)
- [Monitoring and Maintenance](#monitoring-and-maintenance)
- [Troubleshooting](#troubleshooting)

## Overview

The application supports three deployment environments:

- **Development**: Local development with hot reload and debugging
- **Test**: Automated testing environment
- **Production**: Optimized production deployment with security and performance features

## Environment Configuration

### Setting Up Environment

Use the setup script to configure your environment:

```bash
# Development environment
./scripts/setup-env.sh development

# Production environment
./scripts/setup-env.sh production --validate

# Test environment
./scripts/setup-env.sh test
```

### Environment Variables

#### Required for Production

| Variable | Description | Example |
|----------|-------------|---------|
| `DB_HOST` | Database host | `postgres.example.com` |
| `DB_NAME` | Database name | `japanese_real_estate_prod` |
| `DB_USER` | Database user | `prod_user` |
| `DB_PASSWORD` | Database password | `secure_password` |
| `REDIS_HOST` | Redis host | `redis.example.com` |
| `REDIS_PASSWORD` | Redis password | `redis_password` |
| `CORS_ORIGIN` | Frontend URL | `https://your-domain.com` |
| `REACT_APP_API_BASE_URL` | API URL | `https://api.your-domain.com` |
| `GOOGLE_TRANSLATE_API_KEY` | Translation API key | `your_api_key` |
| `JWT_SECRET` | JWT signing secret | `your_jwt_secret` |

#### Optional Configuration

| Variable | Description | Default |
|----------|-------------|---------|
| `LOG_LEVEL` | Logging level | `info` |
| `SCRAPING_DELAY_MIN` | Min scraping delay (ms) | `2000` |
| `SCRAPING_DELAY_MAX` | Max scraping delay (ms) | `5000` |
| `MAX_CONCURRENT_SCRAPERS` | Max concurrent scrapers | `1` |
| `SCHEDULER_DAILY_ENABLED` | Enable daily scraping | `true` |
| `SCHEDULER_DAILY_CRON` | Daily scraping schedule | `0 2 * * *` |

## Docker Deployment

### Development Deployment

Start development environment with hot reload:

```bash
# Quick start
./scripts/deploy.sh development

# With build and migrations
./scripts/deploy.sh development --build --migrate

# Manual approach
docker-compose --profile development up -d
```

### Production Deployment

Deploy to production:

```bash
# Full production deployment
./scripts/deploy.sh production --build --migrate

# Manual approach
docker-compose -f docker-compose.prod.yml up -d
```

### Test Environment

Run tests:

```bash
# Run all tests
./scripts/deploy.sh test

# Manual approach
docker-compose -f docker-compose.test.yml up --abort-on-container-exit
```

### Docker Compose Profiles

| Profile | Services | Use Case |
|---------|----------|----------|
| `development` | backend-dev, frontend-dev | Local development with hot reload |
| `full-stack` | backend, frontend | Production-like local testing |
| `with-nginx` | All + nginx | Production with load balancer |

## Database Migrations

### Migration Commands

```bash
# Check migration status
./scripts/migrate.sh status --environment=production

# Apply all pending migrations
./scripts/migrate.sh up --environment=production

# Create new migration
./scripts/migrate.sh create add_new_feature

# Rollback specific migration
./scripts/migrate.sh down 001_initial_schema --environment=development
```

### Migration Best Practices

1. **Always backup before production migrations**
2. **Test migrations in development first**
3. **Review migration SQL before applying**
4. **Create rollback scripts for complex migrations**
5. **Apply migrations during maintenance windows**

### Migration Files

Migrations are located in `backend/src/database/migrations/`:

- `001_initial_schema.sql` - Initial database schema
- `002_enhanced_search_indexes.sql` - Search performance indexes
- `003_performance_optimizations.sql` - Advanced optimizations

Each migration has a corresponding rollback file (`*_rollback.sql`).

## Production Deployment

### Pre-deployment Checklist

- [ ] Set all required environment variables
- [ ] Configure SSL certificates in `nginx/ssl/`
- [ ] Set up monitoring and alerting
- [ ] Configure backup strategies
- [ ] Test migrations in staging environment
- [ ] Verify external service connectivity (Translation API, etc.)

### SSL Configuration

1. Place SSL certificates in `nginx/ssl/`:
   - `cert.pem` - SSL certificate
   - `key.pem` - Private key

2. Uncomment HTTPS server block in `nginx/nginx.conf`

3. Update environment variables:
   ```bash
   CORS_ORIGIN=https://your-domain.com
   REACT_APP_API_BASE_URL=https://api.your-domain.com
   ```

### Scaling

#### Horizontal Scaling

Add more backend instances in `docker-compose.prod.yml`:

```yaml
backend-2:
  extends: backend
  container_name: japanese-real-estate-backend-2
```

Update nginx upstream configuration in `nginx/nginx.conf`:

```nginx
upstream backend {
    least_conn;
    server backend:3001 max_fails=3 fail_timeout=30s;
    server backend-2:3001 max_fails=3 fail_timeout=30s;
}
```

#### Vertical Scaling

Adjust resource limits in `docker-compose.prod.yml`:

```yaml
deploy:
  resources:
    limits:
      memory: 4G
      cpus: '2.0'
```

### Health Checks

The application includes health check endpoints:

- Frontend: `http://localhost:3000/health`
- Backend: `http://localhost:3001/api/health`
- Database: Built-in PostgreSQL health checks
- Redis: Built-in Redis health checks

## Monitoring and Maintenance

### Log Management

Logs are stored in:
- Application logs: `./logs/`
- Backend logs: `./backend/logs/`
- Container logs: `docker-compose logs`

### Log Rotation

Configure log rotation in production:

```bash
# Add to crontab
0 0 * * * docker-compose -f docker-compose.prod.yml exec backend npm run logs:rotate
```

### Database Maintenance

Regular maintenance tasks:

```bash
# Update statistics
docker-compose exec postgres psql -U $DB_USER -d $DB_NAME -c "ANALYZE;"

# Refresh materialized views
docker-compose exec postgres psql -U $DB_USER -d $DB_NAME -c "SELECT refresh_property_stats();"

# Vacuum database
docker-compose exec postgres psql -U $DB_USER -d $DB_NAME -c "VACUUM ANALYZE;"
```

### Backup Strategies

#### Database Backup

```bash
# Create backup
docker-compose exec postgres pg_dump -U $DB_USER $DB_NAME > backup_$(date +%Y%m%d_%H%M%S).sql

# Restore backup
docker-compose exec -T postgres psql -U $DB_USER $DB_NAME < backup_file.sql
```

#### Volume Backup

```bash
# Backup volumes
docker run --rm -v japanese-real-estate_postgres_data:/data -v $(pwd):/backup alpine tar czf /backup/postgres_backup.tar.gz -C /data .
```

## Troubleshooting

### Common Issues

#### Database Connection Issues

```bash
# Check database status
docker-compose exec postgres pg_isready -U $DB_USER

# View database logs
docker-compose logs postgres
```

#### Redis Connection Issues

```bash
# Check Redis status
docker-compose exec redis redis-cli ping

# View Redis logs
docker-compose logs redis
```

#### Migration Issues

```bash
# Check migration status
./scripts/migrate.sh status

# View migration table
docker-compose exec postgres psql -U $DB_USER -d $DB_NAME -c "SELECT * FROM migrations ORDER BY applied_at;"
```

#### Performance Issues

```bash
# Check resource usage
docker stats

# View slow queries
docker-compose exec postgres psql -U $DB_USER -d $DB_NAME -c "SELECT query, mean_time, calls FROM pg_stat_statements ORDER BY mean_time DESC LIMIT 10;"
```

### Debug Mode

Enable debug mode for troubleshooting:

```bash
# Development
DEBUG=app:* docker-compose --profile development up

# Production (not recommended)
LOG_LEVEL=debug docker-compose -f docker-compose.prod.yml up
```

### Container Logs

View logs for specific services:

```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f backend

# Last 100 lines
docker-compose logs --tail=100 backend
```

## Security Considerations

### Production Security

1. **Use strong passwords** for all services
2. **Enable SSL/TLS** for all external connections
3. **Configure firewall rules** to restrict access
4. **Regular security updates** for base images
5. **Monitor for vulnerabilities** in dependencies
6. **Implement rate limiting** (configured in nginx)
7. **Use secrets management** for sensitive data

### Network Security

The application uses a custom Docker network (`app-network`) to isolate services. In production:

- Only expose necessary ports (80, 443)
- Use reverse proxy (nginx) for SSL termination
- Implement proper CORS policies
- Consider using Docker secrets for sensitive data

## Performance Optimization

### Database Optimization

- Regular `ANALYZE` to update statistics
- Monitor slow queries with `pg_stat_statements`
- Use connection pooling
- Implement proper indexing strategies

### Application Optimization

- Enable Redis caching
- Use CDN for static assets
- Implement proper error handling
- Monitor memory usage and optimize

### Infrastructure Optimization

- Use SSD storage for database
- Implement proper backup strategies
- Monitor resource usage
- Scale horizontally when needed