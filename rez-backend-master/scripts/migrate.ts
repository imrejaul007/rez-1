import mongoose from 'mongoose';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

interface Migration {
  name: string;
  version: number;
  up: () => Promise<void>;
  down?: () => Promise<void>;
}

const migrations: Migration[] = [
  {
    name: 'add-onboarding-to-merchants',
    version: 1,
    up: async () => {
      console.log('Running: add-onboarding-to-merchants');
      await mongoose.connection.collection('merchants').updateMany(
        { onboarding: { $exists: false } },
        {
          $set: {
            onboarding: {
              status: 'pending',
              currentStep: 1,
              completedSteps: [],
              startedAt: new Date(),
            },
          },
        }
      );
      console.log('Completed: add-onboarding-to-merchants');
    },
    down: async () => {
      await mongoose.connection.collection('merchants').updateMany(
        {},
        { $unset: { onboarding: '' } }
      );
    },
  },
  {
    name: 'add-indexes',
    version: 2,
    up: async () => {
      console.log('Running: add-indexes');

      // Merchants indexes
      await mongoose.connection.collection('merchants').createIndex({ email: 1 }, { unique: true });
      await mongoose.connection.collection('merchants').createIndex({ phone: 1 });
      await mongoose.connection.collection('merchants').createIndex({ 'store.slug': 1 });
      await mongoose.connection.collection('merchants').createIndex({ status: 1 });
      await mongoose.connection.collection('merchants').createIndex({ createdAt: -1 });

      // Products indexes
      await mongoose.connection.collection('products').createIndex({ merchantId: 1, status: 1 });
      await mongoose.connection.collection('products').createIndex({ category: 1, status: 1 });
      await mongoose.connection.collection('products').createIndex({ 'pricing.finalPrice': 1 });
      await mongoose.connection.collection('products').createIndex({ createdAt: -1 });
      await mongoose.connection.collection('products').createIndex({ name: 'text', description: 'text' });

      // Orders indexes
      await mongoose.connection.collection('orders').createIndex({ merchantId: 1, status: 1 });
      await mongoose.connection.collection('orders').createIndex({ userId: 1, createdAt: -1 });
      await mongoose.connection.collection('orders').createIndex({ orderNumber: 1 }, { unique: true });
      await mongoose.connection.collection('orders').createIndex({ status: 1, createdAt: -1 });

      // Reviews indexes
      await mongoose.connection.collection('reviews').createIndex({ merchantId: 1, status: 1 });
      await mongoose.connection.collection('reviews').createIndex({ productId: 1, rating: -1 });
      await mongoose.connection.collection('reviews').createIndex({ userId: 1, createdAt: -1 });

      // Notifications indexes
      await mongoose.connection.collection('notifications').createIndex({ merchantId: 1, read: 1 });
      await mongoose.connection.collection('notifications').createIndex({ createdAt: -1 });

      console.log('Completed: add-indexes');
    },
  },
  {
    name: 'add-product-variants',
    version: 3,
    up: async () => {
      console.log('Running: add-product-variants');
      await mongoose.connection.collection('products').updateMany(
        { variants: { $exists: false } },
        { $set: { variants: [] } }
      );
      console.log('Completed: add-product-variants');
    },
  },
  {
    name: 'add-merchant-analytics',
    version: 4,
    up: async () => {
      console.log('Running: add-merchant-analytics');
      await mongoose.connection.collection('merchants').updateMany(
        { analytics: { $exists: false } },
        {
          $set: {
            analytics: {
              totalOrders: 0,
              totalRevenue: 0,
              totalProducts: 0,
              averageRating: 0,
              totalReviews: 0,
            },
          },
        }
      );
      console.log('Completed: add-merchant-analytics');
    },
  },
  {
    name: 'add-product-stock-tracking',
    version: 5,
    up: async () => {
      console.log('Running: add-product-stock-tracking');
      await mongoose.connection.collection('products').updateMany(
        { stockTracking: { $exists: false } },
        {
          $set: {
            stockTracking: {
              enabled: true,
              currentStock: 0,
              lowStockThreshold: 10,
              notifyOnLowStock: true,
            },
          },
        }
      );
      console.log('Completed: add-product-stock-tracking');
    },
  },
];

class MigrationRunner {
  private db: mongoose.Connection;

  constructor() {
    this.db = mongoose.connection;
  }

  async connect() {
    const uri = process.env.MONGODB_URI;
    if (!uri) {
      throw new Error('MONGODB_URI not found in environment variables');
    }

    await mongoose.connect(uri);
    console.log('Connected to MongoDB');
  }

  async disconnect() {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }

  async getCurrentVersion(): Promise<number> {
    const migrationCollection = this.db.collection('migrations');
    const lastMigration = await migrationCollection
      .findOne({}, { sort: { version: -1 } });

    return lastMigration?.version || 0;
  }

  async recordMigration(migration: Migration) {
    await this.db.collection('migrations').insertOne({
      name: migration.name,
      version: migration.version,
      appliedAt: new Date(),
    });
  }

  async runMigrations() {
    try {
      const currentVersion = await this.getCurrentVersion();
      console.log(`Current migration version: ${currentVersion}`);

      const pendingMigrations = migrations.filter(
        (m) => m.version > currentVersion
      );

      if (pendingMigrations.length === 0) {
        console.log('No pending migrations');
        return;
      }

      console.log(`Found ${pendingMigrations.length} pending migrations`);

      for (const migration of pendingMigrations) {
        console.log(`\nApplying migration: ${migration.name} (v${migration.version})`);

        try {
          await migration.up();
          await this.recordMigration(migration);
          console.log(`✓ Successfully applied: ${migration.name}`);
        } catch (error) {
          console.error(`✗ Failed to apply migration: ${migration.name}`, error);
          throw error;
        }
      }

      console.log('\n✓ All migrations completed successfully');
    } catch (error) {
      console.error('Migration failed:', error);
      throw error;
    }
  }

  async rollback(steps: number = 1) {
    try {
      const currentVersion = await this.getCurrentVersion();
      console.log(`Current version: ${currentVersion}`);

      const migrationsToRollback = migrations
        .filter((m) => m.version <= currentVersion && m.version > currentVersion - steps)
        .sort((a, b) => b.version - a.version);

      for (const migration of migrationsToRollback) {
        if (!migration.down) {
          console.warn(`No rollback available for: ${migration.name}`);
          continue;
        }

        console.log(`Rolling back: ${migration.name}`);
        await migration.down();

        await this.db.collection('migrations').deleteOne({
          version: migration.version,
        });

        console.log(`✓ Rolled back: ${migration.name}`);
      }

      console.log('Rollback completed');
    } catch (error) {
      console.error('Rollback failed:', error);
      throw error;
    }
  }
}

async function main() {
  const runner = new MigrationRunner();

  try {
    await runner.connect();

    const command = process.argv[2];

    if (command === 'rollback') {
      const steps = parseInt(process.argv[3] || '1', 10);
      await runner.rollback(steps);
    } else {
      await runner.runMigrations();
    }

    await runner.disconnect();
    process.exit(0);
  } catch (error) {
    console.error('Migration error:', error);
    await runner.disconnect();
    process.exit(1);
  }
}

main();
