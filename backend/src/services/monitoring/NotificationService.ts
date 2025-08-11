import { systemLogger } from './SystemLogger';
import { SystemHealthStatus } from './HealthCheckService';

export interface NotificationConfig {
  email?: {
    enabled: boolean;
    smtpHost?: string | undefined;
    smtpPort?: number;
    smtpUser?: string | undefined;
    smtpPassword?: string | undefined;
    fromAddress?: string | undefined;
    toAddresses: string[];
  };
  webhook?: {
    enabled: boolean;
    url: string;
    headers?: Record<string, string>;
  };
  slack?: {
    enabled: boolean;
    webhookUrl: string;
    channel?: string | undefined;
  };
}

export interface Alert {
  id: string;
  type: 'error' | 'warning' | 'info';
  severity: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  message: string;
  timestamp: Date;
  source: string;
  details?: any;
  resolved?: boolean;
  resolvedAt?: Date;
}

/**
 * Notification service for alerting administrators about system issues
 */
export class NotificationService {
  private static instance: NotificationService;
  private config: NotificationConfig;
  private activeAlerts: Map<string, Alert> = new Map();
  private alertHistory: Alert[] = [];
  private maxAlertHistory = 1000;
  private rateLimitMap: Map<string, number> = new Map();
  private rateLimitWindow = 15 * 60 * 1000; // 15 minutes

  private constructor() {
    this.config = this.loadConfiguration();
    this.startAlertCleanup();
  }

  /**
   * Get singleton instance
   */
  public static getInstance(): NotificationService {
    if (!NotificationService.instance) {
      NotificationService.instance = new NotificationService();
    }
    return NotificationService.instance;
  }

  /**
   * Load notification configuration from environment
   */
  private loadConfiguration(): NotificationConfig {
    return {
      email: {
        enabled: process.env['EMAIL_NOTIFICATIONS_ENABLED'] === 'true',
        smtpHost: process.env['SMTP_HOST'] || undefined,
        smtpPort: parseInt(process.env['SMTP_PORT'] || '587'),
        smtpUser: process.env['SMTP_USER'] || undefined,
        smtpPassword: process.env['SMTP_PASSWORD'] || undefined,
        fromAddress: process.env['SMTP_FROM_ADDRESS'] || undefined,
        toAddresses: (process.env['ADMIN_EMAIL_ADDRESSES'] || '').split(',').filter(email => email.trim())
      },
      webhook: {
        enabled: process.env['WEBHOOK_NOTIFICATIONS_ENABLED'] === 'true',
        url: process.env['WEBHOOK_URL'] || '',
        headers: process.env['WEBHOOK_HEADERS'] ? JSON.parse(process.env['WEBHOOK_HEADERS']) : undefined
      },
      slack: {
        enabled: process.env['SLACK_NOTIFICATIONS_ENABLED'] === 'true',
        webhookUrl: process.env['SLACK_WEBHOOK_URL'] || '',
        channel: process.env['SLACK_CHANNEL'] || undefined
      }
    };
  }

