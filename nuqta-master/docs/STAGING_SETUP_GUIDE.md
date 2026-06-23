# STAGING ENVIRONMENT SETUP GUIDE

> **Purpose**: Complete guide for setting up and deploying REZ App to staging environment
>
> **Target Audience**: DevOps Engineers, Backend/Frontend Developers
>
> **Last Updated**: 2025-11-15

---

## Table of Contents

1. [Infrastructure Requirements](#1-infrastructure-requirements)
2. [Environment Configuration](#2-environment-configuration)
3. [Database Setup for Staging](#3-database-setup-for-staging)
4. [Backend API Configuration](#4-backend-api-configuration)
5. [Frontend Build Configuration](#5-frontend-build-configuration)
6. [Testing on Staging](#6-testing-on-staging)
7. [Troubleshooting](#7-troubleshooting)

---

## 1. Infrastructure Requirements

### 1.1 Server Specifications

**Minimum Requirements for Staging:**

| Component | Specification |
|-----------|--------------|
| **Backend Server** | 2 vCPU, 4GB RAM, 50GB SSD |
| **Database Server** | 2 vCPU, 4GB RAM, 100GB SSD |
| **Redis Server** | 1 vCPU, 2GB RAM, 20GB SSD |
| **OS** | Ubuntu 22.04 LTS or Amazon Linux 2 |
| **Node.js** | v18.x or v20.x LTS |

**Recommended Cloud Providers:**
- AWS (EC2, RDS, ElastiCache)
- Google Cloud Platform (Compute Engine, Cloud SQL)
- DigitalOcean (Droplets, Managed Databases)
- Heroku (Hobby/Standard Dynos)

### 1.2 Infrastructure Setup

#### Option A: AWS Setup

**1. Backend Server (EC2):**
```bash
# Launch EC2 instance
Instance Type: t3.medium (2 vCPU, 4GB RAM)
AMI: Ubuntu Server 22.04 LTS
Storage: 50GB gp3
Security Group: staging-backend-sg
```

**Security Group Rules:**
```
Inbound:
- Port 22 (SSH) from your IP
- Port 5001 (API) from frontend IP/load balancer
- Port 443 (HTTPS) from 0.0.0.0/0

Outbound:
- All traffic
```

**2. Database (MongoDB Atlas or RDS):**
```bash
# MongoDB Atlas (Recommended)
Cluster Tier: M10 (2GB RAM)
Region: Same as backend server
Backup: Enabled (continuous)
Version: MongoDB 6.0+

# Or use AWS DocumentDB
Instance Type: db.t3.medium
Storage: 100GB
```

**3. Redis (ElastiCache):**
```bash
Node Type: cache.t3.micro
Engine: Redis 7.x
Replicas: 1 (for HA)
```

**4. Load Balancer (ALB - Optional):**
```bash
Type: Application Load Balancer
Scheme: Internet-facing
Listeners: HTTP (80) → HTTPS (443)
Target Group: backend-staging
Health Check: /api/health
```

#### Option B: DigitalOcean Setup

**1. Create Droplets:**
```bash
# Backend Droplet
Size: s-2vcpu-4gb ($24/month)
Image: Ubuntu 22.04 LTS
Region: Choose closest to users
Backups: Enabled

# Frontend Hosting
Use DigitalOcean App Platform or Static Sites
```

**2. Managed Database:**
```bash
# MongoDB
Database: MongoDB 6
Size: db-s-2vcpu-4gb
Nodes: 1 (primary)
Connection Pool Size: 25
```

**3. Managed Redis:**
```bash
Size: db-s-1vcpu-1gb
Version: Redis 7
```

### 1.3 Domain & SSL Setup

**1. Domain Configuration:**
```bash
# Purchase or use subdomain
Staging Backend: staging-api.rezapp.com
Staging Frontend: staging.rezapp.com
```

**2. DNS Records (CloudFlare/Route53):**
```
A     staging-api.rezapp.com     → Backend IP
A     staging.rezapp.com         → Frontend IP/CDN
CNAME www.staging.rezapp.com    → staging.rezapp.com
```

**3. SSL Certificates:**
```bash
# Option 1: Let's Encrypt (Free)
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d staging-api.rezapp.com

# Option 2: AWS Certificate Manager (Free for AWS services)
Request certificate for *.rezapp.com

# Option 3: CloudFlare (Free SSL)
Enable "Full (strict)" SSL mode
```

---

## 2. Environment Configuration

### 2.1 Backend Environment Setup

**Connect to Backend Server:**
```bash
ssh -i staging-key.pem ubuntu@staging-api.rezapp.com
```

**Install Dependencies:**
```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js 20.x
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Verify installation
node --version  # Should show v20.x
npm --version

# Install PM2 (Process Manager)
sudo npm install -g pm2

# Install Git
sudo apt install -y git

# Install build essentials
sudo apt install -y build-essential
```

**Clone Repository:**
```bash
# Create app directory
sudo mkdir -p /var/www/rez-app
sudo chown -R ubuntu:ubuntu /var/www/rez-app
cd /var/www/rez-app

# Clone code
git clone https://github.com/your-org/rez-app.git .
cd user-backend

# Install dependencies
npm install --production
```

**Create Environment File:**
```bash
# Create .env.staging file
nano .env.staging
```

**Staging Environment Variables:**
```bash
# ================================================
# STAGING ENVIRONMENT CONFIGURATION
# ================================================

# Application
NODE_ENV=staging
PORT=5001
API_VERSION=v1
APP_NAME=REZ App (Staging)

# Database
MONGODB_URI=mongodb+srv://staging_user:PASSWORD@staging-cluster.mongodb.net/rez_staging?retryWrites=true&w=majority
MONGODB_DB_NAME=rez_staging
MONGODB_MAX_POOL_SIZE=50

# Authentication
JWT_SECRET=staging_jwt_secret_256_bits_minimum_change_this
JWT_REFRESH_SECRET=staging_refresh_secret_256_bits_change_this
JWT_EXPIRY=24h
REFRESH_TOKEN_EXPIRY=7d
BCRYPT_ROUNDS=12

# Payment Gateways (TEST KEYS)
STRIPE_SECRET_KEY=sk_test_YOUR_STAGING_KEY
STRIPE_WEBHOOK_SECRET=whsec_YOUR_STAGING_SECRET
STRIPE_PUBLISHABLE_KEY=pk_test_YOUR_STAGING_KEY
RAZORPAY_KEY_ID=rzp_test_YOUR_STAGING_KEY
RAZORPAY_KEY_SECRET=YOUR_STAGING_SECRET

# Cloudinary
CLOUDINARY_CLOUD_NAME=rez-staging
CLOUDINARY_API_KEY=YOUR_STAGING_KEY
CLOUDINARY_API_SECRET=YOUR_STAGING_SECRET

# Google Services
GOOGLE_MAPS_API_KEY=YOUR_STAGING_KEY
GOOGLE_PLACES_API_KEY=YOUR_STAGING_KEY
FIREBASE_SERVER_KEY=YOUR_STAGING_KEY

# Twilio (SMS)
TWILIO_ACCOUNT_SID=YOUR_STAGING_SID
TWILIO_AUTH_TOKEN=YOUR_STAGING_TOKEN
TWILIO_PHONE_NUMBER=+1234567890

# Email (SendGrid)
SENDGRID_API_KEY=YOUR_STAGING_KEY
FROM_EMAIL=staging@rezapp.com

# Redis
REDIS_URL=redis://staging-redis.abc123.ng.0001.use1.cache.amazonaws.com:6379

# CORS
CORS_ORIGIN=https://staging.rezapp.com,http://localhost:8081

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# Logging & Monitoring
LOG_LEVEL=debug
SENTRY_DSN=https://YOUR_STAGING_DSN@sentry.io/PROJECT_ID
SENTRY_ENVIRONMENT=staging

# Feature Flags
ENABLE_ANALYTICS=true
ENABLE_DEBUG_LOGGING=true
```

**Set File Permissions:**
```bash
chmod 600 .env.staging
```

### 2.2 Frontend Environment Setup

**Create Frontend Environment File:**
```bash
# In frontend directory
nano .env.staging
```

**Staging Frontend Variables:**
```bash
# Application
EXPO_PUBLIC_APP_NAME=REZ App (Staging)
EXPO_PUBLIC_APP_VERSION=1.0.0-staging
EXPO_PUBLIC_ENVIRONMENT=staging

# Backend API
EXPO_PUBLIC_API_BASE_URL=https://staging-api.rezapp.com/api
EXPO_PUBLIC_API_TIMEOUT=30000

# Authentication
EXPO_PUBLIC_JWT_STORAGE_KEY=rez_staging_token
EXPO_PUBLIC_REFRESH_TOKEN_KEY=rez_staging_refresh
EXPO_PUBLIC_SESSION_TIMEOUT=1440

# Payment (TEST KEYS)
EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_YOUR_STAGING_KEY
EXPO_PUBLIC_RAZORPAY_KEY_ID=rzp_test_YOUR_STAGING_KEY

# Cloudinary
EXPO_PUBLIC_CLOUDINARY_CLOUD_NAME=rez-staging
EXPO_PUBLIC_CLOUDINARY_UGC_PRESET=staging_ugc_videos
EXPO_PUBLIC_CLOUDINARY_PROFILE_PRESET=staging_profile_images

# Google Maps
EXPO_PUBLIC_GOOGLE_MAPS_API_KEY=YOUR_STAGING_KEY

# Analytics (STAGING PROJECTS)
EXPO_PUBLIC_GA_TRACKING_ID=UA-STAGING-ID
EXPO_PUBLIC_SENTRY_DSN=https://YOUR_STAGING_DSN@sentry.io/STAGING_PROJECT
EXPO_PUBLIC_MIXPANEL_TOKEN=YOUR_STAGING_TOKEN

# Feature Flags
EXPO_PUBLIC_ENABLE_ANALYTICS=true
EXPO_PUBLIC_ENABLE_CRASH_REPORTING=true
EXPO_PUBLIC_DEBUG_MODE=true
EXPO_PUBLIC_MOCK_API=false
EXPO_PUBLIC_LOG_LEVEL=debug
```

---

## 3. Database Setup for Staging

### 3.1 MongoDB Atlas Setup

**1. Create Staging Cluster:**
```bash
1. Go to MongoDB Atlas (cloud.mongodb.com)
2. Create new cluster: "rez-staging"
3. Choose M10 tier (2GB RAM)
4. Select same region as backend
5. Create database user: staging_user (strong password)
6. Whitelist backend server IP
```

**2. Database Configuration:**
```bash
# Connect to cluster via mongosh
mongosh "mongodb+srv://staging-cluster.mongodb.net" --username staging_user

# Create database
use rez_staging

# Create collections with validation
db.createCollection("users", {
  validator: {
    $jsonSchema: {
      bsonType: "object",
      required: ["email", "password", "createdAt"],
      properties: {
        email: { bsonType: "string", pattern: "^.+@.+\..+$" },
        password: { bsonType: "string" },
        createdAt: { bsonType: "date" }
      }
    }
  }
})

# Create indexes (run all index commands from PRE_DEPLOYMENT_CHECKLIST.md)
db.users.createIndex({ email: 1 }, { unique: true })
db.products.createIndex({ sku: 1 }, { unique: true })
# ... (create all required indexes)
```

### 3.2 Seed Staging Data

**Run Seeding Scripts:**
```bash
cd /var/www/rez-app/user-backend

# Load staging environment
export $(cat .env.staging | xargs)

# Seed essential data
npm run seed:critical     # Users, categories, system data
npm run seed:products     # Sample products
npm run seed:stores       # Sample stores
npm run seed:orders       # Sample orders (optional)

# Verify seeding
mongosh "$MONGODB_URI" --eval "
  use rez_staging
  db.users.countDocuments()
  db.products.countDocuments()
  db.stores.countDocuments()
"
```

### 3.3 Database Backup Configuration

**Setup Automated Backups:**
```bash
# MongoDB Atlas: Enable Continuous Backups
1. Go to cluster settings
2. Enable "Continuous Backup"
3. Set retention: 7 days
4. Configure point-in-time recovery

# Manual backup script (backup.sh)
#!/bin/bash
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/var/backups/mongodb"
mkdir -p $BACKUP_DIR

mongodump --uri="$MONGODB_URI" --out="$BACKUP_DIR/backup_$TIMESTAMP"
tar -czf "$BACKUP_DIR/backup_$TIMESTAMP.tar.gz" "$BACKUP_DIR/backup_$TIMESTAMP"
rm -rf "$BACKUP_DIR/backup_$TIMESTAMP"

# Keep only last 7 days of backups
find $BACKUP_DIR -name "backup_*.tar.gz" -mtime +7 -delete
```

**Schedule Backups (Cron):**
```bash
# Add to crontab
crontab -e

# Add this line (backup daily at 2 AM)
0 2 * * * /var/www/rez-app/scripts/backup.sh
```

---

## 4. Backend API Configuration

### 4.1 Build Backend

**Compile TypeScript:**
```bash
cd /var/www/rez-app/user-backend

# Build production bundle
npm run build

# Verify build
ls -la dist/
```

### 4.2 Start Backend with PM2

**Create PM2 Ecosystem File:**
```bash
nano ecosystem.config.js
```

```javascript
module.exports = {
  apps: [{
    name: 'rez-api-staging',
    script: './dist/server.js',
    instances: 2,
    exec_mode: 'cluster',
    env_staging: {
      NODE_ENV: 'staging',
      PORT: 5001
    },
    env_file: '.env.staging',
    error_file: './logs/err.log',
    out_file: './logs/out.log',
    log_file: './logs/combined.log',
    time: true,
    max_memory_restart: '500M',
    restart_delay: 4000,
    autorestart: true,
    watch: false,
    max_restarts: 10,
    min_uptime: '10s'
  }]
};
```

**Start Application:**
```bash
# Create logs directory
mkdir -p logs

# Start with PM2
pm2 start ecosystem.config.js --env staging

# Save PM2 configuration
pm2 save

# Setup PM2 startup script
pm2 startup
# Run the command it outputs

# Monitor
pm2 monit
pm2 logs rez-api-staging
```

**PM2 Useful Commands:**
```bash
pm2 status                    # Check status
pm2 restart rez-api-staging   # Restart app
pm2 stop rez-api-staging      # Stop app
pm2 logs rez-api-staging      # View logs
pm2 flush                     # Clear logs
pm2 delete rez-api-staging    # Remove from PM2
```

### 4.3 Configure Nginx Reverse Proxy

**Install Nginx:**
```bash
sudo apt install -y nginx
```

**Create Nginx Configuration:**
```bash
sudo nano /etc/nginx/sites-available/staging-api.rezapp.com
```

```nginx
# Upstream backend servers
upstream backend {
    least_conn;
    server localhost:5001;
}

# HTTP -> HTTPS redirect
server {
    listen 80;
    server_name staging-api.rezapp.com;

    location /.well-known/acme-challenge/ {
        root /var/www/certbot;
    }

    location / {
        return 301 https://$server_name$request_uri;
    }
}

# HTTPS server
server {
    listen 443 ssl http2;
    server_name staging-api.rezapp.com;

    # SSL Configuration
    ssl_certificate /etc/letsencrypt/live/staging-api.rezapp.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/staging-api.rezapp.com/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;

    # Security Headers
    add_header X-Frame-Options "DENY" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;

    # Logging
    access_log /var/log/nginx/staging-api-access.log;
    error_log /var/log/nginx/staging-api-error.log;

    # Rate Limiting
    limit_req_zone $binary_remote_addr zone=api_limit:10m rate=10r/s;
    limit_req zone=api_limit burst=20 nodelay;

    # Client Body Size (for uploads)
    client_max_body_size 100M;

    # Timeouts
    proxy_connect_timeout 60s;
    proxy_send_timeout 60s;
    proxy_read_timeout 60s;

    # API endpoints
    location /api {
        proxy_pass http://backend;
        proxy_http_version 1.1;

        # Headers
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        proxy_cache_bypass $http_upgrade;
    }

    # WebSocket support (Socket.io)
    location /socket.io {
        proxy_pass http://backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    # Health check endpoint (bypass rate limit)
    location /api/health {
        limit_req off;
        proxy_pass http://backend;
    }
}
```

**Enable Site:**
```bash
# Test configuration
sudo nginx -t

# Enable site
sudo ln -s /etc/nginx/sites-available/staging-api.rezapp.com /etc/nginx/sites-enabled/

# Reload Nginx
sudo systemctl reload nginx

# Enable autostart
sudo systemctl enable nginx
```

### 4.4 Setup SSL Certificate

```bash
# Install Certbot
sudo apt install certbot python3-certbot-nginx

# Obtain certificate
sudo certbot --nginx -d staging-api.rezapp.com

# Test auto-renewal
sudo certbot renew --dry-run

# Certificates auto-renew via cron
sudo systemctl status certbot.timer
```

---

## 5. Frontend Build Configuration

### 5.1 Web Deployment

**Build for Web:**
```bash
cd /var/www/rez-app/frontend

# Load staging environment
export $(cat .env.staging | xargs)

# Build static web version
npx expo export:web

# Output will be in web-build/
```

**Deploy to Static Hosting:**

**Option 1: Nginx (Same server):**
```bash
# Copy build to nginx directory
sudo cp -r web-build /var/www/staging.rezapp.com

# Create Nginx config
sudo nano /etc/nginx/sites-available/staging.rezapp.com
```

```nginx
server {
    listen 80;
    server_name staging.rezapp.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name staging.rezapp.com;

    ssl_certificate /etc/letsencrypt/live/staging.rezapp.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/staging.rezapp.com/privkey.pem;

    root /var/www/staging.rezapp.com;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    location ~* \.(js|css|png|jpg|jpeg|gif|svg|ico|woff|woff2|ttf|eot)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
```

**Option 2: Vercel:**
```bash
npm install -g vercel
cd web-build
vercel --prod
```

**Option 3: Netlify:**
```bash
npm install -g netlify-cli
cd web-build
netlify deploy --prod
```

### 5.2 Mobile App (TestFlight/Internal Testing)

**iOS (TestFlight):**
```bash
cd frontend

# Build for iOS
eas build --platform ios --profile staging

# Submit to TestFlight
eas submit --platform ios --profile staging
```

**Android (Internal Testing):**
```bash
# Build for Android
eas build --platform android --profile staging

# Submit to Google Play Internal Testing
eas submit --platform android --profile staging
```

**Configure app.json for Staging:**
```json
{
  "expo": {
    "name": "REZ App (Staging)",
    "slug": "rez-app-staging",
    "version": "1.0.0",
    "scheme": "rezstaging",
    "ios": {
      "bundleIdentifier": "com.rezapp.staging"
    },
    "android": {
      "package": "com.rezapp.staging"
    }
  }
}
```

---

## 6. Testing on Staging

### 6.1 Health Checks

**1. Backend Health:**
```bash
# Basic health check
curl https://staging-api.rezapp.com/api/health

# Expected response:
{
  "status": "ok",
  "timestamp": "2025-11-15T10:30:00.000Z",
  "environment": "staging"
}

# Database health
curl https://staging-api.rezapp.com/api/health/db

# Redis health
curl https://staging-api.rezapp.com/api/health/redis
```

**2. Frontend Health:**
```bash
# Check web app loads
curl -I https://staging.rezapp.com

# Should return 200 OK
```

### 6.2 Smoke Tests

**Run automated smoke tests:**
```bash
cd frontend
npm run test:smoke:staging
```

**See SMOKE_TEST_SUITE.md for detailed test cases.**

### 6.3 Manual Testing Checklist

- [ ] Registration flow works
- [ ] Login works
- [ ] Browse products
- [ ] Add to cart
- [ ] Checkout (test payment)
- [ ] View orders
- [ ] Upload content
- [ ] Receive notifications
- [ ] Search functionality

### 6.4 Performance Testing

```bash
# Load test API
artillery quick --count 50 --num 5 https://staging-api.rezapp.com/api/products

# Expected: p95 < 500ms
```

### 6.5 Monitoring Setup

**1. PM2 Monitoring:**
```bash
pm2 install pm2-logrotate
pm2 set pm2-logrotate:max_size 100M
pm2 set pm2-logrotate:retain 7
```

**2. Server Monitoring:**
```bash
# Install monitoring tools
sudo apt install htop iotop nethogs

# Monitor resources
htop
```

**3. Application Monitoring:**
- Enable Sentry error tracking
- Setup log aggregation (CloudWatch/Papertrail)
- Configure uptime monitoring (UptimeRobot)

---

## 7. Troubleshooting

### 7.1 Common Issues

**Issue: Backend won't start**
```bash
# Check PM2 logs
pm2 logs rez-api-staging --lines 100

# Check environment variables
pm2 env rez-api-staging

# Restart
pm2 restart rez-api-staging
```

**Issue: Database connection fails**
```bash
# Test MongoDB connection
mongosh "$MONGODB_URI" --eval "db.adminCommand('ping')"

# Check network connectivity
telnet staging-cluster.mongodb.net 27017
```

**Issue: 502 Bad Gateway**
```bash
# Check if backend is running
pm2 status

# Check Nginx logs
sudo tail -f /var/log/nginx/error.log

# Verify upstream
curl http://localhost:5001/api/health
```

**Issue: SSL certificate errors**
```bash
# Check certificate validity
sudo certbot certificates

# Renew certificate
sudo certbot renew

# Reload Nginx
sudo systemctl reload nginx
```

### 7.2 Logs Location

```bash
# Application logs
/var/www/rez-app/user-backend/logs/

# Nginx logs
/var/log/nginx/staging-api-access.log
/var/log/nginx/staging-api-error.log

# PM2 logs
~/.pm2/logs/

# System logs
/var/log/syslog
```

### 7.3 Emergency Procedures

**Rollback Backend:**
```bash
cd /var/www/rez-app/user-backend
git checkout previous-stable-commit
npm install
npm run build
pm2 restart rez-api-staging
```

**Take Database Snapshot:**
```bash
mongodump --uri="$MONGODB_URI" --out=/tmp/emergency-backup
```

---

## Next Steps

After staging environment is setup and tested:

1. Run full **SMOKE_TEST_SUITE.md**
2. Conduct user acceptance testing (UAT)
3. Performance testing with realistic load
4. Security penetration testing
5. If all tests pass, proceed to production using **GO_LIVE_CHECKLIST.md**

---

**Document Version**: 1.0.0
**Last Updated**: 2025-11-15
**Maintained By**: DevOps Team
