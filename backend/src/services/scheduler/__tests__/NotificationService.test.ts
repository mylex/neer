import axios from 'axios';
import { NotificationService } from '../NotificationService';
import { NotificationConfig } from '../SchedulerConfig';
import { PipelineResult } from '../../pipeline/DataProcessingPipeline';

// Mock axios
jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('NotificationService', () => {
  let notificationService: NotificationService;
  let mockConfig: NotificationConfig;

  beforeEach(() => {
    mockConfig = {
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
    };

    notificationService = new NotificationService(mockConfig);
    jest.clearAllMocks();
  });

  describe('notifyScrapingComplete', () => {
    it('should send success notification for successful scraping', async () => {
      const mockResult: PipelineResult = {
        success: true,
        totalProcessed: 100,
        newProperties: 80,
        updatedProperties: 20,
        translatedProperties: 95,
        errors: [],
        processingTime: 30000,
        siteResults: new Map(),
      };

      mockConfig.webhook!.enabled = true;
      mockConfig.webhook!.url = 'https://webhook.example.com';
      notificationService = new NotificationService(mockConfig);

      mockedAxios.post.mockResolvedValueOnce({ status: 200 });

      await notificationService.notifyScrapingComplete('daily', mockResult);

      expect(mockedAxios.post).toHaveBeenCalledWith(
        'https://webhook.example.com',
        expect.objectContaining({
          type: 'success',
          title: 'Scraping Completed',
          scheduleName: 'daily',
          result: mockResult,
        }),
        expect.objectContaining({
          headers: {
            'Content-Type': 'application/json',
          },
          timeout: 10000,
        })
      );
    });

    it('should send warning notification for scraping with errors', async () => {
      const mockResult: PipelineResult = {
        success: false,
        totalProcessed: 50,
        newProperties: 40,
        updatedProperties: 10,
        translatedProperties: 45,
        errors: [{ message: 'Test error' } as any],
        processingTime: 25000,
        siteResults: new Map(),
      };

      mockConfig.webhook!.enabled = true;
      mockConfig.webhook!.url = 'https://webhook.example.com';
      notificationService = new NotificationService(mockConfig);

      mockedAxios.post.mockResolvedValueOnce({ status: 200 });

      await notificationService.notifyScrapingComplete('daily', mockResult);

      expect(mockedAxios.post).toHaveBeenCalledWith(
        'https://webhook.example.com',
        expect.objectContaining({
          type: 'warning',
          title: 'Scraping Completed with Errors',
          scheduleName: 'daily',
          result: mockResult,
        }),
        expect.any(Object)
      );
    });
  });

  describe('notifyScrapingError', () => {
    it('should send error notification', async () => {
      const mockError = new Error('Scraping failed');
      
      mockConfig.webhook!.enabled = true;
      mockConfig.webhook!.url = 'https://webhook.example.com';
      notificationService = new NotificationService(mockConfig);

      mockedAxios.post.mockResolvedValueOnce({ status: 200 });

      await notificationService.notifyScrapingError('daily', mockError);

      expect(mockedAxios.post).toHaveBeenCalledWith(
        'https://webhook.example.com',
        expect.objectContaining({
          type: 'error',
          title: 'Scraping Failed',
          message: 'Scheduled scraping "daily" failed: Scraping failed',
          scheduleName: 'daily',
          error: mockError,
        }),
        expect.any(Object)
      );
    });
  });

  describe('notifyHealthCheckFailure', () => {
    it('should send health check failure notification', async () => {
      const mockHealthStatus = {
        status: 'unhealthy',
        services: {
          database: { status: 'unhealthy' },
          translation: { status: 'healthy' },
          scraping: { status: 'unhealthy' },
        },
      };

      mockConfig.webhook!.enabled = true;
      mockConfig.webhook!.url = 'https://webhook.example.com';
      notificationService = new NotificationService(mockConfig);

      mockedAxios.post.mockResolvedValueOnce({ status: 200 });

      await notificationService.notifyHealthCheckFailure('daily', mockHealthStatus);

      expect(mockedAxios.post).toHaveBeenCalledWith(
        'https://webhook.example.com',
        expect.objectContaining({
          type: 'error',
          title: 'Health Check Failed',
          scheduleName: 'daily',
          details: mockHealthStatus,
        }),
        expect.any(Object)
      );
    });
  });

  describe('sendSlackNotification', () => {
    it('should send Slack notification with correct format', async () => {
      mockConfig.slack!.enabled = true;
      mockConfig.slack!.webhookUrl = 'https://hooks.slack.com/test';
      mockConfig.slack!.channel = '#alerts';
      notificationService = new NotificationService(mockConfig);

      mockedAxios.post.mockResolvedValueOnce({ status: 200 });

      const notification = {
        type: 'success' as const,
        title: 'Test Notification',
        message: 'Test message',
        timestamp: new Date(),
        scheduleName: 'test',
      };

      await (notificationService as any).sendSlackNotification(notification);

      expect(mockedAxios.post).toHaveBeenCalledWith(
        'https://hooks.slack.com/test',
        expect.objectContaining({
          channel: '#alerts',
          attachments: expect.arrayContaining([
            expect.objectContaining({
              color: 'good',
              title: 'Test Notification',
              text: 'Test message',
              fields: expect.arrayContaining([
                { title: 'Schedule', value: 'test', short: true },
                { title: 'Type', value: 'success', short: true },
              ]),
            }),
          ]),
        }),
        expect.objectContaining({
          headers: {
            'Content-Type': 'application/json',
          },
          timeout: 10000,
        })
      );
    });

    it('should use correct colors for different notification types', async () => {
      mockConfig.slack!.enabled = true;
      mockConfig.slack!.webhookUrl = 'https://hooks.slack.com/test';
      notificationService = new NotificationService(mockConfig);

      mockedAxios.post.mockResolvedValue({ status: 200 });

      const testCases = [
        { type: 'success' as const, expectedColor: 'good' },
        { type: 'warning' as const, expectedColor: 'warning' },
        { type: 'error' as const, expectedColor: 'danger' },
      ];

      for (const testCase of testCases) {
        const notification = {
          type: testCase.type,
          title: 'Test',
          message: 'Test',
          timestamp: new Date(),
          scheduleName: 'test',
        };

        await (notificationService as any).sendSlackNotification(notification);

        expect(mockedAxios.post).toHaveBeenCalledWith(
          expect.any(String),
          expect.objectContaining({
            attachments: expect.arrayContaining([
              expect.objectContaining({
                color: testCase.expectedColor,
              }),
            ]),
          }),
          expect.any(Object)
        );
      }
    });
  });

  describe('testNotifications', () => {
    it('should test all enabled notification channels', async () => {
      mockConfig.webhook!.enabled = true;
      mockConfig.webhook!.url = 'https://webhook.example.com';
      mockConfig.slack!.enabled = true;
      mockConfig.slack!.webhookUrl = 'https://hooks.slack.com/test';
      notificationService = new NotificationService(mockConfig);

      mockedAxios.post.mockResolvedValue({ status: 200 });

      const result = await notificationService.testNotifications();

      expect(result.success).toBe(true);
      expect(result.results['webhook']).toBe(true);
      expect(result.results['slack']).toBe(true);
      expect(mockedAxios.post).toHaveBeenCalledTimes(2);
    });

    it('should handle notification failures gracefully', async () => {
      mockConfig.webhook!.enabled = true;
      mockConfig.webhook!.url = 'https://webhook.example.com';
      notificationService = new NotificationService(mockConfig);

      mockedAxios.post.mockRejectedValueOnce(new Error('Network error'));

      const result = await notificationService.testNotifications();

      expect(result.success).toBe(false);
      expect(result.results['webhook']).toBe(false);
    });
  });

  describe('error handling', () => {
    it('should handle webhook notification errors gracefully', async () => {
      mockConfig.webhook!.enabled = true;
      mockConfig.webhook!.url = 'https://webhook.example.com';
      notificationService = new NotificationService(mockConfig);

      mockedAxios.post.mockRejectedValueOnce(new Error('Network error'));

      // Should not throw
      await expect(
        notificationService.notifyScrapingError('test', new Error('Test error'))
      ).resolves.not.toThrow();
    });

    it('should handle Slack notification errors gracefully', async () => {
      mockConfig.slack!.enabled = true;
      mockConfig.slack!.webhookUrl = 'https://hooks.slack.com/test';
      notificationService = new NotificationService(mockConfig);

      mockedAxios.post.mockRejectedValueOnce(new Error('Network error'));

      // Should not throw
      await expect(
        notificationService.notifyScrapingError('test', new Error('Test error'))
      ).resolves.not.toThrow();
    });
  });
});