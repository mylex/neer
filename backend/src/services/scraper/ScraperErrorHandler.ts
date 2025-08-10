export enum ScraperErrorType {
  NETWORK_ERROR = 'NETWORK_ERROR',
  TIMEOUT_ERROR = 'TIMEOUT_ERROR',
  PARSING_ERROR = 'PARSING_ERROR',
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  RATE_LIMIT_ERROR = 'RATE_LIMIT_ERROR',
  AUTHENTICATION_ERROR = 'AUTHENTICATION_ERROR',
  BLOCKED_ERROR = 'BLOCKED_ERROR',
  UNKNOWN_ERROR = 'UNKNOWN_ERROR'
}

export interface ScraperError {
  type: ScraperErrorType;
  message: string;
  url?: string;
  originalError?: Error;
  timestamp: Date;
  retryable: boolean;
  retryAfter?: number; // milliseconds
}

export class ScraperErrorHandler {
  private errorCounts: Map<string, number> = new Map();
  private lastErrors: Map<string, Date> = new Map();

  /**
   * Classify and handle scraping errors
   */
  handleError(error: Error, url?: string): ScraperError {
    const scraperError: ScraperError = {
      type: this.classifyError(error),
      message: error.message,
      ...(url && { url }),
      originalError: error,
      timestamp: new Date(),
      retryable: false
    };

    // Determine if error is retryable and set retry delay
    this.setRetryability(scraperError);

    // Track error for rate limiting and monitoring
    this.trackError(scraperError);

    return scraperError;
  }

  /**
   * Classify error type based on error message and properties
   */
  private classifyError(error: Error): ScraperErrorType {
    const message = error.message.toLowerCase();
    const name = error.name.toLowerCase();

    // Network-related errors
    if (message.includes('network') || 
        message.includes('connection') || 
        message.includes('econnrefused') ||
        message.includes('enotfound') ||
        name.includes('networkerror')) {
      return ScraperErrorType.NETWORK_ERROR;
    }

    // Timeout errors
    if (message.includes('timeout') || 
        message.includes('timed out') ||
        name.includes('timeouterror')) {
      return ScraperErrorType.TIMEOUT_ERROR;
    }

    // Rate limiting
    if (message.includes('rate limit') || 
        message.includes('too many requests') ||
        message.includes('429')) {
      return ScraperErrorType.RATE_LIMIT_ERROR;
    }

    // Authentication/Authorization
    if (message.includes('unauthorized') || 
        message.includes('forbidden') ||
        message.includes('401') ||
        message.includes('403')) {
      return ScraperErrorType.AUTHENTICATION_ERROR;
    }

    // Blocked/Captcha
    if (message.includes('blocked') || 
        message.includes('captcha') ||
        message.includes('bot detection') ||
        message.includes('access denied')) {
      return ScraperErrorType.BLOCKED_ERROR;
    }

    // Parsing errors
    if (message.includes('parse') || 
        message.includes('invalid') ||
        message.includes('malformed') ||
        name.includes('syntaxerror')) {
      return ScraperErrorType.PARSING_ERROR;
    }

    // Validation errors
    if (message.includes('validation') || 
        message.includes('required') ||
        message.includes('missing')) {
      return ScraperErrorType.VALIDATION_ERROR;
    }

    return ScraperErrorType.UNKNOWN_ERROR;
  }

  /**
   * Set retryability and retry delay based on error type
   */
  private setRetryability(scraperError: ScraperError): void {
    switch (scraperError.type) {
      case ScraperErrorType.NETWORK_ERROR:
      case ScraperErrorType.TIMEOUT_ERROR:
        scraperError.retryable = true;
        scraperError.retryAfter = 5000; // 5 seconds
        break;

      case ScraperErrorType.RATE_LIMIT_ERROR:
        scraperError.retryable = true;
        scraperError.retryAfter = 60000; // 1 minute
        break;

      case ScraperErrorType.BLOCKED_ERROR:
        scraperError.retryable = true;
        scraperError.retryAfter = 300000; // 5 minutes
        break;

      case ScraperErrorType.PARSING_ERROR:
      case ScraperErrorType.VALIDATION_ERROR:
        scraperError.retryable = false;
        break;

      case ScraperErrorType.AUTHENTICATION_ERROR:
        scraperError.retryable = false;
        break;

      case ScraperErrorType.UNKNOWN_ERROR:
        scraperError.retryable = true;
        scraperError.retryAfter = 10000; // 10 seconds
        break;
    }
  }

