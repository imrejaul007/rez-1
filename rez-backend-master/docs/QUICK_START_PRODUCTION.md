# Quick Start: Production Deployment

## TL;DR - Deploy in 30 Minutes

This guide will get you from zero to production in about 30 minutes.

## Prerequisites (5 minutes)

Install required tools:

```bash
# macOS
brew install kubectl docker

# Windows (using Chocolatey)
choco install kubernetes-cli docker-desktop

# Ubuntu
sudo snap install kubectl --classic
sudo apt-get install docker.io
```

## Step 1: Setup External Services (10 minutes)

### MongoDB Atlas
1. Go to https://cloud.mongodb.com
2. Create M30 cluster (production tier)
3. Get connection string: `mongodb+srv://user:pass@cluster.mongodb.net/rez`

### Redis Cloud
1. Go to https://redis.com/try-free
2. Create production database
3. Get URL: `redis://password@host:port`

### Other Services (Quick Signup)
- Cloudinary: https://cloudinary.com (get cloud name, API key, secret)
- SendGrid: https://sendgrid.com (get API key)
- Twilio: https://twilio.com (get SID, auth token)
- Razorpay: https://razorpay.com (switch to live mode, get keys)
- Sentry: https://sentry.io (create project, get DSN)

## Step 2: Configure Environment (3 minutes)

```bash
# Copy example file
cp .env.production.example .env.production

# Generate secrets
openssl rand -hex 32  # JWT_SECRET
openssl rand -hex 32  # JWT_MERCHANT_SECRET

# Edit .env.production with your values
nano .env.production
```

**Minimum required variables:**
```env
NODE_ENV=production
PORT=5001
MONGODB_URI=mongodb+srv://...
REDIS_URL=redis://...
JWT_SECRET=your-generated-secret
JWT_MERCHANT_SECRET=your-generated-secret
CLOUDINARY_CLOUD_NAME=...
CLOUDINARY_API_KEY=...
CLOUDINARY_API_SECRET=...
```

## Step 3: Setup Kubernetes (5 minutes)

Choose your cloud provider:

### AWS EKS (Fastest)
```bash
eksctl create cluster \
  --name rez-production \
  --region us-east-1 \
  --nodes 3 \
  --nodes-min 3 \
  --nodes-max 10
```

### GCP GKE
```bash
gcloud container clusters create rez-production \
  --zone us-central1-a \
  --num-nodes 3 \
  --enable-autoscaling \
  --min-nodes 3 \
  --max-nodes 10
```

### Create namespace
```bash
kubectl create namespace production
kubectl config set-context --current --namespace=production
```

## Step 4: Create Secrets (2 minutes)

```bash
# Load environment variables
source .env.production

# Create all secrets
kubectl create secret generic db-secrets \
  --from-literal=mongodb-uri="$MONGODB_URI"

kubectl create secret generic cache-secrets \
  --from-literal=redis-url="$REDIS_URL"

kubectl create secret generic auth-secrets \
  --from-literal=jwt-secret="$JWT_SECRET" \
  --from-literal=jwt-merchant-secret="$JWT_MERCHANT_SECRET"

kubectl create secret generic cloudinary-secrets \
  --from-literal=cloud-name="$CLOUDINARY_CLOUD_NAME" \
  --from-literal=api-key="$CLOUDINARY_API_KEY" \
  --from-literal=api-secret="$CLOUDINARY_API_SECRET"

# Optional but recommended
kubectl create secret generic email-secrets \
  --from-literal=sendgrid-api-key="$SENDGRID_API_KEY"

kubectl create secret generic sms-secrets \
  --from-literal=twilio-account-sid="$TWILIO_ACCOUNT_SID" \
  --from-literal=twilio-auth-token="$TWILIO_AUTH_TOKEN"

kubectl create secret generic payment-secrets \
  --from-literal=razorpay-key-id="$RAZORPAY_KEY_ID" \
  --from-literal=razorpay-key-secret="$RAZORPAY_KEY_SECRET"
```

## Step 5: Deploy Application (3 minutes)

```bash
# Build and push Docker image
npm run docker:build
docker tag rezapp/merchant-backend:latest rezapp/merchant-backend:v1.0.0
docker push rezapp/merchant-backend:v1.0.0
docker push rezapp/merchant-backend:latest

# Deploy to Kubernetes
kubectl apply -f k8s/deployment.yaml
kubectl apply -f k8s/service.yaml
kubectl apply -f k8s/hpa.yaml

# Wait for deployment
kubectl rollout status deployment/merchant-backend
```

## Step 6: Verify Deployment (2 minutes)