  /**
   * Send alert notification
   */
  async sendAlert(alert: Omit<Alert, 'id' | 'timestamp'>): Promise<void> {
    const fullAlert: Alert = {
      ...alert,
      id: this.generateAlertId(),
      timestamp: new Date()
    };

    // Check rate limiting
    if (this.isRateLimited(fullAlert)) {
      systemLogger.debug('Alert rate limited', { alertType: fullAlert.type, source: fullAlert.source });
      return;
    }

    // Store alert
    this.activeAlerts.set(fullAlert.id, fullAlert);
    this.alertHistory.push(fullAlert);

    // Trim history if needed
    if (this.alertHistory.length > this.maxAlertHistory) {
      this.alertHistory = this.alertHistory.slice(-this.maxAlertHistory);
    }

    systemLogger.info(`Alert generated: ${fullAlert.title}`, {
      type: 'alert',
      alertId: fullAlert.id,
      severity: fullAlert.severity,
      source: fullAlert.source
    });

    // Send notifications based on severity and configuration
    const promises: Promise<void>[] = [];

    if (fullAlert.severity === 'critical' || fullAlert.severity === 'high') {
      // Send all configured notifications for high/critical alerts
      if (this.config.email?.enabled) {
        promises.push(this.sendEmailNotification(fullAlert));
      }
      if (this.config.webhook?.enabled) {
        promises.push(this.sendWebhookNotification(fullAlert));
      }
      if (this.config.slack?.enabled) {
        promises.push(this.sendSlackNotification(fullAlert));
      }
    } else if (fullAlert.severity === 'medium') {
      // Send webhook and slack for medium alerts
      if (this.config.webhook?.enabled) {
        promises.push(this.sendWebhookNotification(fullAlert));
      }
      if (this.config.slack?.enabled) {
        promises.push(this.sendSlackNotification(fullAlert));
      }
    }
    // Low severity alerts are only logged, not sent

    // Execute all notifications
    const results = await Promise.allSettled(promises);
    
    // Log any notification failures
    results.forEach((result, index) => {
      if (result.status === 'rejected') {
        systemLogger.error('Failed to send notification', result.reason, {
          alertId: fullAlert.id,
          notificationIndex: index
        });
      }
    });
  }

