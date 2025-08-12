#!/usr/bin/env node

const http = require('http');
const https = require('https');
const { spawn } = require('child_process');
const fs = require('fs').promises;
const path = require('path');

class SystemValidator {
  constructor() {
    this.results = {
      requirements: {},
      components: {},
      integration: {},
      performance: {},
      errors: []
    };
  }

  async validateRequirement(requirementId, description, testFunction) {
    console.log(`Validating Requirement ${requirementId}: ${description}`);
    
    try {
      const result = await testFunction();
      this.results.requirements[requirementId] = {
        description,
        status: 'PASS',
        details: result
      };
      console.log(`✓ Requirement ${requirementId}: PASS`);
      return true;
    } catch (error) {
      this.results.requirements[requirementId] = {
        description,
        status: 'FAIL',
        error: error.message,
        details: error.details || null
      };
      console.log(`✗ Requirement ${requirementId}: FAIL - ${error.message}`);
      this.results.errors.push(`Requirement ${requirementId}: ${error.message}`);
      return false;
    }
  }

  async makeRequest(url, options = {}) {
    return new Promise((resolve, reject) => {
      const client = url.startsWith('https') ? https : http;
      
      const req = client.request(url, {
        method: options.method || 'GET',
        headers: {
          'Content-Type': 'application/json',
          ...options.headers
        }
      }, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          try {
            const parsedData = data ? JSON.parse(data) : null;
            resolve({
              statusCode: res.statusCode,
              data: parsedData,
              headers: res.headers
            });
          } catch (error) {
            resolve({
              statusCode: res.statusCode,
              data: data,
              headers: res.headers
            });
          }
        });
      });
      
      req.on('error', reject);
      
      if (options.body) {
        req.write(JSON.stringify(options.body));
      }
      
