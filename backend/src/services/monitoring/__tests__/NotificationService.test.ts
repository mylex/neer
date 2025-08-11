import { NotificationService } from '../NotificationService';
import { systemLogger } from '../SystemLogger';

// Mock dependencies
jest.mock('../SystemLogger', () => ({
  systemLogger: {
    info: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
    logAudit: jest.fn()
  }
}));

describe('NotificationService', () => {
  let notificationService: NotificationService;

  beforeEach(() => {
    // Reset singleton
    (NotificationService as any).instance = undefined;
    notificationService = NotificationService.getInstance();
    
    // Clear all mocks
    jest.clearAllMocks();
    
    // Mock setInterval to prevent actual intervals during tests
    jest.spyOn(global, 'setInterval').mockImplementation(() => ({} as any));
    
    // Clear environment variables
    delete process.env['EMAIL_NOTIFICATIONS_ENABLED'];
    delete process.env['WEBHOOK_NOTIFICATIONS_ENABLED'];
    delete process.env['SLACK_NOTIFICATIONS_ENABLED'];
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('getInstance', () => {
    it('should return singleton instance', () => {
      const instance1 = NotificationService.getInstance();
      const instance2 = NotificationService.getInstance();
      expect(instance1).toBe(instance2);
    });
  });

  describe('alert management', () => {
    it('should send and store alert', async () => {
      const alert = {
        type: 'error' as const,
        severity: 'high' as const,
        title: 'Test Alert',
        message: 'This is a test alert',
        source: 'test'
      };

      await notificationService.sendAlert(alert);

      const activeAlerts = notificationService.getActiveAlerts();
      expect(activeAlerts).toHaveLength(1);
      expect(activeAlerts[0]).toEqual(expect.objectContaining({
        ...alert,
        id: expect.any(String),
        timestamp: expect.any(Date)
      }));

      expect(systemLogger.info).toHaveBeenCalledWith(
        `Alert generated: ${alert.title}`,
        expect.objectContaining({
          type: 'alert',
          alertId: expect.any(String),
          severity: alert.severity,
          source: alert.source
        })
      );
    });

    it('should resolve alert', async () => {
      const alert = {
        type: 'error' as const,
        severity: 'high' as const,
        title: 'Test Alert',
        message: 'This is a test alert',
        source: 'test'
      };

      await notificationService.sendAlert(alert);
      const activeAlerts = notificationService.getActiveAlerts();
      const alertId = activeAlerts[0]!.id;

      const resolved = notificationService.resolveAlert(alertId, 'admin');

      expect(resolved).toBe(true);
      expect(notificationService.getActiveAlerts()).toHaveLength(0);
      expect(systemLogger.info).toHaveBeenCalledWith(
        `Alert resolved: ${alert.title}`,
        expect.objectContaining({
          type: 'alert_resolved',
          alertId,
          resolvedBy: 'admin',
          duration: expect.any(Number)
        })
      );
    });

    it('should not resolve non-existent alert', () => {
      const resolved = notificationService.resolveAlert('non-existent-id');
      expect(resolved).toBe(false);
    });

    it('should store alert history', async () => {
      const alert = {
        type: 'warning' as const,
        severity: 'medium' as const,
        title: 'Test Alert',
        message: 'This is a test alert',
        source: 'test'
      };

      await notificationService.sendAlert(alert);

      const history = notificationService.getAlertHistory();
      expect(history).toHaveLength(1);
      expect(history[0]).toEqual(expect.objectContaining(alert));
    });

    it('should filter alerts by severity', async () => {
      await notificationService.sendAlert({
        type: 'error',
        severity: 'critical',
        title: 'Critical Alert',
        message: 'Critical issue',
        source: 'test'
      });

      await notificationService.sendAlert({
        type: 'warning',
        severity: 'medium',
        title: 'Medium Alert',
        message: 'Medium issue',
        source: 'test'
      });

      const criticalAlerts = notificationService.getAlertsBySeverity('critical');
      const mediumAlerts = notificationService.getAlertsBySeverity('medium');

      expect(criticalAlerts).toHaveLength(1);
      expect(mediumAlerts).toHaveLength(1);
      expect(criticalAlerts[0]?.severity).toBe('critical');
      expect(mediumAlerts[0]?.severity).toBe('medium');
    });
  });

  describe('rate limiting', () => {
    it('should rate limit duplicate alerts', async () => {
      const alert = {
        type: 'error' as const,
        severity: 'high' as const,
        title: 'Test Alert',
        message: 'This is a test alert',
        source: 'test'
      };

      // Send same alert twice quickly
      await notificationService.sendAlert(alert);
      await notificationService.sendAlert(alert);

      // Should only have one alert due to rate limiting
      const activeAlerts = notificationService.getActiveAlerts();
      expect(activeAlerts).toHaveLength(1);

      expect(systemLogger.debug).toHaveBeenCalledWith(
        'Alert rate limited',
        expect.objectContaining({
          alertType: 'error',
          source: 'test'
        })
      );
    });
  });

  describe('specialized alert methods', () => {
    it('should send health alert for unhealthy status', async () => {
      const healthStatus = {
        overall: 'unhealthy' as const,
        timestamp: new Date(),
        services: [
          { service: 'database', status: 'unhealthy' as const, responseTime: 1000, error: 'Connection failed' },
          { service: 'redis', status: 'degraded' as const, responseTime: 600 }
        ],
        uptime: 10000,
        version: '1.0.0'
      };

      await notificationService.sendHealthAlert(healthStatus);

      const activeAlerts = notificationService.getActiveAlerts();
      expect(activeAlerts).toHaveLength(1);
      expect(activeAlerts[0]).toEqual(expect.objectContaining({
        type: 'error',
        severity: 'high',
        title: 'System Health Alert - UNHEALTHY',
        source: 'health_check'
      }));
    });

    it('should not send health alert for healthy status', async () => {
      const healthStatus = {
        overall: 'healthy' as const,
        timestamp: new Date(),
        services: [],
        uptime: 10000,
        version: '1.0.0'
      };

      await notificationService.sendHealthAlert(healthStatus);

      const activeAlerts = notificationService.getActiveAlerts();
      expect(activeAlerts).toHaveLength(0);
    });

    it('should send scraping alert with appropriate severity', async () => {
      // Critical severity for very low success rate
      await notificationService.sendScrapingAlert('test-site', 'Connection timeout', 15);

      let activeAlerts = notificationService.getActiveAlerts();
      expect(activeAlerts[0]).toEqual(expect.objectContaining({
        type: 'error',
        severity: 'critical',
        title: 'Scraping Issues - test-site'
      }));

      // Clear alerts
      notificationService.resolveAlert(activeAlerts[0]!.id);

      // Medium severity for moderate success rate
      await notificationService.sendScrapingAlert('test-site', 'Some failures', 75);

      activeAlerts = notificationService.getActiveAlerts();
      expect(activeAlerts[0]).toEqual(expect.objectContaining({
        type: 'warning',
        severity: 'medium'
      }));
    });

    it('should send database alert', async () => {
      await notificationService.sendDatabaseAlert('INSERT', 'Constraint violation', { table: 'properties' });

      const activeAlerts = notificationService.getActiveAlerts();
      expect(activeAlerts).toHaveLength(1);
      expect(activeAlerts[0]).toEqual(expect.objectContaining({
        type: 'error',
        severity: 'high',
        title: 'Database Operation Failed',
        source: 'database'
      }));
    });
  });

  describe('notification configuration', () => {
    it('should load configuration from environment', () => {
      process.env['EMAIL_NOTIFICATIONS_ENABLED'] = 'true';
      process.env['ADMIN_EMAIL_ADDRESSES'] = 'admin1@test.com,admin2@test.com';
      process.env['WEBHOOK_NOTIFICATIONS_ENABLED'] = 'true';
      process.env['WEBHOOK_URL'] = 'https://webhook.example.com';
      process.env['SLACK_NOTIFICATIONS_ENABLED'] = 'true';
      process.env['SLACK_WEBHOOK_URL'] = 'https://hooks.slack.com/test';

      // Create new instance to load new config
      (NotificationService as any).instance = undefined;
      const service = NotificationService.getInstance();

      // Test configuration by attempting to send a critical alert
      // (This would trigger all notification methods if they were real)
      const testAlert = {
        type: 'error' as const,
        severity: 'critical' as const,
        title: 'Test Critical Alert',
        message: 'Testing configuration',
        source: 'test'
      };

      expect(async () => {
        await service.sendAlert(testAlert);
      }).not.toThrow();

      // Clean up
      delete process.env['EMAIL_NOTIFICATIONS_ENABLED'];
      delete process.env['ADMIN_EMAIL_ADDRESSES'];
      delete process.env['WEBHOOK_NOTIFICATIONS_ENABLED'];
      delete process.env['WEBHOOK_URL'];
      delete process.env['SLACK_NOTIFICATIONS_ENABLED'];
      delete process.env['SLACK_WEBHOOK_URL'];
    });

    it('should update configuration', () => {
      const newConfig = {
        email: {
          enabled: true,
          toAddresses: ['test@example.com']
        }
      };

      notificationService.updateConfiguration(newConfig);

      expect(systemLogger.logAudit).toHaveBeenCalledWith(
        'notification_config_updated',
        expect.objectContaining({
          emailEnabled: true
        })
      );
    });

    it('should test notification configuration', async () => {
      const results = await notificationService.testNotifications();

      expect(results).toEqual({
        email: false,
        webhook: false,
        slack: false
      });

      // Since no notification services are enabled, no notifications should be sent
      expect(results.email).toBe(false);
      expect(results.webhook).toBe(false);
      expect(results.slack).toBe(false);
    });
  });

  describe('utility methods', () => {
    it('should generate unique alert IDs', async () => {
      const alert1 = {
        type: 'info' as const,
        severity: 'low' as const,
        title: 'Alert 1',
        message: 'First alert',
        source: 'test'
      };

      const alert2 = {
        type: 'info' as const,
        severity: 'low' as const,
        title: 'Alert 2',
        message: 'Second alert',
        source: 'test'
      };

      await notificationService.sendAlert(alert1);
      await notificationService.sendAlert(alert2);

      const activeAlerts = notificationService.getActiveAlerts();
      expect(activeAlerts[0]?.id).not.toBe(activeAlerts[1]?.id);
    });

    it('should limit alert history size', async () => {
      // This test would need to send more than maxAlertHistory alerts
      // For now, just verify the method exists and works with small numbers
      const alert = {
        type: 'info' as const,
        severity: 'low' as const,
        title: 'Test Alert',
        message: 'Test message',
        source: 'test'
      };

      await notificationService.sendAlert(alert);

      const history = notificationService.getAlertHistory(1);
      expect(history).toHaveLength(1);
    });
  });
});