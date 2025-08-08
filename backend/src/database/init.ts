import { db } from '../config/database';
import { migrationManager } from './migrator';

// Database initialization script
export async function initializeDatabase(): Promise<void> {
  console.log('Initializing database...');
  
  try {
    // Test database connection
    const isConnected = await db.testConnection();
    if (!isConnected) {
      throw new Error('Failed to connect to database');
    }
    
    // Run migrations
    await migrationManager.runMigrations();
    
    console.log('✓ Database initialized successfully');
  } catch (error) {
    console.error('✗ Database initialization failed:', error);
    throw error;
  }
}

// CLI interface
if (require.main === module) {
  initializeDatabase()
    .then(() => {
      console.log('Database initialization complete');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Database initialization failed:', error);
      process.exit(1);
    });
}