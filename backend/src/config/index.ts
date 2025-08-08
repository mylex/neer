import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

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
}

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
};