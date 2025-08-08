/**
 * Enumeration of pipeline error types for categorization and handling
 */
export enum PipelineErrorType {
  INITIALIZATION_ERROR = 'initialization_error',
  SCRAPING_ERROR = 'scraping_error',
  TRANSLATION_ERROR = 'translation_error',
  DATABASE_ERROR = 'database_error',
  VALIDATION_ERROR = 'validation_error',
  NETWORK_ERROR = 'network_error',
  RATE_LIMIT_ERROR = 'rate_limit_error',
  SITE_PROCESSING_ERROR = 'site_processing_error',
  BATCH_PROCESSING_ERROR = 'batch_processing_error',
  DUPLICATE_DETECTION_ERROR = 'duplicate_detection_error',
  DATA_UPDATE_ERROR = 'data_update_error',
  CONFIGURATION_ERROR = 'configuration_error',
  TIMEOUT_ERROR = 'timeout_error',
  UNKNOWN_ERROR = 'unknown_error'
}

/**
 * Custom error class for pipeline operations with enhanced context and categorization
 */
export class PipelineError extends Error {
  public readonly type: PipelineErrorType;
  public readonly originalError?: Error;
  public readonly context?: Record<string, any>;
  public readonly timestamp: Date;
  public readonly retryable: boolean;

  constructor(
    message: string,
    type: PipelineErrorType = PipelineErrorType.UNKNOWN_ERROR,
    originalError?: Error,
    context?: Record<string, any>
  ) {
    super(message);
    
    this.name = 'PipelineError';
    this.type = type;
    this.originalError = originalError;
    this.context = context;
    this.timestamp = new Date();
    this.retryable = this.determineRetryability(type);

    // Maintain proper stack trace
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, PipelineError);
    }

    // Include original error stack if available
    if (originalError && originalError.stack) {
      this.stack = `${this.stack}\nCaused by: ${originalError.stack}`;
    }
  }

  /**
   * Determine if an error type is retryable
   */
  private determineRetryability(type: PipelineErrorType): boolean {
    const retryableTypes = [
      PipelineErrorType.NETWORK_ERROR,
      PipelineErrorType.RATE_LIMIT_ERROR,
      PipelineErrorType.TIMEOUT_ERROR,
      PipelineErrorType.DATABASE_ERROR
    ];

    return retryableTypes.includes(type);
  }

  /**
   * Get a detailed error report
   */
  getDetailedReport(): {
    message: string;
    type: string;
    timestamp: string;
    retryable: boolean;
    context?: Record<string, any>;
    originalError?: {
      name: string;
      message: string;
      stack?: string;
    };
    stack?: string;
  } {
    return {
      message: this.message,
      type: this.type,
      timestamp: this.timestamp.toISOString(),
      retryable: this.retryable,
      context: this.context,
      originalError: this.originalError ? {
        name: this.originalError.name,
        message: this.originalError.message,
        stack: this.originalError.stack
      } : undefined,
      stack: this.stack
    };
  }

  /**
   * Get a user-friendly error message
   */
  getUserFriendlyMessage(): string {
    switch (this.type) {
      case PipelineErrorType.SCRAPING_ERROR:
        return 'Failed to scrape property data from website. The site may be temporarily unavailable.';
      
      case PipelineErrorType.TRANSLATION_ERROR:
        return 'Failed to translate property information. Translation service may be temporarily unavailable.';
      
      case PipelineErrorType.DATABASE_ERROR:
        return 'Failed to save property data. Database connection issue detected.';
      
      case PipelineErrorType.NETWORK_ERROR:
        return 'Network connection error occurred. Please check your internet connection.';
      
      case PipelineErrorType.RATE_LIMIT_ERROR:
        return 'Service rate limit exceeded. Processing will resume automatically.';
      
      case PipelineErrorType.VALIDATION_ERROR:
        return 'Property data validation failed. Invalid or incomplete data detected.';
      
      case PipelineErrorType.TIMEOUT_ERROR:
        return 'Operation timed out. The service may be experiencing high load.';
      
      case PipelineErrorType.CONFIGURATION_ERROR:
        return 'System configuration error detected. Please contact administrator.';
      
      default:
        return 'An unexpected error occurred during processing.';
    }
  }

  /**
   * Check if error should trigger an alert
   */
  shouldAlert(): boolean {
    const alertableTypes = [
      PipelineErrorType.INITIALIZATION_ERROR,
      PipelineErrorType.CONFIGURATION_ERROR,
      PipelineErrorType.DATABASE_ERROR
    ];

    return alertableTypes.includes(this.type);
  }

  /**
   * Get recommended retry delay in milliseconds
   */
  getRetryDelay(): number {
    if (!this.retryable) {
      return 0;
    }

    switch (this.type) {
      case PipelineErrorType.RATE_LIMIT_ERROR:
        return 60000; // 1 minute
      
      case PipelineErrorType.NETWORK_ERROR:
        return 30000; // 30 seconds
      
      case PipelineErrorType.TIMEOUT_ERROR:
        return 45000; // 45 seconds
      
      case PipelineErrorType.DATABASE_ERROR:
        return 15000; // 15 seconds
      
      default:
        return 10000; // 10 seconds
    }
  }

  /**
   * Convert to JSON for logging and serialization
   */
  toJSON(): Record<string, any> {
    return {
      name: this.name,
      message: this.message,
      type: this.type,
      timestamp: this.timestamp.toISOString(),
      retryable: this.retryable,
      context: this.context,
      originalError: this.originalError ? {
        name: this.originalError.name,
        message: this.originalError.message
      } : undefined
    };
  }

  /**
   * Create a PipelineError from a generic Error
   */
  static fromError(
    error: Error, 
    type: PipelineErrorType = PipelineErrorType.UNKNOWN_ERROR,
    context?: Record<string, any>
  ): PipelineError {
    return new PipelineError(
      error.message,
      type,
      error,
      context
    );
  }

  /**
   * Create a network error
   */
  static networkError(message: string, originalError?: Error, context?: Record<string, any>): PipelineError {
    return new PipelineError(message, PipelineErrorType.NETWORK_ERROR, originalError, context);
  }

  /**
   * Create a scraping error
   */
  static scrapingError(message: string, originalError?: Error, context?: Record<string, any>): PipelineError {
    return new PipelineError(message, PipelineErrorType.SCRAPING_ERROR, originalError, context);
  }

  /**
   * Create a translation error
   */
  static translationError(message: string, originalError?: Error, context?: Record<string, any>): PipelineError {
    return new PipelineError(message, PipelineErrorType.TRANSLATION_ERROR, originalError, context);
  }

  /**
   * Create a database error
   */
  static databaseError(message: string, originalError?: Error, context?: Record<string, any>): PipelineError {
    return new PipelineError(message, PipelineErrorType.DATABASE_ERROR, originalError, context);
  }

  /**
   * Create a validation error
   */
  static validationError(message: string, context?: Record<string, any>): PipelineError {
    return new PipelineError(message, PipelineErrorType.VALIDATION_ERROR, undefined, context);
  }

  /**
   * Create a rate limit error
   */
  static rateLimitError(message: string, context?: Record<string, any>): PipelineError {
    return new PipelineError(message, PipelineErrorType.RATE_LIMIT_ERROR, undefined, context);
  }

  /**
   * Create a timeout error
   */
  static timeoutError(message: string, originalError?: Error, context?: Record<string, any>): PipelineError {
    return new PipelineError(message, PipelineErrorType.TIMEOUT_ERROR, originalError, context);
  }
}

