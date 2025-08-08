export interface RateLimiterConfig {
  requestsPerMinute: number;
  burstLimit: number;
}

export interface RequestSlot {
  timestamp: number;
  id: string;
}

export class RateLimiter {
  private config: RateLimiterConfig;
  private requestHistory: RequestSlot[] = [];
  private lastRequestTime: number = 0;
  private requestCounter: number = 0;

  constructor(config: RateLimiterConfig) {
    this.config = config;
    this.validateConfig();
  }

  private validateConfig(): void {
    if (this.config.requestsPerMinute <= 0) {
      throw new Error('requestsPerMinute must be greater than 0');
    }
    if (this.config.burstLimit <= 0) {
      throw new Error('burstLimit must be greater than 0');
    }
    if (this.config.burstLimit > this.config.requestsPerMinute) {
      throw new Error('burstLimit cannot be greater than requestsPerMinute');
    }
  }

  /**
   * Wait for an available request slot
   */
  async waitForSlot(): Promise<void> {
    const now = Date.now();
    const requestId = this.generateRequestId();

    // Clean up old requests (older than 1 minute)
    this.cleanupOldRequests(now);

    // Check if we can make a request immediately
    if (this.canMakeRequest(now)) {
      this.recordRequest(now, requestId);
      return;
    }

    // Calculate delay needed
    const delay = this.calculateDelay(now);
    
    if (delay > 0) {
      console.log(`Rate limit reached. Waiting ${delay}ms before next request...`);
      await this.delay(delay);
    }

    // Record the request after waiting
    this.recordRequest(Date.now(), requestId);
  }

  /**
   * Check if we can make a request without waiting
   */
  private canMakeRequest(now: number): boolean {
    // Check burst limit
    const recentRequests = this.getRecentRequests(now, 1000); // Last 1 second
    if (recentRequests.length >= this.config.burstLimit) {
      return false;
    }

    // Check per-minute limit
    const requestsInLastMinute = this.getRecentRequests(now, 60000); // Last 60 seconds
    if (requestsInLastMinute.length >= this.config.requestsPerMinute) {
      return false;
    }

    // Check minimum delay between requests
    const minDelay = this.getMinimumDelay();
    if (now - this.lastRequestTime < minDelay) {
      return false;
    }

    return true;
  }

  /**
   * Calculate how long to wait before making the next request
   */
  private calculateDelay(now: number): number {
    const delays: number[] = [];

    // Delay for burst limit
    const recentRequests = this.getRecentRequests(now, 1000);
    if (recentRequests.length >= this.config.burstLimit && recentRequests.length > 0) {
      const oldestRecentRequest = recentRequests[recentRequests.length - 1];
      if (oldestRecentRequest) {
        const burstDelay = 1000 - (now - oldestRecentRequest.timestamp);
        if (burstDelay > 0) {
          delays.push(burstDelay);
        }
      }
    }

    // Delay for per-minute limit
    const requestsInLastMinute = this.getRecentRequests(now, 60000);
    if (requestsInLastMinute.length >= this.config.requestsPerMinute && requestsInLastMinute.length > 0) {
      const oldestRequest = requestsInLastMinute[requestsInLastMinute.length - 1];
      if (oldestRequest) {
        const minuteDelay = 60000 - (now - oldestRequest.timestamp);
        if (minuteDelay > 0) {
          delays.push(minuteDelay);
        }
      }
    }

    // Minimum delay between requests
    const minDelay = this.getMinimumDelay();
    const timeSinceLastRequest = now - this.lastRequestTime;
    if (timeSinceLastRequest < minDelay) {
      delays.push(minDelay - timeSinceLastRequest);
    }

    return Math.max(...delays, 0);
  }

  /**
   * Get minimum delay between requests based on rate limit
   */
  private getMinimumDelay(): number {
    // Ensure we don't exceed the per-minute limit
    return Math.ceil(60000 / this.config.requestsPerMinute);
  }

  /**
   * Record a request in the history
   */
  private recordRequest(timestamp: number, requestId: string): void {
    const request: RequestSlot = { timestamp, id: requestId };
    this.requestHistory.push(request);
    this.lastRequestTime = timestamp;
    this.requestCounter++;

    // Keep history manageable
    if (this.requestHistory.length > this.config.requestsPerMinute * 2) {
      this.requestHistory = this.requestHistory.slice(-this.config.requestsPerMinute);
    }
  }

  /**
   * Get requests within a time window
   */
  private getRecentRequests(now: number, windowMs: number): RequestSlot[] {
    const cutoff = now - windowMs;
    return this.requestHistory.filter(request => request.timestamp > cutoff);
  }

  /**
   * Clean up old requests from history
   */
  private cleanupOldRequests(now: number): void {
    const cutoff = now - 60000; // Keep last minute
    this.requestHistory = this.requestHistory.filter(request => request.timestamp > cutoff);
  }

  /**
   * Generate unique request ID
   */
  private generateRequestId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Utility delay function
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Get current rate limiter statistics
   */
  getStats(): {
    totalRequests: number;
    requestsInLastMinute: number;
    requestsInLastSecond: number;
    canMakeRequest: boolean;
    nextAvailableSlot: number;
  } {
    const now = Date.now();
    const requestsInLastMinute = this.getRecentRequests(now, 60000).length;
    const requestsInLastSecond = this.getRecentRequests(now, 1000).length;
    const canMakeRequest = this.canMakeRequest(now);
    const nextAvailableSlot = canMakeRequest ? 0 : this.calculateDelay(now);

    return {
      totalRequests: this.requestCounter,
      requestsInLastMinute,
      requestsInLastSecond,
      canMakeRequest,
      nextAvailableSlot
    };
  }

  /**
   * Reset the rate limiter
   */
  reset(): void {
    this.requestHistory = [];
    this.lastRequestTime = 0;
    this.requestCounter = 0;
  }

  /**
   * Update rate limiter configuration
   */
  updateConfig(newConfig: Partial<RateLimiterConfig>): void {
    this.config = { ...this.config, ...newConfig };
    this.validateConfig();
  }
}