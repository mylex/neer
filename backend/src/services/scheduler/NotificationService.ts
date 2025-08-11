import axios from 'axios';
import { NotificationConfig } from './SchedulerConfig';
import { PipelineResult } from '../pipeline/DataProcessingPipeline';

export interface NotificationPayload {
  type: 'success' | 'error' | 'warning';
  title: string;
  message: string;
  timestamp: Date;
  details?: any;
}

export interface ScrapingNotification extends NotificationPayload {
  scheduleName: string;
  result?: PipelineResult;
  error?: Error;
}

/**
 * Service for sending notifications about scraping operations
 */
export class NotificationService {
  private config: NotificationConfig;

  constructor(config: NotificationConfig) {
    this.config = config;
  }

  /**
   * Send notification about scraping completion
   */
  async notifyScrapingComplete(scheduleName: string, result: PipelineResult): Promise<void> {
    const notification: ScrapingNotification = {
      type: result.success ? 'success' : 'warning',
      title: `Scraping ${result.success ? 'Completed' : 'Completed with Errors'}`,
      message: this.formatScrapingResult(scheduleName, result),
      timestamp: new Date(),
      scheduleName,
      result,
    };

    await this.sendNotification(notification);
  }

  /**
   * Send notification about scraping error
   */
  async notifyScrapingError(scheduleName: string, error: Error): Promise<void> {
    const notification: ScrapingNotification = {
      type: 'error',
      title: 'Scraping Failed',
      message: `Scheduled scraping "${scheduleName}" failed: ${error.message}`,
      timestamp: new Date(),
      scheduleName,
      error,
      details: {
        stack: error.stack,
        name: error.name,
      },
    };

    await this.sendNotification(notification);
  }

  /**
   * Send notification about health check failure
   */
  async notifyHealthCheckFailure(scheduleName: string, healthStatus: any): Promise<void> {
    const notification: ScrapingNotification = {
      type: 'error',
      title: 'Health Check Failed',
      message: `Health check failed for scheduled scraping "${scheduleName}". Status: ${healthStatus.status}`,
      timestamp: new Date(),
      scheduleName,
      details: healthStatus,
    };

    await this.sendNotification(notification);
  }

  /**
   * Send notification about maintenance mode
   */
  async notifyMaintenanceMode(scheduleName: string): Promise<void> {
    const notification: ScrapingNotification = {
      type: 'warning',
      title: 'Scraping Skipped - Maintenance Mode',
      message: `Scheduled scraping "${scheduleName}" was skipped due to maintenance mode`,
      timestamp: new Date(),
      scheduleName,
    };

    await this.sendNotification(notification);
  }

  /**
   * Send notification through configured channels
   */
  private async sendNotification(notification: ScrapingNotification): Promise<void> {
    const promises: Promise<void>[] = [];

    if (this.config.email?.enabled) {
      promises.push(this.sendEmailNotification(notification));
    }

    if (this.config.webhook?.enabled) {
      promises.push(this.sendWebhookNotification(notification));
    }

    if (this.config.slack?.enabled) {
      promises.push(this.sendSlackNotification(notification));
    }

    // Send all notifications concurrently
    await Promise.allSettled(promises);
  }

  /**
   * Send email notification (placeholder - would need actual email service)
   */
  private async sendEmailNotification(notification: ScrapingNotification): Promise<void> {
    try {
      // This is a placeholder implementation
      // In a real application, you would integrate with an email service like SendGrid, AWS SES, etc.
      console.log('Email notification would be sent:', {
        to: this.config.email!.recipients,
        subject: notification.title,
        body: notification.message,
      });
    } catch (error) {
      console.error('Failed to send email notification:', error);
    }
  }

  /**
   * Send webhook notification
   */
  private async sendWebhookNotification(notification: ScrapingNotification): Promise<void> {
    try {
      if (!this.config.webhook?.url) {
        return;
      }

      await axios.post(
        this.config.webhook.url,
        {
          ...notification,
          service: 'japanese-real-estate-scraper',
        },
        {
          headers: {
            'Content-Type': 'application/json',
            ...this.config.webhook.headers,
          },
          timeout: 10000,
        }
      );
    } catch (error) {
      console.error('Failed to send webhook notification:', error);
    }
  }

  /**
   * Send Slack notification
   */
  private async sendSlackNotification(notification: ScrapingNotification): Promise<void> {
    try {
      if (!this.config.slack?.webhookUrl) {
        return;
      }

      const color = notification.type === 'success' ? 'good' : 
                   notification.type === 'warning' ? 'warning' : 'danger';

      const payload = {
        channel: this.config.slack.channel,
        attachments: [
          {
            color,
            title: notification.title,
            text: notification.message,
            timestamp: Math.floor(notification.timestamp.getTime() / 1000),
            fields: [
              {
                title: 'Schedule',
                value: notification.scheduleName,
                short: true,
              },
              {
                title: 'Type',
                value: notification.type,
                short: true,
              },
            ],
          },
        ],
      };

      await axios.post(this.config.slack.webhookUrl, payload, {
        headers: {
          'Content-Type': 'application/json',
        },
        timeout: 10000,
      });
    } catch (error) {
      console.error('Failed to send Slack notification:', error);
    }
  }

  /**
   * Format scraping result for notification message
   */
  private formatScrapingResult(scheduleName: string, result: PipelineResult): string {
    const duration = Math.round(result.processingTime / 1000);
    const sitesProcessed = result.siteResults.size;
    
    let message = `Schedule: ${scheduleName}\n`;
    message += `Duration: ${duration}s\n`;
    message += `Sites processed: ${sitesProcessed}\n`;
    message += `Total properties: ${result.totalProcessed}\n`;
    message += `New properties: ${result.newProperties}\n`;
    message += `Updated properties: ${result.updatedProperties}\n`;
    message += `Translated properties: ${result.translatedProperties}\n`;
    
    if (result.errors.length > 0) {
      message += `Errors: ${result.errors.length}\n`;
      message += `Error details: ${result.errors.map(e => e.message).join(', ')}`;
    }

    return message;
  }

  /**
   * Test notification configuration
   */
  async testNotifications(): Promise<{ success: boolean; results: Record<string, boolean> }> {
    const results: Record<string, boolean> = {};
    let overallSuccess = true;

    if (this.config.email?.enabled) {
      try {
        await this.sendEmailNotification({
          type: 'success',
          title: 'Test Notification',
          message: 'This is a test notification from the Japanese Real Estate Scraper',
          timestamp: new Date(),
          scheduleName: 'test',
        });
        results['email'] = true;
      } catch (error) {
        results['email'] = false;
        overallSuccess = false;
      }
    }

    if (this.config.webhook?.enabled) {
      try {
        await this.sendWebhookNotification({
          type: 'success',
          title: 'Test Notification',
          message: 'This is a test notification from the Japanese Real Estate Scraper',
          timestamp: new Date(),
          scheduleName: 'test',
        });
        results['webhook'] = true;
      } catch (error) {
        results['webhook'] = false;
        overallSuccess = false;
      }
    }

    if (this.config.slack?.enabled) {
      try {
        await this.sendSlackNotification({
          type: 'success',
          title: 'Test Notification',
          message: 'This is a test notification from the Japanese Real Estate Scraper',
          timestamp: new Date(),
          scheduleName: 'test',
        });
        results['slack'] = true;
      } catch (error) {
        results['slack'] = false;
        overallSuccess = false;
      }
    }

    return { success: overallSuccess, results };
  }
}