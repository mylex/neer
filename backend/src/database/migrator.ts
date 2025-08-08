import { readFileSync, readdirSync } from 'fs';
import { join } from 'path';
import { db } from '../config/database';

// Migration interface
interface Migration {
  name: string;
  sql: string;
}

// Migration manager class
export class MigrationManager {
  private migrationsPath: string;

  constructor(migrationsPath: string = join(__dirname, 'migrations')) {
    this.migrationsPath = migrationsPath;
  }

  // Get all migration files sorted by name
  private getMigrationFiles(): string[] {
    try {
      const files = readdirSync(this.migrationsPath)
        .filter(file => file.endsWith('.sql'))
        .sort();
      return files;
    } catch (error) {
      console.error('Error reading migrations directory:', error);
      return [];
    }
  }

  // Load migration content from file
  private loadMigration(filename: string): Migration {
    const filePath = join(this.migrationsPath, filename);
    const sql = readFileSync(filePath, 'utf8');
    return {
      name: filename.replace('.sql', ''),
      sql
    };
  }

  // Check if migration has been applied
  private async isMigrationApplied(migrationName: string): Promise<boolean> {
    try {
      const result = await db.query(
        'SELECT 1 FROM migrations WHERE migration_name = $1',
        [migrationName]
      );
      return result.rows.length > 0;
    } catch (error) {
      // If migrations table doesn't exist, no migrations have been applied
      return false;
    }
  }

  // Apply a single migration
  private async applyMigration(migration: Migration): Promise<void> {
    console.log(`Applying migration: ${migration.name}`);
    
    try {
      await db.transaction(async (client) => {
        // Execute the migration SQL
        await client.query(migration.sql);
        console.log(`✓ Migration ${migration.name} applied successfully`);
      });
    } catch (error) {
      console.error(`✗ Failed to apply migration ${migration.name}:`, error);
      throw error;
    }
  }

  // Run all pending migrations
  public async runMigrations(): Promise<void> {
    console.log('Starting database migrations...');
    
    const migrationFiles = this.getMigrationFiles();
    
    if (migrationFiles.length === 0) {
      console.log('No migration files found');
      return;
    }

    let appliedCount = 0;
    
    for (const filename of migrationFiles) {
      const migration = this.loadMigration(filename);
      
      const isApplied = await this.isMigrationApplied(migration.name);
      
      if (!isApplied) {
        await this.applyMigration(migration);
        appliedCount++;
      } else {
        console.log(`⏭ Migration ${migration.name} already applied, skipping`);
      }
    }
    
    if (appliedCount > 0) {
      console.log(`✓ Applied ${appliedCount} migration(s) successfully`);
    } else {
      console.log('✓ All migrations are up to date');
    }
  }

  // Get migration status
  public async getMigrationStatus(): Promise<{
    total: number;
    applied: number;
    pending: string[];
  }> {
    const migrationFiles = this.getMigrationFiles();
    const pending: string[] = [];
    let applied = 0;

    for (const filename of migrationFiles) {
      const migrationName = filename.replace('.sql', '');
      const isApplied = await this.isMigrationApplied(migrationName);
      
      if (isApplied) {
        applied++;
      } else {
        pending.push(migrationName);
      }
    }

    return {
      total: migrationFiles.length,
      applied,
      pending
    };
  }

  // Create a new migration file template
  public createMigration(name: string): string {
    const timestamp = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const migrationName = `${timestamp}_${name.toLowerCase().replace(/\s+/g, '_')}`;
    const filename = `${migrationName}.sql`;
    const filePath = join(this.migrationsPath, filename);

    const template = `-- Migration: ${migrationName}
-- Description: ${name}
-- Created: ${new Date().toISOString().slice(0, 10)}

-- Add your migration SQL here

-- Record this migration as applied
INSERT INTO migrations (migration_name) VALUES ('${migrationName}') ON CONFLICT (migration_name) DO NOTHING;
`;

    try {
      require('fs').writeFileSync(filePath, template);
      console.log(`Created migration file: ${filename}`);
      return filePath;
    } catch (error) {
      console.error('Error creating migration file:', error);
      throw error;
    }
  }
}

// Export singleton instance
export const migrationManager = new MigrationManager();

// CLI interface for running migrations
if (require.main === module) {
  const command = process.argv[2];
  
  switch (command) {
    case 'run':
      migrationManager.runMigrations()
        .then(() => process.exit(0))
        .catch((error) => {
          console.error('Migration failed:', error);
          process.exit(1);
        });
      break;
      
    case 'status':
      migrationManager.getMigrationStatus()
        .then((status) => {
          console.log('Migration Status:');
          console.log(`Total migrations: ${status.total}`);
          console.log(`Applied: ${status.applied}`);
          console.log(`Pending: ${status.pending.length}`);
          if (status.pending.length > 0) {
            console.log('Pending migrations:', status.pending.join(', '));
          }
          process.exit(0);
        })
        .catch((error) => {
          console.error('Error getting migration status:', error);
          process.exit(1);
        });
      break;
      
    case 'create':
      const migrationName = process.argv[3];
      if (!migrationName) {
        console.error('Please provide a migration name');
        process.exit(1);
      }
      try {
        migrationManager.createMigration(migrationName);
        process.exit(0);
      } catch (error) {
        console.error('Error creating migration:', error);
        process.exit(1);
      }
      break;
      
    default:
      console.log('Usage:');
      console.log('  npm run migrate run     - Run all pending migrations');
      console.log('  npm run migrate status  - Show migration status');
      console.log('  npm run migrate create <name> - Create a new migration');
      process.exit(1);
  }
}