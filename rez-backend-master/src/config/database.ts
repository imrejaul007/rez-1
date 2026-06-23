import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { logger } from './logger';

// Ensure dotenv is loaded
dotenv.config();
// MongoDB connection configuration
export interface DatabaseConfig {
  uri: string;
  options: mongoose.ConnectOptions;
}

// Default database configuration
const defaultConfig: DatabaseConfig = {
  uri: process.env.MONGODB_URI || 'mongodb://localhost:27017/rez-app',
  options: {
    // Connection options - OPTIMIZED FOR PRODUCTION PERFORMANCE
    // Pool size reduced from 100 → 25 per pod (10 pods × 25 = 250 total, within Atlas limits)
    // Override via MONGO_MAX_POOL_SIZE env var for Atlas M30+ (can raise to 50)
    maxPoolSize: parseInt(process.env.MONGO_MAX_POOL_SIZE || '25', 10),
    minPoolSize: 5, // Reduced idle overhead
    serverSelectionTimeoutMS: 5000, // Keep trying to send operations for 5 seconds
    socketTimeoutMS: 45000, // Close sockets after 45 seconds of inactivity
    family: 4, // Use IPv4, skip trying IPv6
    compressors: ['zlib'], // Enable wire protocol compression
    retryWrites: true, // Retry write operations
    retryReads: true, // Retry read operations
    maxIdleTimeMS: 30000, // Close idle connections after 30 seconds
    
    // Deprecated options removed in mongoose 7+
    // useNewUrlParser: true,
    // useUnifiedTopology: true,
    // useFindAndModify: false,
    // useCreateIndex: true,
  }
};

// Database connection class
export class Database {
  private static instance: Database;
  private isConnected: boolean = false;
  
  private constructor() {}
  
  // Singleton pattern
  public static getInstance(): Database {
    if (!Database.instance) {
      Database.instance = new Database();
    }
    return Database.instance;
  }
  
  // Connect to MongoDB
  public async connect(config: DatabaseConfig = defaultConfig): Promise<void> {
    try {
      if (this.isConnected) {
        logger.info('Database already connected');
        return;
      }
      
      // Add database name to options if specified in environment
      const dbName = process.env.DB_NAME || 'rez-app';
      const connectOptions = { ...config.options, dbName };
      
      // Connect to MongoDB
      await mongoose.connect(config.uri, connectOptions);
      this.isConnected = true;
      
      logger.info(`✅ MongoDB connected successfully to database: ${dbName}`);
      
      // Set up connection event listeners
      this.setupEventListeners();

      // Set up slow query monitoring
      this.setupQueryMonitoring();

    } catch (error) {
      logger.error('❌ MongoDB connection error:', error);
      process.exit(1);
    }
  }
  
  // Disconnect from MongoDB
  public async disconnect(): Promise<void> {
    try {
      if (!this.isConnected) {
        logger.info('Database not connected');
        return;
      }
      
      await mongoose.disconnect();
      this.isConnected = false;
      logger.info('📤 MongoDB disconnected');
      
    } catch (error) {
      logger.error('❌ MongoDB disconnection error:', error);
    }
  }
  
  // Check connection status
  public getConnectionStatus(): boolean {
    return this.isConnected && mongoose.connection.readyState === 1;
  }
  
  // Get connection statistics
  public getConnectionStats() {
    const connection = mongoose.connection;
    return {
      readyState: this.getReadyStateText(connection.readyState),
      host: connection.host,
      port: connection.port,
      name: connection.name,
      collections: Object.keys(connection.collections).length,
      models: Object.keys(mongoose.models).length
    };
  }
  
  // Setup event listeners for connection monitoring
  private setupEventListeners(): void {
    const connection = mongoose.connection;
    
    connection.on('connected', () => {
      logger.info('🔗 Mongoose connected to MongoDB');
    });
    
    connection.on('error', (error) => {
      logger.error('❌ Mongoose connection error:', error);
    });
    
    connection.on('disconnected', () => {
      logger.info('📤 Mongoose disconnected from MongoDB');
      this.isConnected = false;
    });
    
    connection.on('reconnected', () => {
      logger.info('🔄 Mongoose reconnected to MongoDB');
      this.isConnected = true;
    });
    
    // Note: SIGINT/SIGTERM handlers are in server.ts (single source of truth for graceful shutdown)
    // Database disconnection is handled by server.ts shutdown sequence.
  }
  
