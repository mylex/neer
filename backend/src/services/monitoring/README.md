# Monitoring and Logging System

This monitoring system provides comprehensive logging, metrics collection, health checks, and alerting for the Japanese Real Estate Scraper application.

## Components

### 1. SystemLogger
A comprehensive logging system with structured logging, file rotation, and different log levels.

**Features:**
- Multiple log levels (debug, info, warn, error)
- File rotation with size limits
- Separate log files for different activities (scraping, translation, errors, etc.)
- Structured logging with context
- Performance and audit logging
- Singleton pattern for consistent logging across the application

**Usage:**
```typescript
import { systemLogger } from '../services/monitoring';

// Basic logging
systemLogger.info('Application started');
systemLogger.error('Database connection failed', error);

// Structured logging with context
systemLogger.logRequest('GET', '/api/properties', 200, 150);
systemLogger.logAudit('user_login', { userId: '123', ip: '192.168.1.1' });
```

### 2. MetricsCollector
Collects and aggregates system metrics for monitoring and performance analysis.

**Features:**
- Scraping success rates and performance metrics
- Translation service metrics and cache hit rates
- Database performance and connection metrics
- System resource usage tracking
- Automatic metrics collection and aggregation

**Usage:**
```typescript
import { metricsCollector } from '../services/monitoring';

// Record scraping attempt
metricsCollector.recordScrapingAttempt('suumo', true, 500, 10);

// Record translation
metricsCollector.recordTranslation(true, 200, 100, false);

// Get metrics summary
const summary = metricsCollector.getSystemSummary();
```

### 3. HealthCheckService
Monitors the health of system components and external dependencies.

**Features:**
- Database connectivity checks
- Redis health monitoring
- System resource monitoring
- External service availability checks
- Scraping service health assessment
- Periodic health checks with configurable intervals

**Usage:**
```typescript
import { healthCheckService } from '../services/monitoring';

// Perform health check
const healthStatus = await healthCheckService.performHealthCheck();

// Check if system is healthy
const isHealthy = healthCheckService.isSystemHealthy();

// Get specific service health
const dbHealth = healthCheckService.getServiceHealth('database');
```

### 4. NotificationService
Sends alerts and notifications to administrators about system issues.

**Features:**
- Multiple notification channels (email, webhook, Slack)
- Alert severity levels and rate limiting
- Specialized alerts for different system components
- Alert resolution tracking
- Configuration through environment variables

**Usage:**
```typescript
import { notificationService } from '../services/monitoring';

// Send custom alert
await notificationService.sendAlert({
  type: 'error',
  severity: 'high',
  title: 'Database Connection Failed',
  message: 'Unable to connect to PostgreSQL database',
  source: 'database'
});

// Send health alert
await notificationService.sendHealthAlert(healthStatus);

// Resolve alert
notificationService.resolveAlert(alertId, 'admin');
```

## API Endpoints

The monitoring system provides REST API endpoints for external monitoring tools:

- `GET /api/monitoring/health` - Basic health check
- `GET /api/monitoring/health/detailed` - Detailed health information
- `GET /api/monitoring/metrics` - Current system metrics
- `GET /api/monitoring/metrics/scraping` - Scraping performance metrics
- `GET /api/monitoring/metrics/translation` - Translation service metrics
- `GET /api/monitoring/metrics/database` - Database performance metrics
- `GET /api/monitoring/metrics/prometheus` - Prometheus-compatible metrics
- `GET /api/monitoring/alerts` - Active alerts
- `GET /api/monitoring/status` - Comprehensive system status

## Configuration

### Environment Variables

```bash
# Logging
LOG_LEVEL=info

# Email Notifications
EMAIL_NOTIFICATIONS_ENABLED=true
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-password
SMTP_FROM_ADDRESS=noreply@yourapp.com
ADMIN_EMAIL_ADDRESSES=admin1@yourapp.com,admin2@yourapp.com

# Webhook Notifications
WEBHOOK_NOTIFICATIONS_ENABLED=true
WEBHOOK_URL=https://your-webhook-endpoint.com/alerts
WEBHOOK_HEADERS={"Authorization":"Bearer your-token"}

# Slack Notifications
SLACK_NOTIFICATIONS_ENABLED=true
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/YOUR/SLACK/WEBHOOK
SLACK_CHANNEL=#alerts
```

## Integration Example

```typescript
import { 
  systemLogger, 
  metricsCollector, 
  healthCheckService, 
  notificationService 
} from '../services/monitoring';

// Initialize monitoring for your service
export class MyService {
  async performOperation() {
    const startTime = Date.now();
    
    try {
      systemLogger.info('Starting operation', { operation: 'data-processing' });
      
      // Your business logic here
      const result = await this.processData();
      
      const duration = Date.now() - startTime;
      metricsCollector.recordDatabaseOperation('process_data', duration, result.count);
      
      systemLogger.info('Operation completed successfully', { 
        duration, 
        recordsProcessed: result.count 
      });
      
      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      
      systemLogger.error('Operation failed', error, { duration });
      
      // Send alert for critical errors
      await notificationService.sendAlert({
        type: 'error',
        severity: 'high',
        title: 'Data Processing Failed',
        message: error.message,
        source: 'data-processor'
      });
      
      throw error;
    }
  }
}
```

## Log Files

The system creates the following log files in the `logs/` directory:

- `application.log` - Main application log with rotation
- `error.log` - Error-specific logs
- `metrics.log` - System metrics
- `audit.log` - Audit events
- `pipeline.log` - Data processing pipeline logs
- `scraping.log` - Web scraping activities
- `translation.log` - Translation service logs
- `exceptions.log` - Uncaught exceptions
- `rejections.log` - Unhandled promise rejections

## Monitoring Dashboard

For external monitoring, you can integrate with tools like:

- **Prometheus + Grafana**: Use the `/api/monitoring/metrics/prometheus` endpoint
- **DataDog**: Send metrics via webhook notifications
- **New Relic**: Custom metrics integration
- **ELK Stack**: Forward logs for analysis

## Best Practices

1. **Use structured logging** with consistent context fields
2. **Set appropriate log levels** for different environments
3. **Monitor key metrics** like success rates and response times
4. **Set up alerts** for critical system failures
5. **Regularly review** log files and metrics for patterns
6. **Test notification channels** to ensure they work when needed
7. **Use rate limiting** to avoid alert spam
8. **Document custom metrics** and their meanings

## Testing

Run the monitoring system tests:

```bash
npm test -- --testPathPattern="services/monitoring"
```

The test suite covers:
- Logging functionality and structured output
- Metrics collection and aggregation
- Health check accuracy
- Alert generation and resolution
- API endpoint responses