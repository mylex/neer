#!/usr/bin/env node

const http = require('http');
const https = require('https');
const { performance } = require('perf_hooks');

class PerformanceTestSuite {
  constructor(baseUrl = 'http://localhost:3001') {
    this.baseUrl = baseUrl;
    this.results = {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      averageResponseTime: 0,
      minResponseTime: Infinity,
      maxResponseTime: 0,
      responseTimes: [],
      errors: []
    };
  }

  async makeRequest(path, options = {}) {
    return new Promise((resolve, reject) => {
      const url = new URL(path, this.baseUrl);
      const client = url.protocol === 'https:' ? https : http;
      
      const startTime = performance.now();
      
      const req = client.request(url, {
        method: options.method || 'GET',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'Performance-Test-Suite/1.0',
          ...options.headers
        }
      }, (res) => {
        let data = '';
        
        res.on('data', (chunk) => {
          data += chunk;
        });
        
        res.on('end', () => {
          const endTime = performance.now();
          const responseTime = endTime - startTime;
          
          resolve({
            statusCode: res.statusCode,
            responseTime,
            data: data ? JSON.parse(data) : null,
            headers: res.headers
          });
        });
      });
      
      req.on('error', (error) => {
        const endTime = performance.now();
        const responseTime = endTime - startTime;
        
        reject({
          error,
          responseTime
        });
      });
      
      if (options.body) {
        req.write(JSON.stringify(options.body));
      }
      
      req.end();
    });
  }

  async runSingleTest(testName, path, options = {}) {
    console.log(`Running test: ${testName}`);
    
    try {
      const result = await this.makeRequest(path, options);
      
      this.results.totalRequests++;
      this.results.successfulRequests++;
      this.results.responseTimes.push(result.responseTime);
      
      this.updateResponseTimeStats(result.responseTime);
      
      console.log(`✓ ${testName}: ${result.statusCode} (${result.responseTime.toFixed(2)}ms)`);
      return result;
    } catch (error) {
      this.results.totalRequests++;
      this.results.failedRequests++;
      this.results.errors.push({ testName, error: error.error?.message || error.message });
      
      console.log(`✗ ${testName}: Failed (${error.responseTime?.toFixed(2) || 'N/A'}ms) - ${error.error?.message || error.message}`);
      throw error;
    }
  }

  async runConcurrentTest(testName, path, concurrency = 10, options = {}) {
    console.log(`Running concurrent test: ${testName} (${concurrency} concurrent requests)`);
    
    const promises = Array.from({ length: concurrency }, (_, i) => 
      this.makeRequest(path, options).catch(error => ({ error, index: i }))
    );
    
    const startTime = performance.now();
    const results = await Promise.all(promises);
    const endTime = performance.now();
    const totalTime = endTime - startTime;
    
    let successful = 0;
    let failed = 0;
    
    results.forEach((result, index) => {
      this.results.totalRequests++;
      
      if (result.error) {
        failed++;
        this.results.failedRequests++;
        this.results.errors.push({ 
          testName: `${testName}[${index}]`, 
          error: result.error.error?.message || result.error.message 
        });
      } else {
        successful++;
        this.results.successfulRequests++;
        this.results.responseTimes.push(result.responseTime);
        this.updateResponseTimeStats(result.responseTime);
      }
    });
    
    console.log(`${testName}: ${successful}/${concurrency} successful (${totalTime.toFixed(2)}ms total)`);
    
    return {
      successful,
      failed,
      totalTime,
      averageTime: totalTime / concurrency
    };
  }

  updateResponseTimeStats(responseTime) {
    this.results.minResponseTime = Math.min(this.results.minResponseTime, responseTime);
    this.results.maxResponseTime = Math.max(this.results.maxResponseTime, responseTime);
    
    const sum = this.results.responseTimes.reduce((a, b) => a + b, 0);
    this.results.averageResponseTime = sum / this.results.responseTimes.length;
  }

  async runBasicEndpointTests() {
    console.log('\n=== Basic Endpoint Tests ===');
    
    try {
      // Test health endpoint
      await this.runSingleTest('Health Check', '/api/health');
      
      // Test properties list
      await this.runSingleTest('Properties List', '/api/properties');
      
      // Test properties with pagination
      await this.runSingleTest('Properties Pagination', '/api/properties?page=1&limit=10');
      
      // Test search endpoint
      await this.runSingleTest('Search Properties', '/api/properties/search?q=apartment');
      
      // Test search with filters
      await this.runSingleTest('Search with Filters', '/api/properties/search?minPrice=50000&maxPrice=100000&location=Tokyo');
      
      // Test metrics endpoint
      await this.runSingleTest('System Metrics', '/api/metrics');
      
    } catch (error) {
      console.log('Some basic tests failed, but continuing...');
    }
  }

  async runLoadTests() {
    console.log('\n=== Load Tests ===');
    
    // Test concurrent property list requests
    await this.runConcurrentTest('Concurrent Properties List', '/api/properties', 20);
    
    // Test concurrent search requests
    await this.runConcurrentTest('Concurrent Search', '/api/properties/search?q=apartment', 15);
    
    // Test concurrent health checks
    await this.runConcurrentTest('Concurrent Health Checks', '/api/health', 30);
    
    // Test mixed concurrent requests
    const mixedPromises = [
      ...Array.from({ length: 10 }, () => this.makeRequest('/api/properties')),
      ...Array.from({ length: 10 }, () => this.makeRequest('/api/properties/search?q=house')),
      ...Array.from({ length: 5 }, () => this.makeRequest('/api/health')),
      ...Array.from({ length: 5 }, () => this.makeRequest('/api/metrics'))
    ];
    
    console.log('Running mixed concurrent requests (30 total)...');
    const startTime = performance.now();
    const mixedResults = await Promise.allSettled(mixedPromises);
    const endTime = performance.now();
    
    const mixedSuccessful = mixedResults.filter(r => r.status === 'fulfilled').length;
    const mixedFailed = mixedResults.filter(r => r.status === 'rejected').length;
    
    console.log(`Mixed Requests: ${mixedSuccessful}/${mixedPromises.length} successful (${(endTime - startTime).toFixed(2)}ms total)`);
  }

  async runStressTests() {
    console.log('\n=== Stress Tests ===');
    
    // High concurrency test
    await this.runConcurrentTest('High Concurrency Properties', '/api/properties', 50);
    
    // Rapid sequential requests
    console.log('Running rapid sequential requests...');
    const rapidStartTime = performance.now();
    
    for (let i = 0; i < 100; i++) {
      try {
        await this.makeRequest('/api/health');
        this.results.totalRequests++;
        this.results.successfulRequests++;
      } catch (error) {
        this.results.totalRequests++;
        this.results.failedRequests++;
      }
    }
    
    const rapidEndTime = performance.now();
    console.log(`Rapid Sequential: 100 requests in ${(rapidEndTime - rapidStartTime).toFixed(2)}ms`);
  }

  async runErrorHandlingTests() {
    console.log('\n=== Error Handling Tests ===');
    
    // Test invalid endpoints
    try {
      await this.runSingleTest('Invalid Endpoint', '/api/nonexistent');
    } catch (error) {
      // Expected to fail
    }
    
    // Test invalid property ID
    try {
      await this.runSingleTest('Invalid Property ID', '/api/properties/invalid-id');
    } catch (error) {
      // Expected to fail
    }
    
    // Test invalid search parameters
    try {
      await this.runSingleTest('Invalid Search Params', '/api/properties/search?minPrice=invalid&maxPrice=also-invalid');
    } catch (error) {
      // Expected to fail
    }
    
    // Test malformed requests
    try {
      await this.runSingleTest('Malformed Request', '/api/properties', {
        method: 'POST',
        body: { invalid: 'data' }
      });
    } catch (error) {
      // Expected to fail
    }
  }

  generateReport() {
    console.log('\n=== Performance Test Report ===');
    console.log(`Total Requests: ${this.results.totalRequests}`);
    console.log(`Successful: ${this.results.successfulRequests} (${((this.results.successfulRequests / this.results.totalRequests) * 100).toFixed(2)}%)`);
    console.log(`Failed: ${this.results.failedRequests} (${((this.results.failedRequests / this.results.totalRequests) * 100).toFixed(2)}%)`);
    
    if (this.results.responseTimes.length > 0) {
      console.log(`\nResponse Times:`);
      console.log(`  Average: ${this.results.averageResponseTime.toFixed(2)}ms`);
      console.log(`  Min: ${this.results.minResponseTime.toFixed(2)}ms`);
      console.log(`  Max: ${this.results.maxResponseTime.toFixed(2)}ms`);
      
      // Calculate percentiles
      const sortedTimes = [...this.results.responseTimes].sort((a, b) => a - b);
      const p50 = sortedTimes[Math.floor(sortedTimes.length * 0.5)];
      const p90 = sortedTimes[Math.floor(sortedTimes.length * 0.9)];
      const p95 = sortedTimes[Math.floor(sortedTimes.length * 0.95)];
      const p99 = sortedTimes[Math.floor(sortedTimes.length * 0.99)];
      
      console.log(`  50th percentile: ${p50.toFixed(2)}ms`);
      console.log(`  90th percentile: ${p90.toFixed(2)}ms`);
      console.log(`  95th percentile: ${p95.toFixed(2)}ms`);
      console.log(`  99th percentile: ${p99.toFixed(2)}ms`);
    }
    
    if (this.results.errors.length > 0) {
      console.log(`\nErrors:`);
      const errorCounts = {};
      this.results.errors.forEach(error => {
        const message = error.error || 'Unknown error';
        errorCounts[message] = (errorCounts[message] || 0) + 1;
      });
      
      Object.entries(errorCounts).forEach(([error, count]) => {
        console.log(`  ${error}: ${count} occurrences`);
      });
    }
    
    // Performance assessment
    console.log('\n=== Performance Assessment ===');
    const avgTime = this.results.averageResponseTime;
    const successRate = (this.results.successfulRequests / this.results.totalRequests) * 100;
    
    if (avgTime < 100 && successRate > 95) {
      console.log('🟢 EXCELLENT: System performance is excellent');
    } else if (avgTime < 500 && successRate > 90) {
      console.log('🟡 GOOD: System performance is acceptable');
    } else if (avgTime < 1000 && successRate > 80) {
      console.log('🟠 FAIR: System performance needs improvement');
    } else {
      console.log('🔴 POOR: System performance is inadequate');
    }
    
    return this.results;
  }

  async runAllTests() {
    console.log('Starting comprehensive performance test suite...');
    console.log(`Target URL: ${this.baseUrl}`);
    
    const overallStartTime = performance.now();
    
    try {
      await this.runBasicEndpointTests();
      await this.runLoadTests();
      await this.runStressTests();
      await this.runErrorHandlingTests();
    } catch (error) {
      console.log('Test suite encountered an error:', error.message);
    }
    
    const overallEndTime = performance.now();
    const totalTestTime = overallEndTime - overallStartTime;
    
    console.log(`\nTotal test execution time: ${(totalTestTime / 1000).toFixed(2)} seconds`);
    
    return this.generateReport();
  }
}

// CLI execution
if (require.main === module) {
  const args = process.argv.slice(2);
  const baseUrl = args[0] || 'http://localhost:3001';
  
  console.log('Japanese Real Estate Scraper - Performance Test Suite');
  console.log('====================================================');
  
  const testSuite = new PerformanceTestSuite(baseUrl);
  
  testSuite.runAllTests()
    .then((results) => {
      const successRate = (results.successfulRequests / results.totalRequests) * 100;
      process.exit(successRate > 80 ? 0 : 1);
    })
    .catch((error) => {
      console.error('Test suite failed:', error);
      process.exit(1);
    });
}

module.exports = PerformanceTestSuite;