# Mock API Setup for Maestro Tests

Maestro doesn't have built-in network mocking like Detox. Here are the recommended approaches:

## Option 1: Test Backend Mode (Recommended)

Run the real backend in `NODE_ENV=test` with a separate test database. Seed known data before tests.

### Setup:
```bash
# Start backend in test mode
NODE_ENV=test \
MONGODB_URI=mongodb://localhost:27017/nuqta_test \
REDIS_URL=redis://localhost:6379 \
DISABLE_RATE_LIMIT=true \
npm start
```

### Seed script (`rez-backend/scripts/seedTestData.ts`):
```typescript
import mongoose from 'mongoose';
import User from '../src/models/User';
import Store from '../src/models/Store';
import Product from '../src/models/Product';
import Category from '../src/models/Category';
import Wallet from '../src/models/Wallet';

async function seed() {
  await mongoose.connect(process.env.MONGODB_URI!);

  // Clear test DB
  await Promise.all([
    User.deleteMany({}),
    Store.deleteMany({}),
    Product.deleteMany({}),
    Category.deleteMany({}),
    Wallet.deleteMany({}),
  ]);

  // Create test user (OTP bypass: 123456 in test mode)
  const user = await User.create({
    phoneNumber: '+971501234567',
    fullName: 'Test User',
    email: 'test@nuqta.app',
    isOnboarded: true,
    isVerified: true,
  });

  // Create test wallet with balance
  await Wallet.create({
    userId: user._id,
    balance: { available: 5000, pending: 0, cashback: 0, total: 5000 },
  });

  // Create test category
  const category = await Category.create({
    name: 'Fitness',
    slug: 'fitness',
    icon: 'fitness',
    isActive: true,
  });

  // Create test store
  const store = await Store.create({
    name: 'Test Fitness Studio',
    category: category._id,
    isActive: true,
    location: { type: 'Point', coordinates: [55.2708, 25.2048] }, // Dubai
  });

  // Create test products
  await Product.create([
    {
      name: 'Test Protein Shake',
      store: store._id,
      category: category._id,
      pricing: { selling: 150, original: 200, currency: 'RC', discount: 25 },
      stock: { available: 100 },
      isActive: true,
    },
    {
      name: 'Test Yoga Mat',
      store: store._id,
      category: category._id,
      pricing: { selling: 300, original: 400, currency: 'RC', discount: 25 },
      stock: { available: 50 },
      isActive: true,
    },
  ]);

  console.log('Test data seeded successfully');
  process.exit(0);
}

seed().catch(console.error);
```

### Run before tests:
```bash
cd rez-backend && npx ts-node scripts/seedTestData.ts
```

## Option 2: Maestro Mock Server (Experimental)

Maestro supports a basic mock server via JavaScript:

```yaml
# In your flow YAML, set env vars
env:
  API_BASE_URL: "http://localhost:9999"

# Start mock server before tests
# maestro-mock-server.js (run separately)
```

This is more fragile than Option 1 and not recommended for this app's complexity.

## Option 3: Proxy Intercept (Advanced)

Use tools like `mitmproxy` or `mockoon` to intercept and mock network calls:

```bash
# Install mockoon CLI
npm install -g @mockoon/cli

# Create environment file with mock routes
mockoon-cli start --data ./mock-api-env.json --port 9999

# Point app at mock server
EXPO_PUBLIC_API_URL=http://localhost:9999/api expo start
```

## Recommended Test Strategy

1. **CI/CD**: Use Option 1 (real backend + test DB). Most reliable.
2. **Local dev**: Also Option 1 with `DISABLE_RATE_LIMIT=true`.
3. **Flaky test protection**: Add `retryTapIfNoChange: true` and generous timeouts.
4. **Test data isolation**: Each test run seeds fresh data. Use `clearState` in Maestro to reset app state.
5. **OTP bypass**: Backend already supports demo OTP `123456` in non-production mode.
