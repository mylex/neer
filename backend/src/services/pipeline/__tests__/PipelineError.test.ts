import { PipelineError, PipelineErrorType, PipelineErrorAggregator } from '../PipelineError';

describe('PipelineError', () => {
  describe('constructor', () => {
    it('should create error with basic properties', () => {
      const message = 'Test error message';
      const type = PipelineErrorType.SCRAPING_ERROR;
      const error = new PipelineError(message, type);

      expect(error.message).toBe(message);
      expect(error.type).toBe(type);
      expect(error.name).toBe('PipelineError');
      expect(error.timestamp).toBeInstanceOf(Date);
      expect(error.retryable).toBe(false);
    });

    it('should include original error and context', () => {
      const message = 'Test error message';
      const type = PipelineErrorType.DATABASE_ERROR;
      const originalError = new Error('Original error');
      const context = { key: 'value', id: 123 };

      const error = new PipelineError(message, type, originalError, context);

      expect(error.originalError).toBe(originalError);
      expect(error.context).toBe(context);
      expect(error.retryable).toBe(true); // Database errors are retryable
    });

    it('should include original error stack in stack trace', () => {
      const originalError = new Error('Original error');
      const error = new PipelineError('Test error', PipelineErrorType.NETWORK_ERROR, originalError);

      expect(error.stack).toContain('Caused by:');
      expect(error.stack).toContain(originalError.stack);
    });
  });

  describe('retryability determination', () => {
    it('should mark network errors as retryable', () => {
      const error = new PipelineError('Network error', PipelineErrorType.NETWORK_ERROR);
      expect(error.retryable).toBe(true);
    });

    it('should mark rate limit errors as retryable', () => {
      const error = new PipelineError('Rate limited', PipelineErrorType.RATE_LIMIT_ERROR);
      expect(error.retryable).toBe(true);
    });

    it('should mark timeout errors as retryable', () => {
      const error = new PipelineError('Timeout', PipelineErrorType.TIMEOUT_ERROR);
      expect(error.retryable).toBe(true);
    });

    it('should mark database errors as retryable', () => {
      const error = new PipelineError('Database error', PipelineErrorType.DATABASE_ERROR);
      expect(error.retryable).toBe(true);
    });

    it('should mark validation errors as non-retryable', () => {
      const error = new PipelineError('Validation error', PipelineErrorType.VALIDATION_ERROR);
      expect(error.retryable).toBe(false);
    });

    it('should mark scraping errors as non-retryable', () => {
      const error = new PipelineError('Scraping error', PipelineErrorType.SCRAPING_ERROR);
      expect(error.retryable).toBe(false);
    });
  });

  describe('getDetailedReport', () => {
    it('should return comprehensive error report', () => {
      const message = 'Test error';
      const type = PipelineErrorType.TRANSLATION_ERROR;
      const originalError = new Error('Original error');
      const context = { batchSize: 10 };
      const error = new PipelineError(message, type, originalError, context);

      const report = error.getDetailedReport();

      expect(report).toEqual({
        message,
        type,
        timestamp: error.timestamp.toISOString(),
        retryable: false,
        context,
        originalError: {
          name: originalError.name,
          message: originalError.message,
          stack: originalError.stack
        },
        stack: error.stack
      });
    });

    it('should handle missing original error', () => {
      const error = new PipelineError('Test error', PipelineErrorType.UNKNOWN_ERROR);
      const report = error.getDetailedReport();

      expect(report.originalError).toBeUndefined();
    });
  });

  describe('getUserFriendlyMessage', () => {
    it('should return appropriate message for scraping errors', () => {
      const error = new PipelineError('Test', PipelineErrorType.SCRAPING_ERROR);
      const message = error.getUserFriendlyMessage();
      
      expect(message).toContain('scrape property data');
      expect(message).toContain('temporarily unavailable');
    });

    it('should return appropriate message for translation errors', () => {
      const error = new PipelineError('Test', PipelineErrorType.TRANSLATION_ERROR);
      const message = error.getUserFriendlyMessage();
      
      expect(message).toContain('translate property information');
      expect(message).toContain('Translation service');
    });

    it('should return appropriate message for database errors', () => {
      const error = new PipelineError('Test', PipelineErrorType.DATABASE_ERROR);
      const message = error.getUserFriendlyMessage();
      
      expect(message).toContain('save property data');
      expect(message).toContain('Database connection');
    });

    it('should return appropriate message for network errors', () => {
      const error = new PipelineError('Test', PipelineErrorType.NETWORK_ERROR);
      const message = error.getUserFriendlyMessage();
      
      expect(message).toContain('Network connection error');
      expect(message).toContain('internet connection');
    });

    it('should return appropriate message for rate limit errors', () => {
      const error = new PipelineError('Test', PipelineErrorType.RATE_LIMIT_ERROR);
      const message = error.getUserFriendlyMessage();
      
      expect(message).toContain('rate limit exceeded');
      expect(message).toContain('automatically');
    });

    it('should return generic message for unknown errors', () => {
      const error = new PipelineError('Test', PipelineErrorType.UNKNOWN_ERROR);
      const message = error.getUserFriendlyMessage();
      
      expect(message).toContain('unexpected error');
    });
  });

  describe('shouldAlert', () => {
    it('should return true for initialization errors', () => {
      const error = new PipelineError('Test', PipelineErrorType.INITIALIZATION_ERROR);
      expect(error.shouldAlert()).toBe(true);
    });

    it('should return true for configuration errors', () => {
      const error = new PipelineError('Test', PipelineErrorType.CONFIGURATION_ERROR);
      expect(error.shouldAlert()).toBe(true);
    });

    it('should return true for database errors', () => {
      const error = new PipelineError('Test', PipelineErrorType.DATABASE_ERROR);
      expect(error.shouldAlert()).toBe(true);
    });

    it('should return false for scraping errors', () => {
      const error = new PipelineError('Test', PipelineErrorType.SCRAPING_ERROR);
      expect(error.shouldAlert()).toBe(false);
    });

    it('should return false for translation errors', () => {
      const error = new PipelineError('Test', PipelineErrorType.TRANSLATION_ERROR);
      expect(error.shouldAlert()).toBe(false);
    });
  });

  describe('getRetryDelay', () => {
    it('should return 0 for non-retryable errors', () => {
      const error = new PipelineError('Test', PipelineErrorType.VALIDATION_ERROR);
      expect(error.getRetryDelay()).toBe(0);
    });

    it('should return 60000ms for rate limit errors', () => {
      const error = new PipelineError('Test', PipelineErrorType.RATE_LIMIT_ERROR);
      expect(error.getRetryDelay()).toBe(60000);
    });

    it('should return 30000ms for network errors', () => {
      const error = new PipelineError('Test', PipelineErrorType.NETWORK_ERROR);
      expect(error.getRetryDelay()).toBe(30000);
    });

    it('should return 45000ms for timeout errors', () => {
      const error = new PipelineError('Test', PipelineErrorType.TIMEOUT_ERROR);
      expect(error.getRetryDelay()).toBe(45000);
    });

    it('should return 15000ms for database errors', () => {
      const error = new PipelineError('Test', PipelineErrorType.DATABASE_ERROR);
      expect(error.getRetryDelay()).toBe(15000);
    });

    it('should return 10000ms for other retryable errors', () => {
      // Create a custom retryable error type for testing
      const error = new PipelineError('Test', PipelineErrorType.UNKNOWN_ERROR);
      // Manually set retryable to true for testing
      (error as any).retryable = true;
      expect(error.getRetryDelay()).toBe(10000);
    });
  });

  describe('static factory methods', () => {
    it('should create network error', () => {
      const originalError = new Error('Network failed');
      const context = { url: 'https://example.com' };
      const error = PipelineError.networkError('Network error', originalError, context);

      expect(error.type).toBe(PipelineErrorType.NETWORK_ERROR);
      expect(error.originalError).toBe(originalError);
      expect(error.context).toBe(context);
    });

    it('should create scraping error', () => {
      const error = PipelineError.scrapingError('Scraping failed');
      expect(error.type).toBe(PipelineErrorType.SCRAPING_ERROR);
    });

    it('should create translation error', () => {
      const error = PipelineError.translationError('Translation failed');
      expect(error.type).toBe(PipelineErrorType.TRANSLATION_ERROR);
    });

    it('should create database error', () => {
      const error = PipelineError.databaseError('Database failed');
      expect(error.type).toBe(PipelineErrorType.DATABASE_ERROR);
    });

    it('should create validation error', () => {
      const error = PipelineError.validationError('Validation failed');
      expect(error.type).toBe(PipelineErrorType.VALIDATION_ERROR);
    });

    it('should create rate limit error', () => {
      const error = PipelineError.rateLimitError('Rate limited');
      expect(error.type).toBe(PipelineErrorType.RATE_LIMIT_ERROR);
    });

    it('should create timeout error', () => {
      const error = PipelineError.timeoutError('Timeout');
      expect(error.type).toBe(PipelineErrorType.TIMEOUT_ERROR);
    });

    it('should create error from generic Error', () => {
      const originalError = new Error('Generic error');
      const error = PipelineError.fromError(originalError, PipelineErrorType.SCRAPING_ERROR);

      expect(error.message).toBe(originalError.message);
      expect(error.type).toBe(PipelineErrorType.SCRAPING_ERROR);
      expect(error.originalError).toBe(originalError);
    });
  });

  describe('toJSON', () => {
    it('should serialize error to JSON', () => {
      const originalError = new Error('Original error');
      const context = { key: 'value' };
      const error = new PipelineError('Test error', PipelineErrorType.NETWORK_ERROR, originalError, context);

      const json = error.toJSON();

      expect(json).toEqual({
        name: 'PipelineError',
        message: 'Test error',
        type: PipelineErrorType.NETWORK_ERROR,
        timestamp: error.timestamp.toISOString(),
        retryable: true,
        context,
        originalError: {
          name: originalError.name,
          message: originalError.message
        }
      });
    });
  });
});

