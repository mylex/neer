import { Router, Request, Response } from 'express';
import { systemLogger } from '../services/monitoring/SystemLogger';
import { metricsCollector } from '../services/monitoring/MetricsCollector';
import { healthCheckService } from '../services/monitoring/HealthCheckService';
import { notificationService } from '../services/monitoring/NotificationService';

const router = Router();

/**
 * Basic health check endpoint
 * Returns simple status for load balancers and monitoring tools
 */
router.get('/health', async (req: Request, res: Response) => {
  try {
    const healthSummary = healthCheckService.getHealthSummary();
    
    const statusCode = healthSummary.status === 'healthy' ? 200 : 
                      healthSummary.status === 'degraded' ? 200 : 503;

    res.status(statusCode).json({
      status: healthSummary.status,
      timestamp: healthSummary.timestamp,
      uptime: healthSummary.uptime
    });
  } catch (error) {
    systemLogger.error('Health check endpoint failed', error instanceof Error ? error : new Error(String(error)));
    res.status(503).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: 'Health check failed'
    });
  }
});

/**
 * Detailed health check endpoint
 * Returns comprehensive health information
 */
router.get('/health/detailed', async (req: Request, res: Response) => {
  try {
    const healthStatus = await healthCheckService.performHealthCheck();
    
    const statusCode = healthStatus.overall === 'healthy' ? 200 : 
                      healthStatus.overall === 'degraded' ? 200 : 503;

    res.status(statusCode).json(healthStatus);
  } catch (error) {
    systemLogger.error('Detailed health check endpoint failed', error instanceof Error ? error : new Error(String(error)));
    res.status(503).json({
      overall: 'unhealthy',
      timestamp: new Date(),
      services: [],
      uptime: process.uptime() * 1000,
      version: '1.0.0',
      error: 'Health check failed'
    });
  }
});

/**
 * System metrics endpoint
 * Returns current system metrics
 */