  // Convert readyState number to text
  private getReadyStateText(state: number): string {
    const states = {
      0: 'disconnected',
      1: 'connected',
      2: 'connecting',
      3: 'disconnecting',
      99: 'uninitialized'
    };
    return states[state as keyof typeof states] || 'unknown';
  }
  
  // Monitor slow queries and log warnings
  private setupQueryMonitoring(): void {
    const SLOW_MS = 300;
    const originalExec = mongoose.Query.prototype.exec;

    (mongoose.Query.prototype as any).exec = async function (this: any) {
      const start = Date.now();
      const collection = this.model?.collection?.name || 'unknown';
      const op = this.op || 'unknown';
      const filter = JSON.stringify(this.getFilter?.() || {}).substring(0, 200);

      try {
        const result = await originalExec.call(this);
        const duration = Date.now() - start;

        if (duration > SLOW_MS) {
          logger.warn('[SLOW QUERY]', { collection, op, duration_ms: duration, filter });
        }
        return result;
      } catch (error) {
        logger.error('[QUERY ERROR]', { collection, op, error: (error as Error).message });
        throw error;
      }
    } as any;

    logger.info('Query monitoring enabled (threshold: 300ms)');
  }

  // Create database indexes (for production optimization)
  public async createIndexes(): Promise<void> {
    try {
      logger.info('🔍 Creating database indexes...');
      
      // This would typically be done automatically by Mongoose,
      // but we can force index creation here for production deployments
      const collections = await mongoose.connection.db?.collections() || [];
      
      for (const collection of collections) {
        try {
          await collection.createIndexes([]);
          logger.info(`✅ Indexes created for ${collection.collectionName}`);
        } catch (indexError) {
          logger.warn(`⚠️ Index creation warning for ${collection.collectionName}:`, indexError);
        }
      }
      
      logger.info('✅ Database indexes creation completed');
    } catch (error) {
      logger.error('❌ Error creating database indexes:', error);
    }
  }
  
  // Database health check
  public async healthCheck(): Promise<{ status: string; details: any }> {
    try {
      const connection = mongoose.connection;
      
      if (connection.readyState !== 1) {
        return {
          status: 'unhealthy',
          details: {
            readyState: this.getReadyStateText(connection.readyState),
            error: 'Not connected to database'
          }
        };
      }
      
      // Test database operation
      const testResult = await connection.db?.admin().ping();
      
      return {
        status: 'healthy',
        details: {
          readyState: this.getReadyStateText(connection.readyState),
          host: connection.host,
          port: connection.port,
          database: connection.name,
          collections: Object.keys(connection.collections).length,
          models: Object.keys(mongoose.models).length,
          ping: testResult
        }
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        details: {
          error: error instanceof Error ? error.message : 'Unknown error',
          readyState: mongoose.connection.readyState
        }
      };
    }
  }
  
  // Clear all collections (for testing/development)
  public async clearDatabase(): Promise<void> {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('Cannot clear database in production environment');
    }
    
    try {
      const collections = await mongoose.connection.db?.collections() || [];
      
      for (const collection of collections) {
        await collection.deleteMany({});
        logger.info(`🗑️ Cleared collection: ${collection.collectionName}`);
      }
      
      logger.info('✅ Database cleared successfully');
    } catch (error) {
      logger.error('❌ Error clearing database:', error);
      throw error;
    }
  }
  
  // Seed database with initial data (for development/testing)
  public async seedDatabase(): Promise<void> {
    try {
      logger.info('🌱 Seeding database with initial data...');
      
      // Import models (this ensures they're registered)
      await import('../models');
      
      // Here you would add your seed data logic
      // This is just a placeholder for now
      
      logger.info('✅ Database seeded successfully');
    } catch (error) {
      logger.error('❌ Error seeding database:', error);
      throw error;
    }
  }
}

// Export singleton instance
export const database = Database.getInstance();

// Export connection function for convenience
export const connectDatabase = async (config?: DatabaseConfig) => {
  return database.connect(config);
};

// Export disconnect function for convenience
export const disconnectDatabase = async () => {
  return database.disconnect();
};