describe('PipelineErrorAggregator', () => {
  let aggregator: PipelineErrorAggregator;

  beforeEach(() => {
    aggregator = new PipelineErrorAggregator();
  });

  describe('error management', () => {
    it('should add and retrieve errors', () => {
      const error1 = new PipelineError('Error 1', PipelineErrorType.SCRAPING_ERROR);
      const error2 = new PipelineError('Error 2', PipelineErrorType.TRANSLATION_ERROR);

      aggregator.addError(error1);
      aggregator.addError(error2);

      const errors = aggregator.getErrors();
      expect(errors).toHaveLength(2);
      expect(errors).toContain(error1);
      expect(errors).toContain(error2);
    });

    it('should filter errors by type', () => {
      const scrapingError = new PipelineError('Scraping error', PipelineErrorType.SCRAPING_ERROR);
      const translationError = new PipelineError('Translation error', PipelineErrorType.TRANSLATION_ERROR);
      const networkError = new PipelineError('Network error', PipelineErrorType.NETWORK_ERROR);

      aggregator.addError(scrapingError);
      aggregator.addError(translationError);
      aggregator.addError(networkError);

      const scrapingErrors = aggregator.getErrorsByType(PipelineErrorType.SCRAPING_ERROR);
      expect(scrapingErrors).toHaveLength(1);
      expect(scrapingErrors[0]).toBe(scrapingError);
    });

    it('should filter retryable errors', () => {
      const networkError = new PipelineError('Network error', PipelineErrorType.NETWORK_ERROR); // retryable
      const validationError = new PipelineError('Validation error', PipelineErrorType.VALIDATION_ERROR); // not retryable
      const dbError = new PipelineError('DB error', PipelineErrorType.DATABASE_ERROR); // retryable

      aggregator.addError(networkError);
      aggregator.addError(validationError);
      aggregator.addError(dbError);

      const retryableErrors = aggregator.getRetryableErrors();
      expect(retryableErrors).toHaveLength(2);
      expect(retryableErrors).toContain(networkError);
      expect(retryableErrors).toContain(dbError);
    });

    it('should filter alertable errors', () => {
      const initError = new PipelineError('Init error', PipelineErrorType.INITIALIZATION_ERROR); // alertable
      const scrapingError = new PipelineError('Scraping error', PipelineErrorType.SCRAPING_ERROR); // not alertable
      const configError = new PipelineError('Config error', PipelineErrorType.CONFIGURATION_ERROR); // alertable

      aggregator.addError(initError);
      aggregator.addError(scrapingError);
      aggregator.addError(configError);

      const alertableErrors = aggregator.getAlertableErrors();
      expect(alertableErrors).toHaveLength(2);
      expect(alertableErrors).toContain(initError);
      expect(alertableErrors).toContain(configError);
    });
  });

  describe('statistics', () => {
    it('should provide error statistics', () => {
      const scrapingError1 = new PipelineError('Scraping error 1', PipelineErrorType.SCRAPING_ERROR);
      const scrapingError2 = new PipelineError('Scraping error 2', PipelineErrorType.SCRAPING_ERROR);
      const networkError = new PipelineError('Network error', PipelineErrorType.NETWORK_ERROR);
      const initError = new PipelineError('Init error', PipelineErrorType.INITIALIZATION_ERROR);

      aggregator.addError(scrapingError1);
      aggregator.addError(scrapingError2);
      aggregator.addError(networkError);
      aggregator.addError(initError);

      const stats = aggregator.getStatistics();

      expect(stats.total).toBe(4);
      expect(stats.byType[PipelineErrorType.SCRAPING_ERROR]).toBe(2);
      expect(stats.byType[PipelineErrorType.NETWORK_ERROR]).toBe(1);
      expect(stats.byType[PipelineErrorType.INITIALIZATION_ERROR]).toBe(1);
      expect(stats.retryable).toBe(2); // network and init errors
      expect(stats.alertable).toBe(1); // init error
    });

    it('should handle empty aggregator', () => {
      const stats = aggregator.getStatistics();

      expect(stats.total).toBe(0);
      expect(stats.byType).toEqual({});
      expect(stats.retryable).toBe(0);
      expect(stats.alertable).toBe(0);
    });
  });

  describe('utility methods', () => {
    it('should clear all errors', () => {
      const error = new PipelineError('Test error', PipelineErrorType.SCRAPING_ERROR);
      aggregator.addError(error);

      expect(aggregator.hasErrors()).toBe(true);
      
      aggregator.clear();
      
      expect(aggregator.hasErrors()).toBe(false);
      expect(aggregator.getErrors()).toHaveLength(0);
    });

    it('should get latest error', () => {
      const error1 = new PipelineError('Error 1', PipelineErrorType.SCRAPING_ERROR);
      const error2 = new PipelineError('Error 2', PipelineErrorType.TRANSLATION_ERROR);

      expect(aggregator.getLatestError()).toBeUndefined();

      aggregator.addError(error1);
      expect(aggregator.getLatestError()).toBe(error1);

      aggregator.addError(error2);
      expect(aggregator.getLatestError()).toBe(error2);
    });

    it('should check if has errors', () => {
      expect(aggregator.hasErrors()).toBe(false);

      const error = new PipelineError('Test error', PipelineErrorType.SCRAPING_ERROR);
      aggregator.addError(error);

      expect(aggregator.hasErrors()).toBe(true);
    });
  });
});