  /**
   * Track error occurrence for monitoring and rate limiting
   */
  private trackError(scraperError: ScraperError): void {
    const key = `${scraperError.type}:${scraperError.url || 'unknown'}`;
    
    // Increment error count
    const currentCount = this.errorCounts.get(key) || 0;
    this.errorCounts.set(key, currentCount + 1);
    
    // Update last error timestamp
    this.lastErrors.set(key, scraperError.timestamp);
  }

  /**
   * Get error statistics for monitoring
   */
  getErrorStats(): {
    totalErrors: number;
    errorsByType: Record<ScraperErrorType, number>;
    recentErrors: ScraperError[];
  } {
    const errorsByType = {} as Record<ScraperErrorType, number>;
    let totalErrors = 0;

    // Initialize all error types
    Object.values(ScraperErrorType).forEach(type => {
      errorsByType[type] = 0;
    });

    // Count errors by type
    for (const [key, count] of this.errorCounts.entries()) {
      const errorType = key.split(':')[0] as ScraperErrorType;
      errorsByType[errorType] += count;
      totalErrors += count;
    }

    return {
      totalErrors,
      errorsByType,
      recentErrors: [] // Could be implemented with a circular buffer
    };
  }

  /**
   * Check if URL should be retried based on error history
   */
  shouldRetry(url: string, errorType: ScraperErrorType, maxRetries: number = 3): boolean {
    const key = `${errorType}:${url}`;
    const errorCount = this.errorCounts.get(key) || 0;
    const lastError = this.lastErrors.get(key);

    // Don't retry if max retries exceeded
    if (errorCount >= maxRetries) {
      return false;
    }

    // Don't retry if last error was very recent (within 1 minute)
    if (lastError && Date.now() - lastError.getTime() < 60000) {
      return false;
    }

    return true;
  }

  /**
   * Reset error tracking for a specific URL or error type
   */
  resetErrors(url?: string, errorType?: ScraperErrorType): void {
    if (url && errorType) {
      const key = `${errorType}:${url}`;
      this.errorCounts.delete(key);
      this.lastErrors.delete(key);
    } else if (url) {
      // Reset all errors for URL
      for (const key of this.errorCounts.keys()) {
        if (key.endsWith(`:${url}`)) {
          this.errorCounts.delete(key);
          this.lastErrors.delete(key);
        }
      }
    } else if (errorType) {
      // Reset all errors of specific type
      for (const key of this.errorCounts.keys()) {
        if (key.startsWith(`${errorType}:`)) {
          this.errorCounts.delete(key);
          this.lastErrors.delete(key);
        }
      }
    } else {
      // Reset all errors
      this.errorCounts.clear();
      this.lastErrors.clear();
    }
  }

  /**
   * Get recommended delay before next attempt
   */
  getRetryDelay(scraperError: ScraperError): number {
    const baseDelay = scraperError.retryAfter || 5000;
    const key = `${scraperError.type}:${scraperError.url || 'unknown'}`;
    const errorCount = this.errorCounts.get(key) || 0;

    // Exponential backoff with jitter
    const exponentialDelay = baseDelay * Math.pow(2, Math.min(errorCount - 1, 5));
    const jitter = Math.random() * 1000; // Add up to 1 second of jitter
    
    return Math.min(exponentialDelay + jitter, 300000); // Cap at 5 minutes
  }

  /**
   * Create a user-friendly error message
   */
  formatErrorMessage(scraperError: ScraperError): string {
    const baseMessage = `${scraperError.type}: ${scraperError.message}`;
    
    if (scraperError.url) {
      return `${baseMessage} (URL: ${scraperError.url})`;
    }
    
    return baseMessage;
  }
}