/**
 * Error aggregator for collecting and analyzing multiple pipeline errors
 */
export class PipelineErrorAggregator {
  private errors: PipelineError[] = [];

  /**
   * Add an error to the aggregator
   */
  addError(error: PipelineError): void {
    this.errors.push(error);
  }

  /**
   * Get all errors
   */
  getErrors(): PipelineError[] {
    return [...this.errors];
  }

  /**
   * Get errors by type
   */
  getErrorsByType(type: PipelineErrorType): PipelineError[] {
    return this.errors.filter(error => error.type === type);
  }

  /**
   * Get retryable errors
   */
  getRetryableErrors(): PipelineError[] {
    return this.errors.filter(error => error.retryable);
  }

  /**
   * Get errors that should trigger alerts
   */
  getAlertableErrors(): PipelineError[] {
    return this.errors.filter(error => error.shouldAlert());
  }

  /**
   * Get error statistics
   */
  getStatistics(): {
    total: number;
    byType: Record<string, number>;
    retryable: number;
    alertable: number;
  } {
    const byType: Record<string, number> = {};
    
    this.errors.forEach(error => {
      byType[error.type] = (byType[error.type] || 0) + 1;
    });

    return {
      total: this.errors.length,
      byType,
      retryable: this.getRetryableErrors().length,
      alertable: this.getAlertableErrors().length
    };
  }

  /**
   * Clear all errors
   */
  clear(): void {
    this.errors = [];
  }

  /**
   * Check if there are any errors
   */
  hasErrors(): boolean {
    return this.errors.length > 0;
  }

  /**
   * Get the most recent error
   */
  getLatestError(): PipelineError | undefined {
    return this.errors[this.errors.length - 1];
  }
}