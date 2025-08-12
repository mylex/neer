import { AxiosError } from 'axios';

export interface ApiError {
  message: string;
  code?: string;
  status?: number;
  type: 'network' | 'server' | 'client' | 'unknown';
  retryable: boolean;
}

export const parseApiError = (error: any): ApiError => {
  // Network errors
  if (error.code === 'NETWORK_ERROR' || error.message === 'Network Error') {
    return {
      message: 'Unable to connect to the server. Please check your internet connection and try again.',
      code: 'NETWORK_ERROR',
      type: 'network',
      retryable: true,
    };
  }

  // Timeout errors
  if (error.code === 'ECONNABORTED' || error.message?.includes('timeout')) {
    return {
      message: 'The request took too long to complete. Please try again.',
      code: 'TIMEOUT',
      type: 'network',
      retryable: true,
    };
  }

  // Axios errors with response
  if (error.response) {
    const status = error.response.status;
    const data = error.response.data;

    switch (status) {
      case 400:
        return {
          message: data?.message || 'Invalid request. Please check your input and try again.',
          code: 'BAD_REQUEST',
          status,
          type: 'client',
          retryable: false,
        };

      case 401:
        return {
          message: 'You are not authorized to access this resource.',
          code: 'UNAUTHORIZED',
          status,
          type: 'client',
          retryable: false,
        };

      case 403:
        return {
          message: 'You do not have permission to access this resource.',
          code: 'FORBIDDEN',
          status,
          type: 'client',
          retryable: false,
        };

      case 404:
        return {
          message: 'The requested resource was not found.',
          code: 'NOT_FOUND',
          status,
          type: 'client',
          retryable: false,
        };

      case 429:
        return {
          message: 'Too many requests. Please wait a moment before trying again.',
          code: 'RATE_LIMITED',
          status,
          type: 'server',
          retryable: true,
        };

      case 500:
        return {
          message: 'Internal server error. Please try again later.',
          code: 'INTERNAL_ERROR',
          status,
          type: 'server',
          retryable: true,
        };

      case 502:
        return {
          message: 'Bad gateway. The server is temporarily unavailable.',
          code: 'BAD_GATEWAY',
          status,
          type: 'server',
          retryable: true,
        };

      case 503:
        return {
          message: 'Service temporarily unavailable. Please try again later.',
          code: 'SERVICE_UNAVAILABLE',
          status,
          type: 'server',
          retryable: true,
        };

      case 504:
        return {
          message: 'Gateway timeout. The server took too long to respond.',
          code: 'GATEWAY_TIMEOUT',
          status,
          type: 'server',
          retryable: true,
        };

      default:
        if (status >= 500) {
          return {
            message: 'Server error. Please try again later.',
            code: 'SERVER_ERROR',
            status,
            type: 'server',
            retryable: true,
          };
        } else if (status >= 400) {
          return {
            message: data?.message || 'Client error. Please check your request.',
            code: 'CLIENT_ERROR',
            status,
            type: 'client',
            retryable: false,
          };
        }
    }
  }

  // Generic error fallback
  return {
    message: error.message || 'An unexpected error occurred. Please try again.',
    code: 'UNKNOWN_ERROR',
    type: 'unknown',
    retryable: true,
  };
};

export const getRetryDelay = (attempt: number): number => {
  // Exponential backoff: 1s, 2s, 4s, 8s, 16s (max)
  return Math.min(1000 * Math.pow(2, attempt - 1), 16000);
};

export const shouldRetry = (error: ApiError, attempt: number, maxAttempts: number = 3): boolean => {
  return error.retryable && attempt < maxAttempts;
};

export const createErrorMessage = (error: ApiError, context?: string): string => {
  const contextPrefix = context ? `${context}: ` : '';
  return `${contextPrefix}${error.message}`;
};