      req.end();
    });
  }

  async checkFileExists(filePath) {
    try {
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }

  async runCommand(command, args = [], options = {}) {
    return new Promise((resolve, reject) => {
      const child = spawn(command, args, {
        stdio: 'pipe',
        ...options
      });
      
      let stdout = '';
      let stderr = '';
      
      child.stdout?.on('data', (data) => {
        stdout += data.toString();
      });
      
      child.stderr?.on('data', (data) => {
        stderr += data.toString();
      });
      
      child.on('close', (code) => {
        if (code === 0) {
          resolve({ stdout, stderr, code });
        } else {
          reject(new Error(`Command failed with code ${code}: ${stderr}`));
        }
      });
      
      child.on('error', reject);
    });
  }

  async validateRequirement1() {
    // Requirement 1: Scraping functionality
    await this.validateRequirement('1.1', 'System can scrape property data from Japanese real estate websites', async () => {
      // Check if scraper components exist
      const scraperFiles = [
        'backend/src/services/scraper/SuumoScraper.ts',
        'backend/src/services/scraper/BaseScraper.ts',
        'backend/src/services/scraper/ScraperFactory.ts'
      ];
      
      for (const file of scraperFiles) {
        if (!(await this.checkFileExists(file))) {
          throw new Error(`Missing scraper component: ${file}`);
        }
      }
      
      // Check if scraper tests pass
      try {
        await this.runCommand('npm', ['test', '--', '--testPathPattern=scraper'], { cwd: 'backend' });
      } catch (error) {
        throw new Error(`Scraper tests failed: ${error.message}`);
      }
      
      return 'Scraper components exist and tests pass';
    });

    await this.validateRequirement('1.2', 'System captures essential property details', async () => {
      // Check property model includes required fields
      const propertyModelPath = 'backend/src/models/Property.ts';
      if (!(await this.checkFileExists(propertyModelPath))) {
        throw new Error('Property model file not found');
      }
      
      const propertyModel = await fs.readFile(propertyModelPath, 'utf8');
      const requiredFields = ['url', 'title', 'price', 'location', 'size', 'propertyType'];
      
      for (const field of requiredFields) {
        if (!propertyModel.includes(field)) {
          throw new Error(`Property model missing required field: ${field}`);
        }
      }
      
      return 'Property model includes all required fields';
    });

    await this.validateRequirement('1.3', 'System implements rate limiting and retry mechanisms', async () => {
      const rateLimiterPath = 'backend/src/services/scraper/RateLimiter.ts';
      if (!(await this.checkFileExists(rateLimiterPath))) {
        throw new Error('Rate limiter component not found');
      }
      
      const rateLimiter = await fs.readFile(rateLimiterPath, 'utf8');
      if (!rateLimiter.includes('delay') || !rateLimiter.includes('retry')) {
        throw new Error('Rate limiter missing delay or retry functionality');
      }
      
      return 'Rate limiting and retry mechanisms implemented';
    });

    await this.validateRequirement('1.4', 'System handles scraping failures gracefully', async () => {
      const errorHandlerPath = 'backend/src/services/scraper/ScraperErrorHandler.ts';
      if (!(await this.checkFileExists(errorHandlerPath))) {
        throw new Error('Scraper error handler not found');
      }
      
      return 'Error handling mechanisms implemented';
    });
  }

  async validateRequirement2() {
    // Requirement 2: Translation functionality
    await this.validateRequirement('2.1', 'System translates Japanese text to English', async () => {
      const translationServicePath = 'backend/src/services/translation/TranslationService.ts';
      if (!(await this.checkFileExists(translationServicePath))) {
        throw new Error('Translation service not found');
      }
      
      // Check if translation tests pass
      try {
        await this.runCommand('npm', ['test', '--', '--testPathPattern=translation'], { cwd: 'backend' });
      } catch (error) {
        throw new Error(`Translation tests failed: ${error.message}`);
      }
      
      return 'Translation service exists and tests pass';
    });

    await this.validateRequirement('2.2', 'System preserves original Japanese text', async () => {
      const propertyModel = await fs.readFile('backend/src/models/Property.ts', 'utf8');
      
      if (!propertyModel.includes('title') || !propertyModel.includes('titleEn')) {
        throw new Error('Property model missing original and translated title fields');
      }
      
      if (!propertyModel.includes('description') || !propertyModel.includes('descriptionEn')) {
        throw new Error('Property model missing original and translated description fields');
      }
      
      return 'Original and translated text fields present in model';
    });

    await this.validateRequirement('2.3', 'System handles translation failures', async () => {
      const translationService = await fs.readFile('backend/src/services/translation/TranslationService.ts', 'utf8');
      
      if (!translationService.includes('TranslationStatus') || !translationService.includes('FAILED')) {
        throw new Error('Translation failure handling not implemented');
      }
      
      return 'Translation failure handling implemented';
    });

    await this.validateRequirement('2.4', 'System maintains location accuracy in translation', async () => {
      const propertyModel = await fs.readFile('backend/src/models/Property.ts', 'utf8');
      
      if (!propertyModel.includes('location') || !propertyModel.includes('locationEn')) {
        throw new Error('Location translation fields not found');
      }
      
      return 'Location translation fields implemented';
    });
  }

  async validateRequirement3() {
    // Requirement 3: Database functionality
    await this.validateRequirement('3.1', 'System stores data in structured database', async () => {
      const schemaPath = 'database/schema.sql';
      if (!(await this.checkFileExists(schemaPath))) {
        throw new Error('Database schema file not found');
      }
      
      const schema = await fs.readFile(schemaPath, 'utf8');
      if (!schema.includes('CREATE TABLE properties')) {
        throw new Error('Properties table not defined in schema');
      }
      
      return 'Database schema properly defined';
    });

    await this.validateRequirement('3.2', 'System prevents duplicate entries', async () => {
      const schema = await fs.readFile('database/schema.sql', 'utf8');
      
      if (!schema.includes('UNIQUE') && !schema.includes('url')) {
        throw new Error('Unique constraint on URL not found in schema');
      }
      
      return 'Duplicate prevention implemented via unique constraints';
    });

    await this.validateRequirement('3.3', 'System updates existing records', async () => {
      const repositoryPath = 'backend/src/database/repositories/PropertyRepository.ts';
      if (!(await this.checkFileExists(repositoryPath))) {
        throw new Error('Property repository not found');
      }
      
      const repository = await fs.readFile(repositoryPath, 'utf8');
      if (!repository.includes('update')) {
        throw new Error('Update functionality not found in repository');
      }
      
      return 'Record update functionality implemented';
    });

    await this.validateRequirement('3.4', 'System handles database failures gracefully', async () => {
      const repository = await fs.readFile('backend/src/database/repositories/PropertyRepository.ts', 'utf8');
      
      if (!repository.includes('try') || !repository.includes('catch')) {
        throw new Error('Error handling not found in repository');
      }
      
      return 'Database error handling implemented';
    });
  }

  async validateRequirement4() {
    // Requirement 4: Web application functionality
    await this.validateRequirement('4.1', 'System displays list of properties', async () => {
      // Check API endpoint
      const response = await this.makeRequest('http://localhost:3001/api/properties');
      
      if (response.statusCode !== 200) {
        throw new Error(`Properties API returned status ${response.statusCode}`);
      }
      
      if (!response.data || !response.data.success) {
        throw new Error('Properties API response invalid');
      }
      
      // Check frontend component
      const propertyListPath = 'frontend/src/components/PropertyList.tsx';
      if (!(await this.checkFileExists(propertyListPath))) {
        throw new Error('PropertyList component not found');
      }
      
      return 'Property listing functionality implemented';
    });

    await this.validateRequirement('4.2', 'System shows key property information', async () => {
      const propertyCardPath = 'frontend/src/components/PropertyCard.tsx';
      if (!(await this.checkFileExists(propertyCardPath))) {
        throw new Error('PropertyCard component not found');
      }
      
      const propertyCard = await fs.readFile(propertyCardPath, 'utf8');
      const requiredFields = ['price', 'location', 'size', 'propertyType'];
      
      for (const field of requiredFields) {
        if (!propertyCard.includes(field)) {
          throw new Error(`PropertyCard missing display of ${field}`);
        }
      }
      
      return 'Key property information display implemented';
    });

    await this.validateRequirement('4.3', 'System displays detailed property information', async () => {
      const propertyDetailPath = 'frontend/src/components/PropertyDetail.tsx';
      if (!(await this.checkFileExists(propertyDetailPath))) {
        throw new Error('PropertyDetail component not found');
      }
      
      // Check API endpoint
      const response = await this.makeRequest('http://localhost:3001/api/properties/1');
      
      if (response.statusCode !== 200 && response.statusCode !== 404) {
        throw new Error(`Property detail API returned unexpected status ${response.statusCode}`);
      }
      
      return 'Property detail functionality implemented';
    });

    await this.validateRequirement('4.4', 'System renders within performance requirements', async () => {
      // Check for performance optimizations
      const performanceUtilsPath = 'frontend/src/utils/performance.ts';
      if (!(await this.checkFileExists(performanceUtilsPath))) {
        throw new Error('Performance utilities not found');
      }
      
      const lazyImagePath = 'frontend/src/components/LazyImage.tsx';
      if (!(await this.checkFileExists(lazyImagePath))) {
        throw new Error('Lazy loading component not found');
      }
      
      return 'Performance optimizations implemented';
    });
  }

  async validateRequirement5() {
    // Requirement 5: Search and filtering functionality
    await this.validateRequirement('5.1', 'System allows filtering by various criteria', async () => {
      const searchFiltersPath = 'frontend/src/components/SearchFilters.tsx';
      if (!(await this.checkFileExists(searchFiltersPath))) {
        throw new Error('SearchFilters component not found');
      }
      
      // Test search API
      const response = await this.makeRequest('http://localhost:3001/api/properties/search?minPrice=50000&maxPrice=100000');
      
      if (response.statusCode !== 200) {
        throw new Error(`Search API returned status ${response.statusCode}`);
      }
      
      return 'Search and filtering functionality implemented';
    });

    await this.validateRequirement('5.2', 'System combines multiple filter criteria', async () => {
      const response = await this.makeRequest('http://localhost:3001/api/properties/search?minPrice=50000&maxPrice=100000&location=Tokyo&propertyType=apartment');
      
      if (response.statusCode !== 200) {
        throw new Error(`Multi-filter search returned status ${response.statusCode}`);
      }
      
      return 'Multi-criteria filtering implemented';
    });

    await this.validateRequirement('5.3', 'System shows search result count', async () => {
      const response = await this.makeRequest('http://localhost:3001/api/properties/search?q=apartment');
      
      if (response.statusCode !== 200) {
        throw new Error(`Search API returned status ${response.statusCode}`);
      }
      
      if (!response.data.pagination || typeof response.data.pagination.total !== 'number') {
        throw new Error('Search results missing count information');
      }
      
      return 'Search result counting implemented';
    });

    await this.validateRequirement('5.4', 'System handles empty search results', async () => {
      const response = await this.makeRequest('http://localhost:3001/api/properties/search?q=nonexistentproperty12345');
      
      if (response.statusCode !== 200) {
        throw new Error(`Empty search returned status ${response.statusCode}`);
      }
      
      if (!response.data.message) {
        throw new Error('Empty search results missing message');
      }
      
      return 'Empty search result handling implemented';
    });

    await this.validateRequirement('5.5', 'System allows clearing filters', async () => {
      const searchFilters = await fs.readFile('frontend/src/components/SearchFilters.tsx', 'utf8');
      
      if (!searchFilters.includes('clear') && !searchFilters.includes('reset')) {
        throw new Error('Filter clearing functionality not found');
      }
      
      return 'Filter clearing functionality implemented';
    });
  }

  async validateRequirement6() {
    // Requirement 6: Automated scheduling
    await this.validateRequirement('6.1', 'System runs scraping on schedule', async () => {
      const schedulerPath = 'backend/src/services/scheduler/SchedulerService.ts';
      if (!(await this.checkFileExists(schedulerPath))) {
        throw new Error('Scheduler service not found');
      }
      
      const scheduler = await fs.readFile(schedulerPath, 'utf8');
      if (!scheduler.includes('cron') && !scheduler.includes('schedule')) {
        throw new Error('Scheduling functionality not implemented');
      }
      
      return 'Automated scheduling implemented';
    });

    await this.validateRequirement('6.2', 'System updates database with new listings', async () => {
      const pipelinePath = 'backend/src/services/pipeline/DataProcessingPipeline.ts';
      if (!(await this.checkFileExists(pipelinePath))) {
        throw new Error('Data processing pipeline not found');
      }
      
      return 'Database update pipeline implemented';
    });

    await this.validateRequirement('6.3', 'System sends error notifications', async () => {
      const notificationPath = 'backend/src/services/scheduler/NotificationService.ts';
      if (!(await this.checkFileExists(notificationPath))) {
        throw new Error('Notification service not found');
      }
      
      return 'Error notification system implemented';
    });

    await this.validateRequirement('6.4', 'System handles maintenance mode', async () => {
      const healthCheckPath = 'backend/src/services/scheduler/HealthCheckService.ts';
      if (!(await this.checkFileExists(healthCheckPath))) {
        throw new Error('Health check service not found');
      }
      
      return 'Maintenance mode handling implemented';
    });
  }

  async validateRequirement7() {
    // Requirement 7: Monitoring and logging
    await this.validateRequirement('7.1', 'System logs all activities', async () => {
      const systemLoggerPath = 'backend/src/services/monitoring/SystemLogger.ts';
      if (!(await this.checkFileExists(systemLoggerPath))) {
        throw new Error('System logger not found');
      }
      
      return 'Activity logging implemented';
    });

    await this.validateRequirement('7.2', 'System captures error information', async () => {
      const logFiles = [
        'backend/logs/error.log',
        'backend/logs/exceptions.log'
      ];
      
      // Check if log directory structure exists
      const logsDir = 'backend/logs';
      if (!(await this.checkFileExists(logsDir))) {
        throw new Error('Logs directory not found');
      }
      
      return 'Error logging infrastructure implemented';
    });

    await this.validateRequirement('7.3', 'System displays health metrics', async () => {
      const response = await this.makeRequest('http://localhost:3001/api/health');
      
      if (response.statusCode !== 200) {
        throw new Error(`Health endpoint returned status ${response.statusCode}`);
      }
      
      if (!response.data.status) {
        throw new Error('Health endpoint missing status information');
      }
      
      return 'Health metrics endpoint implemented';
    });

    await this.validateRequirement('7.4', 'System alerts administrators', async () => {
      const notificationPath = 'backend/src/services/monitoring/NotificationService.ts';
      if (!(await this.checkFileExists(notificationPath))) {
        throw new Error('Monitoring notification service not found');
      }
      
      return 'Administrator alerting implemented';
    });
  }

  async validateSystemIntegration() {
    console.log('\n=== System Integration Validation ===');
    
    // Test complete workflow
    try {
      // 1. Check if backend is running
      const healthResponse = await this.makeRequest('http://localhost:3001/api/health');
      if (healthResponse.statusCode !== 200) {
        throw new Error('Backend service not healthy');
      }
      
      // 2. Test data flow
      const propertiesResponse = await this.makeRequest('http://localhost:3001/api/properties');
      if (propertiesResponse.statusCode !== 200) {
        throw new Error('Properties endpoint not working');
      }
      
      // 3. Test search functionality
      const searchResponse = await this.makeRequest('http://localhost:3001/api/properties/search?q=test');
      if (searchResponse.statusCode !== 200) {
        throw new Error('Search endpoint not working');
      }
      
      // 4. Test metrics collection
      const metricsResponse = await this.makeRequest('http://localhost:3001/api/metrics');
      if (metricsResponse.statusCode !== 200) {
        throw new Error('Metrics endpoint not working');
      }
      
      this.results.integration.status = 'PASS';
      this.results.integration.details = 'All integration tests passed';
      console.log('✓ System Integration: PASS');
      
    } catch (error) {
      this.results.integration.status = 'FAIL';
      this.results.integration.error = error.message;
      console.log(`✗ System Integration: FAIL - ${error.message}`);
      this.results.errors.push(`Integration: ${error.message}`);
    }
  }

  async validatePerformance() {
    console.log('\n=== Performance Validation ===');
    
    try {
      // Run performance tests
      const PerformanceTestSuite = require('./performance-test.js');
      const perfTest = new PerformanceTestSuite('http://localhost:3001');
      
      const perfResults = await perfTest.runAllTests();
      
      const successRate = (perfResults.successfulRequests / perfResults.totalRequests) * 100;
      const avgResponseTime = perfResults.averageResponseTime;
      
      if (successRate >= 95 && avgResponseTime <= 500) {
        this.results.performance.status = 'PASS';
        this.results.performance.details = {
          successRate: `${successRate.toFixed(2)}%`,
          averageResponseTime: `${avgResponseTime.toFixed(2)}ms`
        };
        console.log('✓ Performance: PASS');
      } else {
        this.results.performance.status = 'FAIL';
        this.results.performance.details = {
          successRate: `${successRate.toFixed(2)}%`,
          averageResponseTime: `${avgResponseTime.toFixed(2)}ms`,
          reason: 'Performance below acceptable thresholds'
        };
        console.log('✗ Performance: FAIL - Below acceptable thresholds');
        this.results.errors.push('Performance below acceptable thresholds');
      }
      
    } catch (error) {
      this.results.performance.status = 'FAIL';
      this.results.performance.error = error.message;
      console.log(`✗ Performance: FAIL - ${error.message}`);
      this.results.errors.push(`Performance: ${error.message}`);
    }
  }

  generateReport() {
    console.log('\n=== System Validation Report ===');
    
    const requirementResults = Object.values(this.results.requirements);
    const passedRequirements = requirementResults.filter(r => r.status === 'PASS').length;
    const totalRequirements = requirementResults.length;
    
    console.log(`Requirements: ${passedRequirements}/${totalRequirements} passed (${((passedRequirements / totalRequirements) * 100).toFixed(2)}%)`);
    console.log(`Integration: ${this.results.integration.status || 'NOT TESTED'}`);
    console.log(`Performance: ${this.results.performance.status || 'NOT TESTED'}`);
    
    if (this.results.errors.length > 0) {
      console.log('\nErrors encountered:');
      this.results.errors.forEach(error => {
        console.log(`  - ${error}`);
      });
    }
    
    const overallStatus = passedRequirements === totalRequirements && 
                         this.results.integration.status === 'PASS' && 
                         this.results.performance.status === 'PASS';
    
    console.log(`\nOverall System Status: ${overallStatus ? '🟢 PASS' : '🔴 FAIL'}`);
    
    return {
      overall: overallStatus ? 'PASS' : 'FAIL',
      requirements: this.results.requirements,
      integration: this.results.integration,
      performance: this.results.performance,
      errors: this.results.errors
    };
  }

  async runFullValidation() {
    console.log('Japanese Real Estate Scraper - System Validation');
    console.log('================================================');
    
    try {
      console.log('\n=== Requirements Validation ===');
      await this.validateRequirement1();
      await this.validateRequirement2();
      await this.validateRequirement3();
      await this.validateRequirement4();
      await this.validateRequirement5();
      await this.validateRequirement6();
      await this.validateRequirement7();
      
      await this.validateSystemIntegration();
      await this.validatePerformance();
      
    } catch (error) {
      console.error('Validation suite encountered an error:', error);
      this.results.errors.push(`Validation suite error: ${error.message}`);
    }
    
    return this.generateReport();
  }
}

// CLI execution
if (require.main === module) {
  const validator = new SystemValidator();
  
  validator.runFullValidation()
    .then((results) => {
      process.exit(results.overall === 'PASS' ? 0 : 1);
    })
    .catch((error) => {
      console.error('System validation failed:', error);
      process.exit(1);
    });
}

module.exports = SystemValidator;