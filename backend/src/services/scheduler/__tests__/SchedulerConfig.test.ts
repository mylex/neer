import { loadSchedulerConfig, defaultSchedulerConfig } from '../SchedulerConfig';

describe('SchedulerConfig', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  describe('loadSchedulerConfig', () => {
    it('should return default configuration when no environment variables are set', () => {
      const config = loadSchedulerConfig();
      expect(config).toEqual(defaultSchedulerConfig);
    });

    it('should override daily schedule configuration from environment variables', () => {
      process.env['SCHEDULER_DAILY_ENABLED'] = 'false';
      process.env['SCHEDULER_DAILY_CRON'] = '0 3 * * *';
      process.env['SCHEDULER_TIMEZONE'] = 'UTC';

      const config = loadSchedulerConfig();

      expect(config.schedules['daily']!.enabled).toBe(false);
      expect(config.schedules['daily']!.cronExpression).toBe('0 3 * * *');
      expect(config.schedules['daily']!.timezone).toBe('UTC');
    });

    it('should override notification configuration from environment variables', () => {
      process.env['NOTIFICATIONS_EMAIL_ENABLED'] = 'true';
      process.env['NOTIFICATIONS_EMAIL_RECIPIENTS'] = 'admin@example.com,dev@example.com';
      process.env['NOTIFICATIONS_WEBHOOK_ENABLED'] = 'true';
      process.env['NOTIFICATIONS_WEBHOOK_URL'] = 'https://webhook.example.com';
      process.env['NOTIFICATIONS_SLACK_ENABLED'] = 'true';
      process.env['NOTIFICATIONS_SLACK_WEBHOOK_URL'] = 'https://hooks.slack.com/test';

      const config = loadSchedulerConfig();

      expect(config.notifications.email?.enabled).toBe(true);
      expect(config.notifications.email?.recipients).toEqual(['admin@example.com', 'dev@example.com']);
      expect(config.notifications.webhook?.enabled).toBe(true);
      expect(config.notifications.webhook?.url).toBe('https://webhook.example.com');
      expect(config.notifications.slack?.enabled).toBe(true);
      expect(config.notifications.slack?.webhookUrl).toBe('https://hooks.slack.com/test');
    });

    it('should override health check configuration from environment variables', () => {
      process.env['HEALTH_CHECK_ENABLED'] = 'false';
      process.env['HEALTH_CHECK_TIMEOUT'] = '60000';

      const config = loadSchedulerConfig();

      expect(config.healthCheck.enabled).toBe(false);
      expect(config.healthCheck.timeout).toBe(60000);
    });

    it('should handle boolean environment variables correctly', () => {
      process.env['SCHEDULER_DAILY_ENABLED'] = 'true';
      process.env['NOTIFICATIONS_EMAIL_ENABLED'] = 'false';

      const config = loadSchedulerConfig();

      expect(config.schedules['daily']!.enabled).toBe(true);
      expect(config.notifications.email?.enabled).toBe(false);
    });

    it('should handle numeric environment variables correctly', () => {
      process.env['HEALTH_CHECK_TIMEOUT'] = '45000';

      const config = loadSchedulerConfig();

      expect(config.healthCheck.timeout).toBe(45000);
    });
  });

  describe('defaultSchedulerConfig', () => {
    it('should have valid default values', () => {
      expect(defaultSchedulerConfig.schedules['daily']!.enabled).toBe(true);
      expect(defaultSchedulerConfig.schedules['daily']!.cronExpression).toBe('0 2 * * *');
      expect(defaultSchedulerConfig.schedules['daily']!.timezone).toBe('Asia/Tokyo');
      expect(defaultSchedulerConfig.schedules['daily']!.sites).toEqual(['suumo']);
      expect(defaultSchedulerConfig.schedules['daily']!.healthCheckEnabled).toBe(true);
      expect(defaultSchedulerConfig.schedules['daily']!.notificationsEnabled).toBe(true);
    });

    it('should have notifications disabled by default', () => {
      expect(defaultSchedulerConfig.notifications.email?.enabled).toBe(false);
      expect(defaultSchedulerConfig.notifications.webhook?.enabled).toBe(false);
      expect(defaultSchedulerConfig.notifications.slack?.enabled).toBe(false);
    });

    it('should have health check enabled by default', () => {
      expect(defaultSchedulerConfig.healthCheck.enabled).toBe(true);
      expect(defaultSchedulerConfig.healthCheck.timeout).toBe(30000);
      expect(defaultSchedulerConfig.healthCheck.retryAttempts).toBe(3);
      expect(defaultSchedulerConfig.healthCheck.retryDelay).toBe(5000);
    });

    it('should have maintenance mode disabled by default', () => {
      expect(defaultSchedulerConfig.maintenance.enabled).toBe(false);
    });
  });
});