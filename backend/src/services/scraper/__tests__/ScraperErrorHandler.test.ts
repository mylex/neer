import { ScraperErrorHandler, ScraperErrorType } from '../ScraperErrorHandler';

describe('ScraperErrorHandler', () => {
  let errorHandler: ScraperErrorHandler;

  beforeEach(() => {
    errorHandler = new ScraperErrorHandler();
  });

  describe('handleError', () => {
    it('should classify network errors correctly', () => {
      const networkError = new Error('ECONNREFUSED connection refused');
      const result = errorHandler.handleError(networkError, 'http://test.com');

      expect(result.type).toBe(ScraperErrorType.NETWORK_ERROR);
      expect(result.message).toBe('ECONNREFUSED connection refused');
      expect(result.url).toBe('http://test.com');
      expect(result.retryable).toBe(true);
      expect(result.retryAfter).toBe(5000);
      expect(result.timestamp).toBeInstanceOf(Date);
    });

    it('should classify timeout errors correctly', () => {
      const timeoutError = new Error('Navigation timeout exceeded');
      const result = errorHandler.handleError(timeoutError);

      expect(result.type).toBe(ScraperErrorType.TIMEOUT_ERROR);
      expect(result.retryable).toBe(true);
      expect(result.retryAfter).toBe(5000);
    });

    it('should classify rate limit errors correctly', () => {
      const rateLimitError = new Error('Too many requests - rate limit exceeded');
      const result = errorHandler.handleError(rateLimitError);

      expect(result.type).toBe(ScraperErrorType.RATE_LIMIT_ERROR);
      expect(result.retryable).toBe(true);
      expect(result.retryAfter).toBe(60000);
    });

    it('should classify authentication errors correctly', () => {
      const authError = new Error('401 Unauthorized access');
      const result = errorHandler.handleError(authError);

      expect(result.type).toBe(ScraperErrorType.AUTHENTICATION_ERROR);
      expect(result.retryable).toBe(false);
    });

    it('should classify blocked errors correctly', () => {
      const blockedError = new Error('Access denied - bot detection triggered');
      const result = errorHandler.handleError(blockedError);

      expect(result.type).toBe(ScraperErrorType.BLOCKED_ERROR);
      expect(result.retryable).toBe(true);
      expect(result.retryAfter).toBe(300000);
    });

    it('should classify parsing errors correctly', () => {
      const parseError = new Error('Failed to parse HTML content');
      const result = errorHandler.handleError(parseError);

      expect(result.type).toBe(ScraperErrorType.PARSING_ERROR);
      expect(result.retryable).toBe(false);
    });

    it('should classify validation errors correctly', () => {
      const validationError = new Error('Required field missing from data');
      const result = errorHandler.handleError(validationError);

      expect(result.type).toBe(ScraperErrorType.VALIDATION_ERROR);
      expect(result.retryable).toBe(false);
    });

    it('should classify unknown errors correctly', () => {
      const unknownError = new Error('Something unexpected happened');
      const result = errorHandler.handleError(unknownError);

      expect(result.type).toBe(ScraperErrorType.UNKNOWN_ERROR);
      expect(result.retryable).toBe(true);
      expect(result.retryAfter).toBe(10000);
    });

    it('should handle errors without URL', () => {
      const error = new Error('Test error');
      const result = errorHandler.handleError(error);

      expect(result.url).toBeUndefined();
      expect(result.type).toBe(ScraperErrorType.UNKNOWN_ERROR);
    });

    it('should preserve original error', () => {
      const originalError = new Error('Original error');
      const result = errorHandler.handleError(originalError);

      expect(result.originalError).toBe(originalError);
    });
  });

  describe('getErrorStats', () => {
    it('should return initial empty stats', () => {
      const stats = errorHandler.getErrorStats();

      expect(stats.totalErrors).toBe(0);
      expect(stats.errorsByType[ScraperErrorType.NETWORK_ERROR]).toBe(0);
      expect(stats.errorsByType[ScraperErrorType.TIMEOUT_ERROR]).toBe(0);
      expect(stats.recentErrors).toEqual([]);
    });

    it('should track error counts by type', () => {
      const networkError = new Error('ECONNREFUSED');
      const timeoutError = new Error('timeout');
      
      errorHandler.handleError(networkError, 'http://test1.com');
      errorHandler.handleError(networkError, 'http://test2.com');
      errorHandler.handleError(timeoutError, 'http://test3.com');

      const stats = errorHandler.getErrorStats();

      expect(stats.totalErrors).toBe(3);
      expect(stats.errorsByType[ScraperErrorType.NETWORK_ERROR]).toBe(2);
      expect(stats.errorsByType[ScraperErrorType.TIMEOUT_ERROR]).toBe(1);
      expect(stats.errorsByType[ScraperErrorType.PARSING_ERROR]).toBe(0);
    });
  });

  describe('shouldRetry', () => {
    it('should allow retry for new errors', () => {
      const shouldRetry = errorHandler.shouldRetry(
        'http://test.com',
        ScraperErrorType.NETWORK_ERROR,
        3
      );

      expect(shouldRetry).toBe(true);
    });

    it('should prevent retry after max retries exceeded', () => {
      const error = new Error('ECONNREFUSED');
      
      // Generate max retries worth of errors
      for (let i = 0; i < 3; i++) {
        errorHandler.handleError(error, 'http://test.com');
      }

      const shouldRetry = errorHandler.shouldRetry(
        'http://test.com',
        ScraperErrorType.NETWORK_ERROR,
        3
      );

      expect(shouldRetry).toBe(false);
    });

    it('should prevent retry for recent errors', () => {
      const error = new Error('ECONNREFUSED');
      errorHandler.handleError(error, 'http://test.com');

      const shouldRetry = errorHandler.shouldRetry(
        'http://test.com',
        ScraperErrorType.NETWORK_ERROR,
        3
      );

      expect(shouldRetry).toBe(false);
    });

    it('should allow retry for old errors', async () => {
      const error = new Error('ECONNREFUSED');
      errorHandler.handleError(error, 'http://test.com');

      // Mock time passage
      jest.spyOn(Date, 'now').mockReturnValue(Date.now() + 120000); // 2 minutes later

      const shouldRetry = errorHandler.shouldRetry(
        'http://test.com',
        ScraperErrorType.NETWORK_ERROR,
        3
      );

      expect(shouldRetry).toBe(true);

      jest.restoreAllMocks();
    });
  });

  describe('getRetryDelay', () => {
    it('should return base delay for first error', () => {
      const error = new Error('ECONNREFUSED');
      const scraperError = errorHandler.handleError(error, 'http://test.com');

      const delay = errorHandler.getRetryDelay(scraperError);

      expect(delay).toBeGreaterThanOrEqual(5000); // base delay + jitter
      expect(delay).toBeLessThan(7000); // base delay + max jitter
    });

    it('should increase delay with exponential backoff', () => {
      const error = new Error('ECONNREFUSED');
      
      // Generate multiple errors to increase count
      for (let i = 0; i < 3; i++) {
        errorHandler.handleError(error, 'http://test.com');
      }

      const scraperError = errorHandler.handleError(error, 'http://test.com');
      const delay = errorHandler.getRetryDelay(scraperError);

      expect(delay).toBeGreaterThan(10000); // Should be higher due to exponential backoff
    });

    it('should cap delay at maximum', () => {
      const error = new Error('ECONNREFUSED');
      
      // Generate many errors to test cap
      for (let i = 0; i < 10; i++) {
        errorHandler.handleError(error, 'http://test.com');
      }

      const scraperError = errorHandler.handleError(error, 'http://test.com');
      const delay = errorHandler.getRetryDelay(scraperError);

      expect(delay).toBeLessThanOrEqual(300000); // 5 minute cap
    });

    it('should use retryAfter from error if available', () => {
      const error = new Error('rate limit');
      const scraperError = errorHandler.handleError(error, 'http://test.com');

      const delay = errorHandler.getRetryDelay(scraperError);

      expect(delay).toBeGreaterThanOrEqual(60000); // Rate limit base delay
    });
  });

  describe('resetErrors', () => {
    beforeEach(() => {
      // Add some errors to reset
      const networkError = new Error('ECONNREFUSED');
      const timeoutError = new Error('timeout');
      
      errorHandler.handleError(networkError, 'http://test1.com');
      errorHandler.handleError(timeoutError, 'http://test1.com');
      errorHandler.handleError(networkError, 'http://test2.com');
    });

    it('should reset errors for specific URL and error type', () => {
      errorHandler.resetErrors('http://test1.com', ScraperErrorType.NETWORK_ERROR);

      const shouldRetry = errorHandler.shouldRetry(
        'http://test1.com',
        ScraperErrorType.NETWORK_ERROR,
        3
      );

      expect(shouldRetry).toBe(true);

      // Other errors should still exist
      const shouldRetryTimeout = errorHandler.shouldRetry(
        'http://test1.com',
        ScraperErrorType.TIMEOUT_ERROR,
        3
      );
      expect(shouldRetryTimeout).toBe(false);
    });

    it('should reset all errors for specific URL', () => {
      errorHandler.resetErrors('http://test1.com');

      const shouldRetryNetwork = errorHandler.shouldRetry(
        'http://test1.com',
        ScraperErrorType.NETWORK_ERROR,
        3
      );
      const shouldRetryTimeout = errorHandler.shouldRetry(
        'http://test1.com',
        ScraperErrorType.TIMEOUT_ERROR,
        3
      );

      expect(shouldRetryNetwork).toBe(true);
      expect(shouldRetryTimeout).toBe(true);

      // Errors for other URLs should still exist
      const shouldRetryOtherUrl = errorHandler.shouldRetry(
        'http://test2.com',
        ScraperErrorType.NETWORK_ERROR,
        3
      );
      expect(shouldRetryOtherUrl).toBe(false);
    });

    it('should reset all errors of specific type', () => {
      errorHandler.resetErrors(undefined, ScraperErrorType.NETWORK_ERROR);

      const shouldRetryTest1 = errorHandler.shouldRetry(
        'http://test1.com',
        ScraperErrorType.NETWORK_ERROR,
        3
      );
      const shouldRetryTest2 = errorHandler.shouldRetry(
        'http://test2.com',
        ScraperErrorType.NETWORK_ERROR,
        3
      );

      expect(shouldRetryTest1).toBe(true);
      expect(shouldRetryTest2).toBe(true);

      // Timeout errors should still exist
      const shouldRetryTimeout = errorHandler.shouldRetry(
        'http://test1.com',
        ScraperErrorType.TIMEOUT_ERROR,
        3
      );
      expect(shouldRetryTimeout).toBe(false);
    });

    it('should reset all errors', () => {
      errorHandler.resetErrors();

      const stats = errorHandler.getErrorStats();
      expect(stats.totalErrors).toBe(0);
    });
  });

  describe('formatErrorMessage', () => {
    it('should format error message with URL', () => {
      const error = new Error('Test error');
      const scraperError = errorHandler.handleError(error, 'http://test.com');

      const formatted = errorHandler.formatErrorMessage(scraperError);

      expect(formatted).toBe('UNKNOWN_ERROR: Test error (URL: http://test.com)');
    });

    it('should format error message without URL', () => {
      const error = new Error('Test error');
      const scraperError = errorHandler.handleError(error);

      const formatted = errorHandler.formatErrorMessage(scraperError);

      expect(formatted).toBe('UNKNOWN_ERROR: Test error');
    });
  });

  describe('error classification edge cases', () => {
    it('should handle errors with mixed case messages', () => {
      const error = new Error('NETWORK Connection Failed');
      const result = errorHandler.handleError(error);

      expect(result.type).toBe(ScraperErrorType.NETWORK_ERROR);
    });

    it('should handle errors with error name classification', () => {
      const error = new Error('Something went wrong');
      error.name = 'TimeoutError';
      const result = errorHandler.handleError(error);

      expect(result.type).toBe(ScraperErrorType.TIMEOUT_ERROR);
    });

    it('should prioritize message over name for classification', () => {
      const error = new Error('Network connection failed');
      error.name = 'TimeoutError';
      const result = errorHandler.handleError(error);

      expect(result.type).toBe(ScraperErrorType.NETWORK_ERROR);
    });

    it('should handle empty error messages', () => {
      const error = new Error('');
      const result = errorHandler.handleError(error);

      expect(result.type).toBe(ScraperErrorType.UNKNOWN_ERROR);
      expect(result.message).toBe('');
    });
  });
});