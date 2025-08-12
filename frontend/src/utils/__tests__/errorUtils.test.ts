import {
  parseApiError,
  getRetryDelay,
  shouldRetry,
  createErrorMessage,
} from '../errorUtils';

describe('errorUtils', () => {
  describe('parseApiError', () => {
    it('handles network errors', () => {
      const networkError = { code: 'NETWORK_ERROR' };
      const result = parseApiError(networkError);

      expect(result).toEqual({
        message: 'Unable to connect to the server. Please check your internet connection and try again.',
        code: 'NETWORK_ERROR',
        type: 'network',
        retryable: true,
      });
    });

    it('handles timeout errors', () => {
      const timeoutError = { code: 'ECONNABORTED' };
      const result = parseApiError(timeoutError);

      expect(result).toEqual({
        message: 'The request took too long to complete. Please try again.',
        code: 'TIMEOUT',
        type: 'network',
        retryable: true,
      });
    });

    it('handles 400 Bad Request', () => {
      const badRequestError = {
        response: {
          status: 400,
          data: { message: 'Invalid input' },
        },
      };
      const result = parseApiError(badRequestError);

      expect(result).toEqual({
        message: 'Invalid input',
        code: 'BAD_REQUEST',
        status: 400,
        type: 'client',
        retryable: false,
      });
    });

    it('handles 401 Unauthorized', () => {
      const unauthorizedError = {
        response: { status: 401, data: {} },
      };
      const result = parseApiError(unauthorizedError);

      expect(result).toEqual({
        message: 'You are not authorized to access this resource.',
        code: 'UNAUTHORIZED',
        status: 401,
        type: 'client',
        retryable: false,
      });
    });

    it('handles 404 Not Found', () => {
      const notFoundError = {
        response: { status: 404, data: {} },
      };
      const result = parseApiError(notFoundError);

      expect(result).toEqual({
        message: 'The requested resource was not found.',
        code: 'NOT_FOUND',
        status: 404,
        type: 'client',
        retryable: false,
      });
    });

    it('handles 429 Rate Limited', () => {
      const rateLimitError = {
        response: { status: 429, data: {} },
      };
      const result = parseApiError(rateLimitError);

      expect(result).toEqual({
        message: 'Too many requests. Please wait a moment before trying again.',
        code: 'RATE_LIMITED',
        status: 429,
        type: 'server',
        retryable: true,
      });
    });

    it('handles 500 Internal Server Error', () => {
      const serverError = {
        response: { status: 500, data: {} },
      };
      const result = parseApiError(serverError);

      expect(result).toEqual({
        message: 'Internal server error. Please try again later.',
        code: 'INTERNAL_ERROR',
        status: 500,
        type: 'server',
        retryable: true,
      });
    });

    it('handles 502 Bad Gateway', () => {
      const badGatewayError = {
        response: { status: 502, data: {} },
      };
      const result = parseApiError(badGatewayError);

      expect(result).toEqual({
        message: 'Bad gateway. The server is temporarily unavailable.',
        code: 'BAD_GATEWAY',
        status: 502,
        type: 'server',
        retryable: true,
      });
    });

    it('handles generic server errors (5xx)', () => {
      const serverError = {
        response: { status: 503, data: {} },
      };
      const result = parseApiError(serverError);

      expect(result).toEqual({
        message: 'Service temporarily unavailable. Please try again later.',
        code: 'SERVICE_UNAVAILABLE',
        status: 503,
        type: 'server',
        retryable: true,
      });
    });

    it('handles generic client errors (4xx)', () => {
      const clientError = {
        response: { status: 422, data: { message: 'Validation failed' } },
      };
      const result = parseApiError(clientError);

      expect(result).toEqual({
        message: 'Validation failed',
        code: 'CLIENT_ERROR',
        status: 422,
        type: 'client',
        retryable: false,
      });
    });

    it('handles unknown errors', () => {
      const unknownError = { message: 'Something went wrong' };
      const result = parseApiError(unknownError);

      expect(result).toEqual({
        message: 'Something went wrong',
        code: 'UNKNOWN_ERROR',
        type: 'unknown',
        retryable: true,
      });
    });

    it('handles errors without message', () => {
      const errorWithoutMessage = {};
      const result = parseApiError(errorWithoutMessage);

      expect(result).toEqual({
        message: 'An unexpected error occurred. Please try again.',
        code: 'UNKNOWN_ERROR',
        type: 'unknown',
        retryable: true,
      });
    });
  });

  describe('getRetryDelay', () => {
    it('calculates exponential backoff correctly', () => {
      expect(getRetryDelay(1)).toBe(1000); // 1s
      expect(getRetryDelay(2)).toBe(2000); // 2s
      expect(getRetryDelay(3)).toBe(4000); // 4s
      expect(getRetryDelay(4)).toBe(8000); // 8s
      expect(getRetryDelay(5)).toBe(16000); // 16s (max)
      expect(getRetryDelay(6)).toBe(16000); // Still 16s (capped)
    });
  });

  describe('shouldRetry', () => {
    it('returns true for retryable errors within max attempts', () => {
      const retryableError = {
        message: 'Server error',
        type: 'server' as const,
        retryable: true,
      };

      expect(shouldRetry(retryableError, 1, 3)).toBe(true);
      expect(shouldRetry(retryableError, 2, 3)).toBe(true);
    });

    it('returns false for retryable errors at max attempts', () => {
      const retryableError = {
        message: 'Server error',
        type: 'server' as const,
        retryable: true,
      };

      expect(shouldRetry(retryableError, 3, 3)).toBe(false);
      expect(shouldRetry(retryableError, 4, 3)).toBe(false);
    });

    it('returns false for non-retryable errors', () => {
      const nonRetryableError = {
        message: 'Bad request',
        type: 'client' as const,
        retryable: false,
      };

      expect(shouldRetry(nonRetryableError, 1, 3)).toBe(false);
      expect(shouldRetry(nonRetryableError, 2, 3)).toBe(false);
    });
  });

  describe('createErrorMessage', () => {
    it('creates error message without context', () => {
      const error = {
        message: 'Network error',
        type: 'network' as const,
        retryable: true,
      };

      expect(createErrorMessage(error)).toBe('Network error');
    });

    it('creates error message with context', () => {
      const error = {
        message: 'Network error',
        type: 'network' as const,
        retryable: true,
      };

      expect(createErrorMessage(error, 'Property Loading')).toBe('Property Loading: Network error');
    });
  });
});