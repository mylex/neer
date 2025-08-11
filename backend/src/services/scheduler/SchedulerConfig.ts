import { SupportedSite } from '../scraper';

export interface ScheduleConfig {
  enabled: boolean;
  cronExpression: string;
  timezone?: string;
  sites: SupportedSite[];
  healthCheckEnabled: boolean;
  notificationsEnabled: boolean;
}

export interface NotificationConfig {
  email?: {
    enabled: boolean;
    recipients: string[];
    smtpHost?: string;
    smtpPort?: number;
    smtpUser?: string;
    smtpPassword?: string;
  };
  webhook?: {
    enabled: boolean;
    url: string;
    headers?: Record<string, string>;
  };
  slack?: {
    enabled: boolean;
    webhookUrl: string;
    channel?: string;
  };
}

export interface SchedulerConfig {
  schedules: Record<string, ScheduleConfig>;
  notifications: NotificationConfig;
  healthCheck: {
    enabled: boolean;
    timeout: number;
    retryAttempts: number;
    retryDelay: number;
  };
  maintenance: {
    enabled: boolean;
    maintenanceWindow: {
      start: string; // HH:mm format
      end: string;   // HH:mm format
      timezone: string;
    };
  };
}

export const defaultSchedulerConfig: SchedulerConfig = {
  schedules: {
    daily: {
      enabled: true,
      cronExpression: '0 2 * * *', // Daily at 2 AM
      timezone: 'Asia/Tokyo',
      sites: ['suumo'],
      healthCheckEnabled: true,
      notificationsEnabled: true,
    },
    hourly: {
      enabled: false,
      cronExpression: '0 * * * *', // Every hour
      timezone: 'Asia/Tokyo',
      sites: ['suumo'],
      healthCheckEnabled: true,
      notificationsEnabled: false,
    },
    weekly: {
      enabled: false,
      cronExpression: '0 3 * * 0', // Weekly on Sunday at 3 AM
      timezone: 'Asia/Tokyo',
      sites: ['suumo'],
      healthCheckEnabled: true,
      notificationsEnabled: true,
    },
  },
  notifications: {
    email: {
      enabled: false,
      recipients: [],
    },
    webhook: {
      enabled: false,
      url: '',
    },
    slack: {
      enabled: false,
      webhookUrl: '',
    },
  },
  healthCheck: {
    enabled: true,
    timeout: 30000, // 30 seconds
    retryAttempts: 3,
    retryDelay: 5000, // 5 seconds
  },
  maintenance: {
    enabled: false,
    maintenanceWindow: {
      start: '01:00',
      end: '02:00',
      timezone: 'Asia/Tokyo',
    },
  },
};

/**
 * Load scheduler configuration from environment variables
 */
export function loadSchedulerConfig(): SchedulerConfig {
  const config = { ...defaultSchedulerConfig };

  // Override with environment variables if present
  if (process.env['SCHEDULER_DAILY_ENABLED']) {
    config.schedules['daily']!.enabled = process.env['SCHEDULER_DAILY_ENABLED'] === 'true';
  }

  if (process.env['SCHEDULER_DAILY_CRON']) {
    config.schedules['daily']!.cronExpression = process.env['SCHEDULER_DAILY_CRON'];
  }

  if (process.env['SCHEDULER_TIMEZONE']) {
    config.schedules['daily']!.timezone = process.env['SCHEDULER_TIMEZONE'];
  }

  // Notification configuration
  if (process.env['NOTIFICATIONS_EMAIL_ENABLED']) {
    config.notifications.email!.enabled = process.env['NOTIFICATIONS_EMAIL_ENABLED'] === 'true';
  }

  if (process.env['NOTIFICATIONS_EMAIL_RECIPIENTS']) {
    config.notifications.email!.recipients = process.env['NOTIFICATIONS_EMAIL_RECIPIENTS'].split(',');
  }

  if (process.env['NOTIFICATIONS_WEBHOOK_ENABLED']) {
    config.notifications.webhook!.enabled = process.env['NOTIFICATIONS_WEBHOOK_ENABLED'] === 'true';
  }

  if (process.env['NOTIFICATIONS_WEBHOOK_URL']) {
    config.notifications.webhook!.url = process.env['NOTIFICATIONS_WEBHOOK_URL'];
  }

  if (process.env['NOTIFICATIONS_SLACK_ENABLED']) {
    config.notifications.slack!.enabled = process.env['NOTIFICATIONS_SLACK_ENABLED'] === 'true';
  }

  if (process.env['NOTIFICATIONS_SLACK_WEBHOOK_URL']) {
    config.notifications.slack!.webhookUrl = process.env['NOTIFICATIONS_SLACK_WEBHOOK_URL'];
  }

  // Health check configuration
  if (process.env['HEALTH_CHECK_ENABLED']) {
    config.healthCheck.enabled = process.env['HEALTH_CHECK_ENABLED'] === 'true';
  }

  if (process.env['HEALTH_CHECK_TIMEOUT']) {
    config.healthCheck.timeout = parseInt(process.env['HEALTH_CHECK_TIMEOUT'], 10);
  }

  return config;
}