  /**
   * Send email notification
   */
  private async sendEmailNotification(alert: Alert): Promise<void> {
    try {
      // This is a placeholder - in a real implementation, you would use nodemailer or similar
      systemLogger.info('Email notification would be sent', {
        alertId: alert.id,
        recipients: this.config.email?.toAddresses,
        subject: `[${alert.severity.toUpperCase()}] ${alert.title}`
      });

      // Simulate email sending
      await new Promise(resolve => setTimeout(resolve, 100));
      
    } catch (error) {
      throw new Error(`Failed to send email notification: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Send webhook notification
   */
  private async sendWebhookNotification(alert: Alert): Promise<void> {
    try {
      if (!this.config.webhook?.url) {
        throw new Error('Webhook URL not configured');
      }

      const payload = {
        alert: {
          id: alert.id,
          type: alert.type,
          severity: alert.severity,
          title: alert.title,
          message: alert.message,
          timestamp: alert.timestamp.toISOString(),
          source: alert.source,
          details: alert.details
        },
        system: {
          service: 'japanese-real-estate-scraper',
          environment: process.env['NODE_ENV'] || 'development'
        }
      };

      // This is a placeholder - in a real implementation, you would use fetch or axios
      systemLogger.info('Webhook notification would be sent', {
        alertId: alert.id,
        webhookUrl: this.config.webhook.url,
        payload
      });

      // Simulate webhook sending
      await new Promise(resolve => setTimeout(resolve, 100));

    } catch (error) {
      throw new Error(`Failed to send webhook notification: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Send Slack notification
   */
  private async sendSlackNotification(alert: Alert): Promise<void> {
    try {
      if (!this.config.slack?.webhookUrl) {
        throw new Error('Slack webhook URL not configured');
      }

      const color = this.getSlackColor(alert.severity);
      const emoji = this.getAlertEmoji(alert.type, alert.severity);

      const payload = {
        channel: this.config.slack.channel,
        username: 'Real Estate Scraper Monitor',
        icon_emoji: ':warning:',
        attachments: [{
          color,
          title: `${emoji} ${alert.title}`,
          text: alert.message,
          fields: [
            {
              title: 'Severity',
              value: alert.severity.toUpperCase(),
              short: true
            },
            {
              title: 'Source',
              value: alert.source,
              short: true
            },
            {
              title: 'Time',
              value: alert.timestamp.toISOString(),
              short: true
            }
          ],
          footer: 'Japanese Real Estate Scraper',
          ts: Math.floor(alert.timestamp.getTime() / 1000)
        }]
      };

      // This is a placeholder - in a real implementation, you would use fetch or axios
      systemLogger.info('Slack notification would be sent', {
        alertId: alert.id,
        channel: this.config.slack.channel,
        payload
      });

      // Simulate Slack sending
      await new Promise(resolve => setTimeout(resolve, 100));

    } catch (error) {
      throw new Error(`Failed to send Slack notification: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Resolve an alert
   */
  resolveAlert(alertId: string, resolvedBy?: string): boolean {
    const alert = this.activeAlerts.get(alertId);
    if (!alert) {
      return false;
    }

    alert.resolved = true;
    alert.resolvedAt = new Date();
    
    systemLogger.info(`Alert resolved: ${alert.title}`, {
      type: 'alert_resolved',
      alertId,
      resolvedBy,
      duration: alert.resolvedAt.getTime() - alert.timestamp.getTime()
    });

    this.activeAlerts.delete(alertId);
    return true;
  }

  /**
   * Send health status alert
   */
  async sendHealthAlert(healthStatus: SystemHealthStatus): Promise<void> {
    if (healthStatus.overall === 'healthy') {
      return; // No alert needed for healthy status
    }

    const unhealthyServices = healthStatus.services.filter(s => s.status === 'unhealthy');
    const degradedServices = healthStatus.services.filter(s => s.status === 'degraded');

    const severity = unhealthyServices.length > 0 ? 'high' : 'medium';
    const type = unhealthyServices.length > 0 ? 'error' : 'warning';

    let message = `System health check shows ${healthStatus.overall} status. `;
    
    if (unhealthyServices.length > 0) {
      message += `Unhealthy services: ${unhealthyServices.map(s => s.service).join(', ')}. `;
    }
    
    if (degradedServices.length > 0) {
      message += `Degraded services: ${degradedServices.map(s => s.service).join(', ')}.`;
    }

    await this.sendAlert({
      type,
      severity,
      title: `System Health Alert - ${healthStatus.overall.toUpperCase()}`,
      message,
      source: 'health_check',
      details: {
        overallStatus: healthStatus.overall,
        unhealthyServices: unhealthyServices.map(s => ({ service: s.service, error: s.error })),
        degradedServices: degradedServices.map(s => ({ service: s.service, details: s.details })),
        timestamp: healthStatus.timestamp
      }
    });
  }

  /**
   * Send scraping failure alert
   */
  async sendScrapingAlert(siteName: string, errorMessage: string, successRate: number): Promise<void> {
    let severity: Alert['severity'] = 'low';
    let type: Alert['type'] = 'warning';

    if (successRate < 20) {
      severity = 'critical';
      type = 'error';
    } else if (successRate < 50) {
      severity = 'high';
      type = 'error';
    } else if (successRate < 80) {
      severity = 'medium';
    }

    await this.sendAlert({
      type,
      severity,
      title: `Scraping Issues - ${siteName}`,
      message: `Scraping success rate for ${siteName} has dropped to ${successRate.toFixed(1)}%. Error: ${errorMessage}`,
      source: 'scraper',
      details: {
        siteName,
        successRate,
        errorMessage,
        timestamp: new Date()
      }
    });
  }

  /**
   * Send database alert
   */
  async sendDatabaseAlert(operation: string, error: string, details?: any): Promise<void> {
    await this.sendAlert({
      type: 'error',
      severity: 'high',
      title: 'Database Operation Failed',
      message: `Database operation '${operation}' failed: ${error}`,
      source: 'database',
      details: {
        operation,
        error,
        ...details,
        timestamp: new Date()
      }
    });
  }

  /**
   * Get active alerts
   */
  getActiveAlerts(): Alert[] {
    return Array.from(this.activeAlerts.values());
  }

  /**
   * Get alert history
   */
  getAlertHistory(limit?: number): Alert[] {
    const history = [...this.alertHistory].reverse(); // Most recent first
    return limit ? history.slice(0, limit) : history;
  }

  /**
   * Get alerts by severity
   */
  getAlertsBySeverity(severity: Alert['severity']): Alert[] {
    return this.getActiveAlerts().filter(alert => alert.severity === severity);
  }

  /**
   * Check if alert is rate limited
   */
  private isRateLimited(alert: Alert): boolean {
    const key = `${alert.source}:${alert.type}:${alert.severity}`;
    const now = Date.now();
    const lastSent = this.rateLimitMap.get(key);

    if (!lastSent || now - lastSent > this.rateLimitWindow) {
      this.rateLimitMap.set(key, now);
      return false;
    }

    return true;
  }

  /**
   * Generate unique alert ID
   */
  private generateAlertId(): string {
    return `ALERT_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Get Slack color for severity
   */
  private getSlackColor(severity: Alert['severity']): string {
    switch (severity) {
      case 'critical': return 'danger';
      case 'high': return 'danger';
      case 'medium': return 'warning';
      case 'low': return 'good';
      default: return '#808080';
    }
  }

  /**
   * Get emoji for alert type and severity
   */
  private getAlertEmoji(type: Alert['type'], severity: Alert['severity']): string {
    if (severity === 'critical') return '🚨';
    if (severity === 'high') return '❌';
    if (type === 'error') return '⚠️';
    if (type === 'warning') return '⚠️';
    return 'ℹ️';
  }

  /**
   * Start alert cleanup process
   */
  private startAlertCleanup(): void {
    // Clean up resolved alerts older than 24 hours
    setInterval(() => {
      const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000);
      
      for (const [id, alert] of this.activeAlerts.entries()) {
        if (alert.resolved && alert.resolvedAt && alert.resolvedAt < cutoff) {
          this.activeAlerts.delete(id);
        }
      }

      // Clean up rate limit map
      const rateLimitCutoff = Date.now() - this.rateLimitWindow;
      for (const [key, timestamp] of this.rateLimitMap.entries()) {
        if (timestamp < rateLimitCutoff) {
          this.rateLimitMap.delete(key);
        }
      }
    }, 60 * 60 * 1000); // Every hour
  }

  /**
   * Update notification configuration
   */
  updateConfiguration(config: Partial<NotificationConfig>): void {
    this.config = { ...this.config, ...config };
    
    systemLogger.logAudit('notification_config_updated', {
      emailEnabled: this.config.email?.enabled,
      webhookEnabled: this.config.webhook?.enabled,
      slackEnabled: this.config.slack?.enabled
    });
  }

  /**
   * Test notification configuration
   */
  async testNotifications(): Promise<{ email: boolean; webhook: boolean; slack: boolean }> {
    const testAlert: Alert = {
      id: 'TEST_' + Date.now(),
      type: 'info',
      severity: 'low',
      title: 'Test Notification',
      message: 'This is a test notification to verify the notification system is working correctly.',
      timestamp: new Date(),
      source: 'notification_test'
    };

    const results = {
      email: false,
      webhook: false,
      slack: false
    };

    if (this.config.email?.enabled) {
      try {
        await this.sendEmailNotification(testAlert);
        results.email = true;
      } catch (error) {
        systemLogger.error('Email notification test failed', error instanceof Error ? error : new Error(String(error)));
      }
    }

    if (this.config.webhook?.enabled) {
      try {
        await this.sendWebhookNotification(testAlert);
        results.webhook = true;
      } catch (error) {
        systemLogger.error('Webhook notification test failed', error instanceof Error ? error : new Error(String(error)));
      }
    }

    if (this.config.slack?.enabled) {
      try {
        await this.sendSlackNotification(testAlert);
        results.slack = true;
      } catch (error) {
        systemLogger.error('Slack notification test failed', error instanceof Error ? error : new Error(String(error)));
      }
    }

    return results;
  }
}

// Export singleton instance
export const notificationService = NotificationService.getInstance();