router.get('/metrics', async (req: Request, res: Response) => {
  try {
    const systemSummary = metricsCollector.getSystemSummary();
    const currentMetrics = metricsCollector.getCurrentSystemMetrics();
    
    res.json({
      timestamp: new Date().toISOString(),
      summary: systemSummary,
      current: currentMetrics
    });
  } catch (error) {
    systemLogger.error('Metrics endpoint failed', error instanceof Error ? error : new Error(String(error)));
    res.status(500).json({
      error: 'Failed to retrieve metrics',
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * Scraping metrics endpoint
 * Returns detailed scraping performance metrics
 */
router.get('/metrics/scraping', async (req: Request, res: Response) => {
  try {
    const scrapingMetrics = metricsCollector.getAllScrapingMetrics();
    
    const metricsWithRates = scrapingMetrics.map(metrics => ({
      ...metrics,
      successRate: metricsCollector.getScrapingSuccessRate(metrics.siteName)
    }));

    res.json({
      timestamp: new Date().toISOString(),
      sites: metricsWithRates,
      summary: {
        totalSites: scrapingMetrics.length,
        averageSuccessRate: metricsWithRates.reduce((sum, m) => sum + m.successRate, 0) / metricsWithRates.length || 0,
        totalPropertiesScraped: scrapingMetrics.reduce((sum, m) => sum + m.propertiesScraped, 0)
      }
    });
  } catch (error) {
    systemLogger.error('Scraping metrics endpoint failed', error instanceof Error ? error : new Error(String(error)));
    res.status(500).json({
      error: 'Failed to retrieve scraping metrics',
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * Translation metrics endpoint
 * Returns translation service performance metrics
 */
router.get('/metrics/translation', async (req: Request, res: Response) => {
  try {
    const translationMetrics = metricsCollector.getTranslationMetrics();
    const cacheHitRate = metricsCollector.getTranslationCacheHitRate();
    
    res.json({
      timestamp: new Date().toISOString(),
      ...translationMetrics,
      cacheHitRate,
      successRate: translationMetrics.totalTranslations > 0 
        ? (translationMetrics.successfulTranslations / translationMetrics.totalTranslations) * 100 
        : 0
    });
  } catch (error) {
    systemLogger.error('Translation metrics endpoint failed', error instanceof Error ? error : new Error(String(error)));
    res.status(500).json({
      error: 'Failed to retrieve translation metrics',
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * Database metrics endpoint
 * Returns database performance metrics
 */
router.get('/metrics/database', async (req: Request, res: Response) => {
  try {
    const databaseMetrics = metricsCollector.getDatabaseMetrics();
    
    res.json({
      timestamp: new Date().toISOString(),
      ...databaseMetrics,
      connectionUtilization: databaseMetrics.connectionPoolSize > 0 
        ? (databaseMetrics.activeConnections / databaseMetrics.connectionPoolSize) * 100 
        : 0
    });
  } catch (error) {
    systemLogger.error('Database metrics endpoint failed', error instanceof Error ? error : new Error(String(error)));
    res.status(500).json({
      error: 'Failed to retrieve database metrics',
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * System metrics history endpoint
 * Returns historical system metrics
 */
router.get('/metrics/history', async (req: Request, res: Response) => {
  try {
    const minutes = parseInt(req.query.minutes as string) || 60;
    const history = metricsCollector.getSystemMetricsHistory(minutes);
    
    res.json({
      timestamp: new Date().toISOString(),
      period: `${minutes} minutes`,
      dataPoints: history.length,
      metrics: history
    });
  } catch (error) {
    systemLogger.error('Metrics history endpoint failed', error instanceof Error ? error : new Error(String(error)));
    res.status(500).json({
      error: 'Failed to retrieve metrics history',
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * Active alerts endpoint
 * Returns current active alerts
 */
router.get('/alerts', async (req: Request, res: Response) => {
  try {
    const activeAlerts = notificationService.getActiveAlerts();
    const severity = req.query.severity as string;
    
    let filteredAlerts = activeAlerts;
    if (severity) {
      filteredAlerts = notificationService.getAlertsBySeverity(severity as any);
    }

    res.json({
      timestamp: new Date().toISOString(),
      totalAlerts: activeAlerts.length,
      filteredAlerts: filteredAlerts.length,
      alerts: filteredAlerts
    });
  } catch (error) {
    systemLogger.error('Alerts endpoint failed', error instanceof Error ? error : new Error(String(error)));
    res.status(500).json({
      error: 'Failed to retrieve alerts',
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * Alert history endpoint
 * Returns historical alerts
 */
router.get('/alerts/history', async (req: Request, res: Response) => {
  try {
    const limit = parseInt(req.query.limit as string) || 100;
    const alertHistory = notificationService.getAlertHistory(limit);
    
    res.json({
      timestamp: new Date().toISOString(),
      limit,
      totalReturned: alertHistory.length,
      alerts: alertHistory
    });
  } catch (error) {
    systemLogger.error('Alert history endpoint failed', error instanceof Error ? error : new Error(String(error)));
    res.status(500).json({
      error: 'Failed to retrieve alert history',
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * Resolve alert endpoint
 * Marks an alert as resolved
 */
router.post('/alerts/:alertId/resolve', async (req: Request, res: Response) => {
  try {
    const { alertId } = req.params;
    const { resolvedBy } = req.body;
    
    const success = notificationService.resolveAlert(alertId, resolvedBy);
    
    if (success) {
      systemLogger.info(`Alert ${alertId} resolved via API`, { resolvedBy });
      res.json({
        success: true,
        message: 'Alert resolved successfully',
        alertId,
        resolvedBy,
        timestamp: new Date().toISOString()
      });
    } else {
      res.status(404).json({
        success: false,
        message: 'Alert not found or already resolved',
        alertId
      });
    }
  } catch (error) {
    systemLogger.error('Resolve alert endpoint failed', error instanceof Error ? error : new Error(String(error)));
    res.status(500).json({
      success: false,
      error: 'Failed to resolve alert'
    });
  }
});

/**
 * Test notifications endpoint
 * Tests notification configuration
 */
router.post('/notifications/test', async (req: Request, res: Response) => {
  try {
    const results = await notificationService.testNotifications();
    
    res.json({
      timestamp: new Date().toISOString(),
      message: 'Notification test completed',
      results
    });
  } catch (error) {
    systemLogger.error('Test notifications endpoint failed', error instanceof Error ? error : new Error(String(error)));
    res.status(500).json({
      error: 'Failed to test notifications',
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * System status endpoint
 * Returns comprehensive system status for dashboards
 */
router.get('/status', async (req: Request, res: Response) => {
  try {
    const healthSummary = healthCheckService.getHealthSummary();
    const systemSummary = metricsCollector.getSystemSummary();
    const activeAlerts = notificationService.getActiveAlerts();
    
    const criticalAlerts = activeAlerts.filter(alert => alert.severity === 'critical').length;
    const highAlerts = activeAlerts.filter(alert => alert.severity === 'high').length;
    
    res.json({
      timestamp: new Date().toISOString(),
      overall: {
        status: healthSummary.status,
        uptime: healthSummary.uptime,
        version: process.env['npm_package_version'] || '1.0.0'
      },
      services: healthSummary.services,
      metrics: systemSummary,
      alerts: {
        total: activeAlerts.length,
        critical: criticalAlerts,
        high: highAlerts,
        recent: activeAlerts.slice(0, 5) // Last 5 alerts
      },
      issues: healthSummary.issues
    });
  } catch (error) {
    systemLogger.error('System status endpoint failed', error instanceof Error ? error : new Error(String(error)));
    res.status(500).json({
      error: 'Failed to retrieve system status',
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * Export metrics in Prometheus format
 * For integration with Prometheus monitoring
 */
router.get('/metrics/prometheus', async (req: Request, res: Response) => {
  try {
    const systemSummary = metricsCollector.getSystemSummary();
    const currentMetrics = metricsCollector.getCurrentSystemMetrics();
    
    let prometheusMetrics = '';
    
    // System metrics
    prometheusMetrics += `# HELP system_uptime_seconds System uptime in seconds\n`;
    prometheusMetrics += `# TYPE system_uptime_seconds counter\n`;
    prometheusMetrics += `system_uptime_seconds ${Math.floor(systemSummary.system.uptime / 1000)}\n\n`;
    
    prometheusMetrics += `# HELP system_memory_usage_percent Memory usage percentage\n`;
    prometheusMetrics += `# TYPE system_memory_usage_percent gauge\n`;
    prometheusMetrics += `system_memory_usage_percent ${systemSummary.system.memoryUsagePercent}\n\n`;
    
    // Scraping metrics
    prometheusMetrics += `# HELP scraping_success_rate_percent Average scraping success rate\n`;
    prometheusMetrics += `# TYPE scraping_success_rate_percent gauge\n`;
    prometheusMetrics += `scraping_success_rate_percent ${systemSummary.scraping.averageSuccessRate}\n\n`;
    
    prometheusMetrics += `# HELP scraping_properties_total Total properties scraped\n`;
    prometheusMetrics += `# TYPE scraping_properties_total counter\n`;
    prometheusMetrics += `scraping_properties_total ${systemSummary.scraping.totalPropertiesScraped}\n\n`;
    
    // Translation metrics
    prometheusMetrics += `# HELP translation_cache_hit_rate_percent Translation cache hit rate\n`;
    prometheusMetrics += `# TYPE translation_cache_hit_rate_percent gauge\n`;
    prometheusMetrics += `translation_cache_hit_rate_percent ${systemSummary.translation.cacheHitRate}\n\n`;
    
    // Database metrics
    prometheusMetrics += `# HELP database_query_time_avg_ms Average database query time\n`;
    prometheusMetrics += `# TYPE database_query_time_avg_ms gauge\n`;
    prometheusMetrics += `database_query_time_avg_ms ${systemSummary.database.averageQueryTime}\n\n`;
    
    prometheusMetrics += `# HELP database_properties_total Total properties in database\n`;
    prometheusMetrics += `# TYPE database_properties_total gauge\n`;
    prometheusMetrics += `database_properties_total ${systemSummary.database.totalProperties}\n\n`;
    
    res.set('Content-Type', 'text/plain');
    res.send(prometheusMetrics);
  } catch (error) {
    systemLogger.error('Prometheus metrics endpoint failed', error instanceof Error ? error : new Error(String(error)));
    res.status(500).send('# Error generating metrics\n');
  }
});

export default router;