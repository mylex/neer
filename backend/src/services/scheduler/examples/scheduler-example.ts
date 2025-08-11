import { SchedulerService, SchedulerConfig, ScheduleConfig } from '../index';
import { PipelineConfig } from '../../pipeline/DataProcessingPipeline';

/**
 * Example demonstrating how to use the SchedulerService
 */
async function schedulerExample() {
  console.log('=== Scheduler Service Example ===\n');

  // 1. Create pipeline configuration
  const pipelineConfig: PipelineConfig = {
    scraperConfig: {
      browserConfig: {
        headless: true,
        timeout: 60000,
        viewport: { width: 1920, height: 1080 },
      },
      scraperOptions: {
        maxRetries: 3,
        retryDelay: 5000,
        requestDelay: 2000,
        maxConcurrentPages: 2,
        timeout: 60000,
      },
    },
    translationConfig: {
      provider: 'google',
      apiKey: process.env['GOOGLE_TRANSLATE_API_KEY'] || '',
      projectId: process.env['GOOGLE_CLOUD_PROJECT_ID'] || '',
      cacheEnabled: true,
      batchSize: 50,
      rateLimitDelay: 100,
      maxRetries: 3,
      timeout: 30000,
    },
    processingOptions: {
      batchSize: 20,
      maxConcurrentSites: 2,
      enableDuplicateDetection: true,
      enableDataUpdate: true,
      skipTranslationOnError: false,
    },
  };

  // 2. Create custom scheduler configuration
  const schedulerConfig: SchedulerConfig = {
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
        enabled: true,
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
        recipients: ['admin@example.com'],
      },
      webhook: {
        enabled: true,
        url: 'https://your-webhook-url.com/notifications',
        headers: {
          'Authorization': 'Bearer your-token',
        },
      },
      slack: {
        enabled: false,
        webhookUrl: 'https://hooks.slack.com/services/YOUR/SLACK/WEBHOOK',
        channel: '#scraping-alerts',
      },
    },
    healthCheck: {
      enabled: true,
      timeout: 30000,
      retryAttempts: 3,
      retryDelay: 5000,
    },
    maintenance: {
      enabled: true,
      maintenanceWindow: {
        start: '01:00',
        end: '02:00',
        timezone: 'Asia/Tokyo',
      },
    },
  };

  // 3. Create scheduler service
  const scheduler = new SchedulerService(pipelineConfig, schedulerConfig);

  try {
    // 4. Start the scheduler
    console.log('Starting scheduler...');
    await scheduler.start();
    console.log('Scheduler started successfully!\n');

    // 5. Get initial status
    console.log('Initial scheduler status:');
    const initialStatus = scheduler.getStatus();
    console.log(JSON.stringify(initialStatus, null, 2));
    console.log();

    // 6. Perform health check
    console.log('Performing health check...');
    try {
      const healthResult = await scheduler.performHealthCheck();
      console.log('Health check result:');
      console.log(JSON.stringify(healthResult, null, 2));
      console.log();
    } catch (error) {
      console.error('Health check failed:', error);
    }

    // 7. Test notifications
    console.log('Testing notifications...');
    try {
      const notificationTest = await scheduler.testNotifications();
      console.log('Notification test result:');
      console.log(JSON.stringify(notificationTest, null, 2));
      console.log();
    } catch (error) {
      console.error('Notification test failed:', error);
    }

    // 8. Add a new job dynamically
    console.log('Adding a new job...');
    const newJobConfig: ScheduleConfig = {
      enabled: true,
      cronExpression: '*/30 * * * *', // Every 30 minutes
      timezone: 'Asia/Tokyo',
      sites: ['suumo'],
      healthCheckEnabled: false,
      notificationsEnabled: false,
    };

    try {
      await scheduler.addJob('test-job', newJobConfig);
      console.log('New job added successfully!');
    } catch (error) {
      console.error('Failed to add new job:', error);
    }

    // 9. Get updated status
    console.log('\nUpdated scheduler status:');
    const updatedStatus = scheduler.getStatus();
    console.log(JSON.stringify(updatedStatus, null, 2));
    console.log();

    // 10. Get job statistics
    console.log('Job statistics:');
    const jobStats = scheduler.getJobStatistics();
    console.log(JSON.stringify(jobStats, null, 2));
    console.log();

    // 11. Manually trigger a job (for testing)
    console.log('Manually triggering test job...');
    try {
      await scheduler.triggerJob('test-job');
      console.log('Job triggered successfully!');
    } catch (error) {
      console.error('Failed to trigger job:', error);
    }

    // 12. Disable a job
    console.log('\nDisabling test job...');
    try {
      await scheduler.toggleJob('test-job', false);
      console.log('Job disabled successfully!');
    } catch (error) {
      console.error('Failed to disable job:', error);
    }

    // 13. Enable maintenance mode
    console.log('\nEnabling maintenance mode...');
    scheduler.setMaintenanceMode(true);
    console.log('Maintenance mode enabled!');

    // 14. Final status check
    console.log('\nFinal scheduler status:');
    const finalStatus = scheduler.getStatus();
    console.log(JSON.stringify(finalStatus, null, 2));

    // 15. Clean up
    console.log('\nStopping scheduler...');
    await scheduler.stop();
    console.log('Scheduler stopped successfully!');

  } catch (error) {
    console.error('Scheduler example failed:', error);
  }
}

/**
 * Example of using scheduler with environment-based configuration
 */
async function environmentConfigExample() {
  console.log('\n=== Environment-based Configuration Example ===\n');

  // Load configuration from environment variables
  const pipelineConfig: PipelineConfig = {
    scraperConfig: {
      browserConfig: {
        headless: true,
        timeout: 60000,
        viewport: { width: 1920, height: 1080 },
      },
      scraperOptions: {
        maxRetries: 3,
        retryDelay: 5000,
        requestDelay: 2000,
        maxConcurrentPages: 2,
        timeout: 60000,
      },
    },
    translationConfig: {
      provider: 'google',
      apiKey: process.env['GOOGLE_TRANSLATE_API_KEY'] || '',
      projectId: process.env['GOOGLE_CLOUD_PROJECT_ID'] || '',
      cacheEnabled: true,
      batchSize: 50,
      rateLimitDelay: 100,
      maxRetries: 3,
      timeout: 30000,
    },
    processingOptions: {
      batchSize: 20,
      maxConcurrentSites: 2,
      enableDuplicateDetection: true,
      enableDataUpdate: true,
      skipTranslationOnError: false,
    },
  };

  // Create scheduler with default configuration (loads from environment)
  const scheduler = new SchedulerService(pipelineConfig);

  try {
    await scheduler.start();
    console.log('Scheduler started with environment configuration!');

    const status = scheduler.getStatus();
    console.log('Status:', JSON.stringify(status, null, 2));

    await scheduler.stop();
    console.log('Scheduler stopped!');

  } catch (error) {
    console.error('Environment config example failed:', error);
  }
}

// Run examples if this file is executed directly
if (require.main === module) {
  schedulerExample()
    .then(() => environmentConfigExample())
    .then(() => {
      console.log('\n=== All examples completed ===');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Example execution failed:', error);
      process.exit(1);
    });
}

export { schedulerExample, environmentConfigExample };