```bash
# Check pods
kubectl get pods

# Should see:
# NAME                                READY   STATUS    RESTARTS   AGE
# merchant-backend-xxxxxxxxxx-xxxxx   1/1     Running   0          1m
# merchant-backend-xxxxxxxxxx-xxxxx   1/1     Running   0          1m
# merchant-backend-xxxxxxxxxx-xxxxx   1/1     Running   0          1m

# Get service URL
kubectl get svc merchant-backend-service

# Test health endpoint
SERVICE_IP=$(kubectl get svc merchant-backend-service -o jsonpath='{.status.loadBalancer.ingress[0].ip}')
curl http://$SERVICE_IP/health

# Should return: {"status":"ok"}
```

## Step 7: Run Database Migrations (1 minute)

```bash
# Get pod name
POD=$(kubectl get pods -l app=merchant-backend -o jsonpath='{.items[0].metadata.name}')

# Run migrations
kubectl exec -it $POD -- npm run migrate
```

## Quick Health Check

Run the automated health check:

```bash
npm run health
```

This will verify:
- ✓ API is responding
- ✓ All pods are running
- ✓ No crash loops
- ✓ Resource usage is normal

## Next Steps

### Configure DNS (Optional)
Point your domain to the load balancer IP:
```bash
# Get load balancer IP
kubectl get svc merchant-backend-service
```

Add A record: `api.rezapp.com` → `<LOAD_BALANCER_IP>`

### Setup SSL/TLS
```bash
# Install cert-manager
kubectl apply -f https://github.com/cert-manager/cert-manager/releases/download/v1.13.0/cert-manager.yaml

# Apply ingress with TLS (if using)
kubectl apply -f k8s/ingress.yaml
```

### Setup Monitoring
1. **Sentry**: Errors are already being sent (check dashboard)
2. **Logs**: `kubectl logs -f deployment/merchant-backend`
3. **Metrics**: `kubectl top pods`

### Setup CI/CD (Optional but recommended)

Add to GitHub Secrets:
- `DOCKER_USERNAME`
- `DOCKER_PASSWORD`
- `KUBE_CONFIG_PRODUCTION` (base64 encoded)

Then deployments will happen automatically on push to main:
```bash
git push origin main
# Watch deployment in GitHub Actions
```

## Common Issues & Solutions

### Pods not starting
```bash
kubectl describe pod <pod-name>
kubectl logs <pod-name>
```
**Fix**: Check if secrets are created correctly

### Can't connect to database
```bash
kubectl exec -it $POD -- node -e "require('mongoose').connect(process.env.MONGODB_URI)"
```
**Fix**: Verify MongoDB Atlas network access whitelist

### Service not accessible
```bash
kubectl get endpoints merchant-backend-service
```
**Fix**: Check if pods are ready (readiness probe)

### Health check failing
```bash
kubectl exec -it $POD -- curl http://localhost:5001/health
```
**Fix**: Application may still be starting, wait 30s

## Useful Commands

```bash
# View logs
kubectl logs -f deployment/merchant-backend

# Restart deployment
kubectl rollout restart deployment/merchant-backend

# Scale manually
kubectl scale deployment merchant-backend --replicas=5

# Check resource usage
kubectl top pods

# Get shell in pod
kubectl exec -it <pod-name> -- /bin/sh

# Port forward for testing
kubectl port-forward deployment/merchant-backend 8080:5001
# Then: curl http://localhost:8080/health
```

## Rollback

If something goes wrong:

```bash
# Immediate rollback
kubectl rollout undo deployment/merchant-backend

# Or use the rollback script
# (See ROLLBACK_GUIDE.md for details)
```

## Cost Estimate

For 3-10 pods with moderate traffic:
- Kubernetes cluster: $150-300/month
- MongoDB Atlas M30: $350/month
- Redis Cloud: $50-100/month
- Other services: $50/month
- **Total: ~$600-800/month**

## Production Checklist

After deployment, verify:

- [ ] All pods running
- [ ] Health endpoint responding
- [ ] Database connected
- [ ] Redis connected
- [ ] External services working (test email, SMS, payment)
- [ ] Monitoring configured (Sentry, logs)
- [ ] Backups scheduled
- [ ] Team has access (kubectl)
- [ ] Documentation updated

## Support

- Full deployment guide: [DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md)
- Operations manual: [PRODUCTION_RUNBOOK.md](./PRODUCTION_RUNBOOK.md)
- Kubernetes guide: [KUBERNETES_GUIDE.md](./KUBERNETES_GUIDE.md)
- Rollback procedures: [ROLLBACK_GUIDE.md](./ROLLBACK_GUIDE.md)

## Success!

You now have a production-ready merchant backend running on Kubernetes with:
- ✅ Auto-scaling (3-10 pods)
- ✅ Health checks
- ✅ Load balancing
- ✅ Database & cache
- ✅ Monitoring
- ✅ Rollback capability

**Start monitoring and enjoy! 🚀**
