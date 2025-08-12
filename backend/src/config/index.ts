import dotenv from 'dotenv';
import path from 'path';

// Load environment variables based on NODE_ENV
const envFile = process.env['NODE_ENV'] === 'production' 
  ? '.env.production' 
  : process.env['NODE_ENV'] === 'test' 
    ? '.env.test' 
    : '.env.development';

dotenv.config({ path: path.resolve(process.cwd(), envFile) });

// Configuration interface
interface Config {
  port: number;
  nodeEnv: string;
  database: {
    host: string;
    port: number;
    name: string;
    user: string;
    password: string;
    maxConnections: number;
    minConnections: number;
  };
  redis: {
    host: string;
    port: number;
    password?: string;
    db: number;
    ttl: {
      properties: number;
      search: number;
      stats: number;
    };
  };
}

// Create Redis configuration with proper optional handling
const createRedisConfig = () => {
  const redisPassword = process.env['REDIS_PASSWORD'];
  const baseConfig = {
    host: process.env['REDIS_HOST'] || 'localhost',
    port: parseInt(process.env['REDIS_PORT'] || '6379', 10),
    db: parseInt(process.env['REDIS_DB'] || '0', 10),
    ttl: {
      properties: parseInt(process.env['REDIS_TTL_PROPERTIES'] || '3600', 10), // 1 hour
      search: parseInt(process.env['REDIS_TTL_SEARCH'] || '300', 10), // 5 minutes
      stats: parseInt(process.env['REDIS_TTL_STATS'] || '600', 10), // 10 minutes
    },
  };

  if (redisPassword) {
    return { ...baseConfig, password: redisPassword };
  }
  return baseConfig;
};

// Export configuration object
export const config: Config = {
  port: parseInt(process.env['PORT'] || '3001', 10),
  nodeEnv: process.env['NODE_ENV'] || 'development',
  database: {
    host: process.env['DB_HOST'] || 'localhost',
    port: parseInt(process.env['DB_PORT'] || '5432', 10),
    name: process.env['DB_NAME'] || 'japanese_real_estate_scraper',
    user: process.env['DB_USER'] || 'postgres',
    password: process.env['DB_PASSWORD'] || 'password',
    maxConnections: parseInt(process.env['DB_MAX_CONNECTIONS'] || '20', 10),
    minConnections: parseInt(process.env['DB_MIN_CONNECTIONS'] || '2', 10),
  },
  redis: createRedisConfig(),
};