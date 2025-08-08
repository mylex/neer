/**
 * Custom error class for translation-related errors
 */
export class TranslationError extends Error {
  public readonly code: string;
  public readonly originalError?: Error | undefined;

  constructor(message: string, originalError?: Error | undefined, code: string = 'TRANSLATION_ERROR') {
    super(message);
    this.name = 'TranslationError';
    this.code = code;
    this.originalError = originalError;

    // Maintain proper stack trace for where our error was thrown (only available on V8)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, TranslationError);
    }
  }

  /**
   * Get detailed error information
   */
  getDetails(): {
    message: string;
    code: string;
    originalError?: string | undefined;
    stack?: string | undefined;
  } {
    return {
      message: this.message,
      code: this.code,
      originalError: this.originalError?.message,
      stack: this.stack,
    };
  }

  /**
   * Check if error is due to rate limiting
   */
  isRateLimitError(): boolean {
    return this.code === 'RATE_LIMIT_ERROR' || 
           this.message.toLowerCase().includes('rate limit') ||
           this.message.toLowerCase().includes('quota exceeded');
  }

  /**
   * Check if error is due to authentication issues
   */
  isAuthError(): boolean {
    return this.code === 'AUTH_ERROR' ||
           this.message.toLowerCase().includes('authentication') ||
           this.message.toLowerCase().includes('unauthorized') ||
           this.message.toLowerCase().includes('invalid credentials');
  }

  /**
   * Check if error is due to network issues
   */
  isNetworkError(): boolean {
    return this.code === 'NETWORK_ERROR' ||
           this.message.toLowerCase().includes('network') ||
           this.message.toLowerCase().includes('connection') ||
           this.message.toLowerCase().includes('timeout');
  }

  /**
   * Create a rate limit error
   */
  static rateLimitError(message: string = 'Translation rate limit exceeded', originalError?: Error | undefined): TranslationError {
    return new TranslationError(message, originalError, 'RATE_LIMIT_ERROR');
  }

  /**
   * Create an authentication error
   */
  static authError(message: string = 'Translation service authentication failed', originalError?: Error | undefined): TranslationError {
    return new TranslationError(message, originalError, 'AUTH_ERROR');
  }

  /**
   * Create a network error
   */
  static networkError(message: string = 'Translation service network error', originalError?: Error | undefined): TranslationError {
    return new TranslationError(message, originalError, 'NETWORK_ERROR');
  }

  /**
   * Create a cache error
   */
  static cacheError(message: string = 'Translation cache error', originalError?: Error | undefined): TranslationError {
    return new TranslationError(message, originalError, 'CACHE_ERROR');
  }

  /**
   * Create a validation error
   */
  static validationError(message: string = 'Translation validation error', originalError?: Error | undefined): TranslationError {
    return new TranslationError(message, originalError, 'VALIDATION_ERROR');
  }
}