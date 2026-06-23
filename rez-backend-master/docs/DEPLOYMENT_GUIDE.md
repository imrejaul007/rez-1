# Production Deployment Guide

## Overview

This guide covers the complete process of deploying the REZ Merchant Backend to production, including infrastructure setup, configuration, and deployment procedures.

## Table of Contents
1. [Prerequisites](#prerequisites)
2. [Infrastructure Setup](#infrastructure-setup)
3. [Environment Configuration](#environment-configuration)
4. [Database Setup](#database-setup)
5. [Docker Setup](#docker-setup)
6. [Kubernetes Deployment](#kubernetes-deployment)
7. [CI/CD Pipeline](#cicd-pipeline)
8. [Post-Deployment](#post-deployment)
9. [Troubleshooting](#troubleshooting)

## Prerequisites

### Required Tools
- Docker Desktop (Windows/Mac) or Docker Engine (Linux)
- kubectl CLI
- AWS CLI or GCP Cloud SDK (for cloud deployments)
- Node.js 18+
- MongoDB client tools
- Git

### Installation

**Docker**
```bash
# Windows/Mac: Download from https://www.docker.com/products/docker-desktop

# Ubuntu
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
```

**kubectl**
```bash
# Windows (PowerShell)
choco install kubernetes-cli

# Mac
brew install kubectl

# Linux
curl -LO "https://dl.k8s.io/release/$(curl -L -s https://dl.k8s.io/release/stable.txt)/bin/linux/amd64/kubectl"
sudo install -o root -g root -m 0755 kubectl /usr/local/bin/kubectl
```

**AWS CLI** (if using AWS)
```bash
# Windows
choco install awscli

# Mac
brew install awscli

# Linux
curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip"
unzip awscliv2.zip
sudo ./aws/install
```

### Required Accounts
- Docker Hub account (for image registry)
- MongoDB Atlas account
- Redis Cloud account (or self-hosted)
- Cloudinary account
- SendGrid account
- Twilio account
- Razorpay account
- Sentry account
- Cloud provider account (AWS/GCP/Azure)

## Infrastructure Setup

### Option 1: AWS EKS

**Create EKS Cluster**
```bash
# Install eksctl
brew install eksctl  # Mac
choco install eksctl  # Windows

# Create cluster
eksctl create cluster \
  --name rez-production \
  --region us-east-1 \
  --nodegroup-name standard-workers \
  --node-type t3.medium \
  --nodes 3 \
  --nodes-min 3 \
  --nodes-max 10 \
  --managed

# Configure kubectl
aws eks update-kubeconfig --name rez-production --region us-east-1
```

### Option 2: GKE (Google Kubernetes Engine)

**Create GKE Cluster**
```bash
# Install gcloud
# Download from https://cloud.google.com/sdk/docs/install

# Create cluster
gcloud container clusters create rez-production \
  --zone us-central1-a \
  --num-nodes 3 \
  --machine-type n1-standard-2 \
  --enable-autoscaling \
  --min-nodes 3 \
  --max-nodes 10

# Configure kubectl
gcloud container clusters get-credentials rez-production --zone us-central1-a
```

### Option 3: Azure AKS

**Create AKS Cluster**
```bash
# Install Azure CLI
# Download from https://docs.microsoft.com/en-us/cli/azure/install-azure-cli

# Create resource group
az group create --name rez-production --location eastus

# Create cluster
az aks create \
  --resource-group rez-production \
  --name rez-cluster \
  --node-count 3 \
  --enable-cluster-autoscaler \
  --min-count 3 \
  --max-count 10 \
  --node-vm-size Standard_D2s_v3

# Configure kubectl
az aks get-credentials --resource-group rez-production --name rez-cluster
```

### Verify Kubernetes Setup

```bash
# Check cluster connection
kubectl cluster-info

# Check nodes
kubectl get nodes

# Create production namespace
kubectl create namespace production

# Set default namespace
kubectl config set-context --current --namespace=production
```

## Environment Configuration

### 1. Create Production Environment File

```bash
# Copy example file
cp .env.production.example .env.production

# Edit with your values
nano .env.production
```

### 2. Generate Secrets

```bash
# Generate JWT secrets
openssl rand -hex 32  # Copy this for JWT_SECRET
openssl rand -hex 32  # Copy this for JWT_MERCHANT_SECRET
openssl rand -hex 32  # Copy this for ENCRYPTION_KEY
openssl rand -hex 32  # Copy this for SESSION_SECRET
```

### 3. Configure External Services

**MongoDB Atlas**
1. Create account at https://cloud.mongodb.com
2. Create M30 cluster (or higher for production)
3. Configure network access (whitelist Kubernetes cluster IPs)
4. Create database user with appropriate permissions
5. Get connection string: `mongodb+srv://user:password@cluster.mongodb.net/rez`

**Redis Cloud**
1. Create account at https://redis.com/try-free
2. Create production database
3. Get connection details: `redis://password@host:port`

**Cloudinary**
1. Sign up at https://cloudinary.com
2. Get cloud name, API key, API secret from dashboard
3. Create upload presets for production

**SendGrid**
1. Create account at https://sendgrid.com
2. Create API key with Mail Send permissions
3. Verify sender email address

**Twilio**
1. Sign up at https://twilio.com
2. Get Account SID and Auth Token
3. Purchase phone number
4. Set up Verify service (for OTP)

**Razorpay**
1. Create account at https://razorpay.com
2. Switch to Live mode
3. Get API Key ID and Key Secret
4. Configure webhooks

**Sentry**
1. Create account at https://sentry.io
2. Create new project
3. Get DSN from project settings

## Database Setup

### 1. MongoDB Atlas Configuration

**Create Database**
```javascript
// Connect to MongoDB
mongosh "mongodb+srv://cluster.mongodb.net" --username admin

// Create database
use rez

// Create collections with validation
db.createCollection("merchants", {
  validator: {
    $jsonSchema: {
      bsonType: "object",
      required: ["email", "store"],
      properties: {
        email: { bsonType: "string" },
        store: { bsonType: "object" }
      }
    }
  }
})

// Create indexes
db.merchants.createIndex({ email: 1 }, { unique: true })
db.merchants.createIndex({ "store.slug": 1 })
db.products.createIndex({ merchantId: 1, status: 1 })
db.orders.createIndex({ merchantId: 1, status: 1 })
```

### 2. Run Migrations

```bash
# From local machine
MONGODB_URI="mongodb+srv://..." npm run migrate

# Or from Kubernetes pod
kubectl run migration \
  --rm -it \
  --image=rezapp/merchant-backend:latest \
  --env="MONGODB_URI=$MONGODB_URI" \
  --command -- npm run migrate
```

### 3. Create Database Backup

```bash
# Manual backup
mongodump --uri="mongodb+srv://..." --out=/backups/initial

# Configure automated backups in MongoDB Atlas
# Settings > Backup > Enable Cloud Backup
```

## Docker Setup

### 1. Build Docker Image

```bash
# Build image
docker build -t rezapp/merchant-backend:v1.0.0 .

# Tag as latest
docker tag rezapp/merchant-backend:v1.0.0 rezapp/merchant-backend:latest

# Test image locally
docker run -p 5001:5001 \
  -e NODE_ENV=production \
  -e MONGODB_URI=mongodb://localhost:27017/rez \
  rezapp/merchant-backend:latest
```

### 2. Push to Docker Registry

```bash
# Login to Docker Hub
docker login

# Push images
docker push rezapp/merchant-backend:v1.0.0
docker push rezapp/merchant-backend:latest

# Verify
docker pull rezapp/merchant-backend:latest
```

### 3. Test with Docker Compose (Local)

```bash
# Start all services
docker-compose up -d

# Check logs
docker-compose logs -f api

# Test API
curl http://localhost:5001/health

# Stop services
docker-compose down
```

## Kubernetes Deployment

### 1. Create Secrets

```bash
# Create secrets from .env file
kubectl create secret generic db-secrets \
  --from-literal=mongodb-uri="$MONGODB_URI" \
  -n production

kubectl create secret generic cache-secrets \
  --from-literal=redis-url="$REDIS_URL" \
  -n production

kubectl create secret generic auth-secrets \
  --from-literal=jwt-secret="$JWT_SECRET" \
  --from-literal=jwt-merchant-secret="$JWT_MERCHANT_SECRET" \
  -n production

kubectl create secret generic cloudinary-secrets \
  --from-literal=cloud-name="$CLOUDINARY_CLOUD_NAME" \
  --from-literal=api-key="$CLOUDINARY_API_KEY" \
  --from-literal=api-secret="$CLOUDINARY_API_SECRET" \
  -n production

kubectl create secret generic email-secrets \
  --from-literal=sendgrid-api-key="$SENDGRID_API_KEY" \
  -n production

kubectl create secret generic sms-secrets \
  --from-literal=twilio-account-sid="$TWILIO_ACCOUNT_SID" \
  --from-literal=twilio-auth-token="$TWILIO_AUTH_TOKEN" \
  -n production

kubectl create secret generic payment-secrets \
  --from-literal=razorpay-key-id="$RAZORPAY_KEY_ID" \
  --from-literal=razorpay-key-secret="$RAZORPAY_KEY_SECRET" \
  -n production
```

**Verify secrets**
```bash
kubectl get secrets -n production
kubectl describe secret db-secrets -n production
```

### 2. Deploy Application

```bash
# Apply deployment
kubectl apply -f k8s/deployment.yaml -n production

# Apply service
kubectl apply -f k8s/service.yaml -n production

# Apply HPA
kubectl apply -f k8s/hpa.yaml -n production

# Check deployment status
kubectl rollout status deployment/merchant-backend -n production

# Check pods
kubectl get pods -n production -l app=merchant-backend

# Check services
kubectl get svc -n production
```

### 3. Verify Deployment

```bash
# Check pod logs
kubectl logs -f deployment/merchant-backend -n production

# Get service external IP
kubectl get svc merchant-backend-service -n production

# Test health endpoint
curl http://<EXTERNAL-IP>/health

# Check resource usage
kubectl top pods -n production
```

### 4. Configure Ingress (Optional)

```yaml
# ingress.yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: merchant-backend-ingress
  annotations:
    cert-manager.io/cluster-issuer: letsencrypt-prod
    nginx.ingress.kubernetes.io/ssl-redirect: "true"
spec:
  tls:
  - hosts:
    - api.rezapp.com
    secretName: api-tls
  rules:
  - host: api.rezapp.com
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: merchant-backend-service
            port:
              number: 80
```

```bash
# Apply ingress
kubectl apply -f ingress.yaml -n production
```

## CI/CD Pipeline

### 1. Setup GitHub Secrets

Go to GitHub repository settings > Secrets and add:

- `DOCKER_USERNAME`: Docker Hub username
- `DOCKER_PASSWORD`: Docker Hub password
- `KUBE_CONFIG_STAGING`: Base64 encoded kubeconfig for staging
- `KUBE_CONFIG_PRODUCTION`: Base64 encoded kubeconfig for production

**Get kubeconfig**
```bash
# Get current kubeconfig
cat ~/.kube/config | base64

# Copy the output and add to GitHub secrets
```

### 2. Trigger Deployment

```bash
# Deployment happens automatically on push to main
git add .
git commit -m "feat: add new feature"
git push origin main

# Monitor deployment in GitHub Actions
# https://github.com/your-org/merchant-backend/actions
```

### 3. Manual Deployment

```bash
# Trigger workflow manually from GitHub UI
# Actions > Deploy to Production > Run workflow
```

## Post-Deployment

### 1. Verify All Services

**API Health**
```bash
curl https://api.rezapp.com/health
# Expected: {"status": "ok", "timestamp": "..."}
```

**Database Connection**
```bash
curl https://api.rezapp.com/api/merchants/profile
# Should return 401 (authentication required) not 500
```

**External Services**
- Upload test image to Cloudinary
- Send test email via SendGrid
- Send test SMS via Twilio
- Process test payment via Razorpay

### 2. Configure Monitoring

**Sentry**
```bash
# Verify errors are being captured
# Trigger a test error and check Sentry dashboard
```

**New Relic**
```bash
# Verify APM data is flowing
# Check New Relic dashboard for transactions
```

### 3. Setup Alerts

**Kubernetes Alerts**
```yaml
# alerting-rules.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: alerting-rules
data:
  rules.yaml: |
    groups:
    - name: merchant-backend
      interval: 30s
      rules:
      - alert: HighErrorRate
        expr: rate(http_requests_total{status=~"5.."}[5m]) > 0.05
        annotations:
          summary: "High error rate detected"
      - alert: HighResponseTime
        expr: histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m])) > 1
        annotations:
          summary: "High response time detected"
```

### 4. Test Critical Flows

- [ ] Merchant registration
- [ ] Merchant login
- [ ] Product creation
- [ ] Product update
- [ ] Order placement
- [ ] Payment processing
- [ ] Notification sending
- [ ] File upload

### 5. Performance Testing

```bash
# Install k6 (load testing tool)
# https://k6.io/docs/getting-started/installation/

# Run load test
k6 run loadtest.js

# Monitor during load test
kubectl top pods -n production
```

## Troubleshooting

### Issue: Pods not starting

```bash
# Check pod status
kubectl get pods -n production

# Describe pod
kubectl describe pod <pod-name> -n production

# Check logs
kubectl logs <pod-name> -n production

# Common causes:
# - Image pull errors (check image name/tag)
# - Missing secrets
# - Resource limits too low
# - Failed health checks
```

### Issue: Can't connect to database

```bash
# Check secrets
kubectl get secret db-secrets -n production -o yaml

# Test connection from pod
kubectl exec -it <pod-name> -n production -- \
  node -e "require('mongoose').connect(process.env.MONGODB_URI).then(() => console.log('Connected'))"

# Common causes:
# - Wrong connection string
# - Network access not whitelisted
# - Wrong credentials
```

### Issue: Service not accessible

```bash
# Check service
kubectl get svc merchant-backend-service -n production

# Check endpoints
kubectl get endpoints merchant-backend-service -n production

# Check ingress (if using)
kubectl get ingress -n production

# Common causes:
# - Service selector doesn't match pod labels
# - No healthy pods (check readiness probe)
# - Firewall blocking traffic
```

### Issue: High CPU/Memory usage

```bash
# Check resource usage
kubectl top pods -n production

# Increase resources
kubectl set resources deployment merchant-backend \
  --limits=cpu=2000m,memory=2Gi \
  --requests=cpu=1000m,memory=1Gi \
  -n production

# Scale horizontally
kubectl scale deployment merchant-backend --replicas=5 -n production
```

## Additional Resources

- [Kubernetes Documentation](https://kubernetes.io/docs/)
- [Docker Documentation](https://docs.docker.com/)
- [MongoDB Atlas Documentation](https://docs.atlas.mongodb.com/)
- [Production Runbook](./PRODUCTION_RUNBOOK.md)
- [Rollback Guide](./ROLLBACK_GUIDE.md)
- [Deployment Checklist](./DEPLOYMENT_CHECKLIST.md)

## Support

For deployment issues:
- Slack: #devops channel
- Email: devops@rezapp.com
- On-call: See [PRODUCTION_RUNBOOK.md](./PRODUCTION_RUNBOOK.md)
