# Package.json Script Additions

Add these scripts to your `user-backend/package.json` for easier video seeding:

## Recommended Scripts

```json
{
  "scripts": {
    // ... existing scripts ...

    // Video Seeding Scripts
    "seed:videos": "node src/scripts/seed-videos.js",
    "verify:videos": "node src/scripts/verify-seeded-videos.js",
    "test:video-api": "node src/scripts/test-video-api.js",

    // Combined workflows
    "seed:videos:full": "npm run seed:videos && npm run verify:videos",
    "test:videos:complete": "npm run seed:videos && npm run verify:videos && npm run test:video-api",

    // Convenience aliases
    "videos:seed": "npm run seed:videos",
    "videos:verify": "npm run verify:videos",
    "videos:test": "npm run test:video-api",
    "videos:all": "npm run test:videos:complete"
  }
}
```

## Usage After Adding Scripts

### Quick Commands

```bash
# Seed videos
npm run seed:videos

# Verify seeded videos
npm run verify:videos

# Test video API
npm run test:video-api
```

### Workflow Commands

```bash
# Seed and verify
npm run seed:videos:full

# Complete workflow (seed + verify + test)
npm run test:videos:complete

# Or use aliases
npm run videos:all
```

### Development Workflow

```bash
# 1. Start backend
npm run dev

# 2. In another terminal, seed videos
npm run seed:videos

# 3. Verify
npm run verify:videos

# 4. Test API (optional)
npm run test:video-api
```

## Complete package.json Example

```json
{
  "name": "rez-backend",
  "version": "1.0.0",
  "scripts": {
    "dev": "nodemon src/server.ts",
    "build": "tsc",
    "start": "node dist/server.js",

    // Database seeding
    "seed:users": "ts-node src/scripts/seedDatabase.ts",
    "seed:products": "ts-node src/scripts/seedProducts.ts",
    "seed:stores": "ts-node src/scripts/seedStores.ts",
    "seed:videos": "node src/scripts/seed-videos.js",

    // Video-specific scripts
    "verify:videos": "node src/scripts/verify-seeded-videos.js",
    "test:video-api": "node src/scripts/test-video-api.js",

    // Combined workflows
    "seed:all": "npm run seed:users && npm run seed:products && npm run seed:stores && npm run seed:videos",
    "seed:videos:full": "npm run seed:videos && npm run verify:videos",
    "test:videos:complete": "npm run seed:videos && npm run verify:videos && npm run test:video-api",

    // Convenience aliases
    "videos:seed": "npm run seed:videos",
    "videos:verify": "npm run verify:videos",
    "videos:test": "npm run test:video-api",
    "videos:all": "npm run test:videos:complete"
  },
  "dependencies": {
    "mongoose": "^7.0.0",
    "cloudinary": "^1.40.0",
    "axios": "^1.6.0"
    // ... other dependencies
  }
}
```
