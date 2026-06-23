# Kubernetes Operations Guide

## Table of Contents
1. [Kubernetes Basics](#kubernetes-basics)
2. [Resource Management](#resource-management)
3. [Scaling Strategies](#scaling-strategies)
4. [Health Checks](#health-checks)
5. [Configuration Management](#configuration-management)
6. [Monitoring & Debugging](#monitoring--debugging)
7. [Common Operations](#common-operations)
8. [Best Practices](#best-practices)

## Kubernetes Basics

### Core Concepts

**Pod**: Smallest deployable unit, contains one or more containers
```bash
# List pods
kubectl get pods -n production

# Describe pod
kubectl describe pod <pod-name> -n production

# Get pod logs
kubectl logs <pod-name> -n production
```

**Deployment**: Manages pod replicas and rolling updates
```bash
# List deployments
kubectl get deployments -n production

# Describe deployment
kubectl describe deployment merchant-backend -n production

# View deployment history
kubectl rollout history deployment/merchant-backend -n production
```

**Service**: Exposes pods to network traffic
```bash
# List services
kubectl get svc -n production

# Describe service
kubectl describe svc merchant-backend-service -n production
```

**HPA** (Horizontal Pod Autoscaler): Automatically scales pods
```bash
# List HPAs
kubectl get hpa -n production

# Describe HPA
kubectl describe hpa merchant-backend-hpa -n production
```

### Namespaces

Our application uses namespaces to separate environments:

```bash
# List namespaces
kubectl get namespaces

# Set default namespace
kubectl config set-context --current --namespace=production

# Get current context
kubectl config current-context
```

## Resource Management

### Resource Requests vs Limits

**Requests**: Minimum guaranteed resources
**Limits**: Maximum allowed resources

```yaml
resources:
  requests:
    memory: "512Mi"  # Minimum
    cpu: "500m"      # 0.5 CPU cores
  limits:
    memory: "1Gi"    # Maximum
    cpu: "1000m"     # 1 CPU core
```

### View Resource Usage

```bash
# Pod resource usage
kubectl top pods -n production

# Node resource usage
kubectl top nodes

# Detailed pod metrics
kubectl get pods -n production -o custom-columns=NAME:.metadata.name,CPU-REQUEST:.spec.containers[0].resources.requests.cpu,MEMORY-REQUEST:.spec.containers[0].resources.requests.memory
```

### Update Resources

```bash
# Update resource limits
kubectl set resources deployment merchant-backend \
  --limits=cpu=2000m,memory=2Gi \
  --requests=cpu=1000m,memory=1Gi \
  -n production

# Verify changes
kubectl describe deployment merchant-backend -n production | grep -A 5 Limits
```

## Scaling Strategies

### Manual Scaling

**Scale up**
```bash
kubectl scale deployment merchant-backend --replicas=5 -n production
```

**Scale down**
```bash
kubectl scale deployment merchant-backend --replicas=2 -n production
```

**Check current replicas**
```bash
kubectl get deployment merchant-backend -n production
```

### Auto-scaling (HPA)

Our HPA configuration:
- Min replicas: 3
- Max replicas: 10
- Target CPU: 70%
- Target Memory: 80%

```bash
# View HPA status
kubectl get hpa merchant-backend-hpa -n production

# Example output:
# NAME                   REFERENCE                     TARGETS         MINPODS   MAXPODS   REPLICAS
# merchant-backend-hpa   Deployment/merchant-backend   45%/70%, 60%/80%   3         10        3
```

**Temporarily disable auto-scaling**
```bash
kubectl delete hpa merchant-backend-hpa -n production
```

**Re-enable auto-scaling**
```bash
kubectl apply -f k8s/hpa.yaml -n production
```

**Update auto-scaling thresholds**
```bash
# Edit HPA
kubectl edit hpa merchant-backend-hpa -n production

# Or update file and apply
kubectl apply -f k8s/hpa.yaml -n production
```

### Vertical Pod Autoscaler (VPA)

VPA automatically adjusts resource requests/limits:

```yaml
# vpa.yaml
apiVersion: autoscaling.k8s.io/v1
kind: VerticalPodAutoscaler
metadata:
  name: merchant-backend-vpa
spec:
  targetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: merchant-backend
  updatePolicy:
    updateMode: "Auto"
```

## Health Checks

### Liveness Probe

Checks if container is alive. If fails, Kubernetes restarts the pod.

```yaml
livenessProbe:
  httpGet:
    path: /health
    port: 5001
  initialDelaySeconds: 30
  periodSeconds: 10
  timeoutSeconds: 5
  failureThreshold: 3
```

### Readiness Probe

Checks if container is ready to receive traffic. If fails, removes pod from service endpoints.

```yaml
readinessProbe:
  httpGet:
    path: /health
    port: 5001
  initialDelaySeconds: 10
  periodSeconds: 5
  timeoutSeconds: 3
  failureThreshold: 3
```

### Debugging Health Checks

```bash
# Check pod events (shows probe failures)
kubectl describe pod <pod-name> -n production | grep -A 10 Events

# Test health endpoint manually
kubectl exec <pod-name> -n production -- wget -qO- http://localhost:5001/health

# Check readiness status
kubectl get pods -n production -o wide
```

## Configuration Management

### ConfigMaps

Store non-sensitive configuration:

```bash
# Create ConfigMap
kubectl create configmap app-config \
  --from-literal=LOG_LEVEL=info \
  --from-literal=RATE_LIMIT_WINDOW=900000 \
  -n production

# View ConfigMap
kubectl get configmap app-config -n production -o yaml

# Update ConfigMap
kubectl edit configmap app-config -n production

# Delete ConfigMap
kubectl delete configmap app-config -n production
```

### Secrets

Store sensitive data:

```bash
# Create secret
kubectl create secret generic my-secret \
  --from-literal=api-key=abc123 \
  -n production

# View secret (encoded)
kubectl get secret my-secret -n production -o yaml

# Decode secret
kubectl get secret my-secret -n production -o jsonpath='{.data.api-key}' | base64 -d

# Update secret
kubectl edit secret my-secret -n production

# Delete secret
kubectl delete secret my-secret -n production
```

### Using ConfigMaps and Secrets in Pods

```yaml
env:
  # From ConfigMap
  - name: LOG_LEVEL
    valueFrom:
      configMapKeyRef:
        name: app-config
        key: LOG_LEVEL

  # From Secret
  - name: API_KEY
    valueFrom:
      secretKeyRef:
        name: my-secret
        key: api-key
```

## Monitoring & Debugging

### View Logs

```bash
# Live logs from deployment
kubectl logs -f deployment/merchant-backend -n production

# Logs from specific pod
kubectl logs <pod-name> -n production

# Previous pod logs (for crashed pods)
kubectl logs <pod-name> -n production --previous

# Logs from last hour
kubectl logs deployment/merchant-backend -n production --since=1h

# Tail last 100 lines
kubectl logs deployment/merchant-backend -n production --tail=100

# Logs from specific container (if multiple containers in pod)
kubectl logs <pod-name> -c api -n production
```

### Exec into Pod

```bash
# Start shell in pod
kubectl exec -it <pod-name> -n production -- /bin/sh

# Run command without shell
kubectl exec <pod-name> -n production -- ls -la /app

# Run node REPL
kubectl exec -it <pod-name> -n production -- node
```

### Port Forwarding

Forward local port to pod port (useful for debugging):

```bash
# Forward local 8080 to pod 5001
kubectl port-forward deployment/merchant-backend 8080:5001 -n production

# Test locally
curl http://localhost:8080/health
```

### Debug Pod

Create temporary debug pod:

```bash
# Run debug pod
kubectl run debug --rm -it --image=alpine --restart=Never -- /bin/sh

# Install tools
apk add curl wget

# Test connectivity
curl http://merchant-backend-service.production.svc.cluster.local/health
```

### Events

View cluster events:

```bash
# All events
kubectl get events -n production

# Events sorted by time
kubectl get events -n production --sort-by='.lastTimestamp'

# Events for specific pod
kubectl get events -n production --field-selector involvedObject.name=<pod-name>

# Watch events in real-time
kubectl get events -n production --watch
```

### Describe Resources

Get detailed information:

```bash
# Describe pod
kubectl describe pod <pod-name> -n production

# Describe deployment
kubectl describe deployment merchant-backend -n production

# Describe service
kubectl describe svc merchant-backend-service -n production

# Describe node
kubectl describe node <node-name>
```

## Common Operations

### Rolling Updates

```bash
# Update image
kubectl set image deployment/merchant-backend \
  api=rezapp/merchant-backend:v1.2.0 \
  -n production

# Monitor rollout
kubectl rollout status deployment/merchant-backend -n production

# Pause rollout
kubectl rollout pause deployment/merchant-backend -n production

# Resume rollout
kubectl rollout resume deployment/merchant-backend -n production
```

### Rollback

```bash
# Rollback to previous version
kubectl rollout undo deployment/merchant-backend -n production

# Rollback to specific revision
kubectl rollout undo deployment/merchant-backend --to-revision=2 -n production

# View rollout history
kubectl rollout history deployment/merchant-backend -n production

# View specific revision
kubectl rollout history deployment/merchant-backend --revision=2 -n production
```

### Restart

```bash
# Rolling restart (zero downtime)
kubectl rollout restart deployment/merchant-backend -n production

# Delete all pods (they'll be recreated)
kubectl delete pods -l app=merchant-backend -n production

# Delete specific pod
kubectl delete pod <pod-name> -n production
```

### Copy Files

```bash
# Copy from pod to local
kubectl cp <pod-name>:/app/logs/app.log ./app.log -n production

# Copy from local to pod
kubectl cp ./config.json <pod-name>:/app/config.json -n production
```

### Apply Manifests

```bash
# Apply single file
kubectl apply -f k8s/deployment.yaml -n production

# Apply all files in directory
kubectl apply -f k8s/ -n production

# Dry run (see what would happen)
kubectl apply -f k8s/deployment.yaml --dry-run=client

# View diff before applying
kubectl diff -f k8s/deployment.yaml
```

### Delete Resources

```bash
# Delete deployment
kubectl delete deployment merchant-backend -n production

# Delete service
kubectl delete svc merchant-backend-service -n production

# Delete by file
kubectl delete -f k8s/deployment.yaml -n production

# Force delete pod
kubectl delete pod <pod-name> --force --grace-period=0 -n production
```

## Best Practices

### 1. Resource Management

✅ **Always set resource requests and limits**
```yaml
resources:
  requests:
    memory: "512Mi"
    cpu: "500m"
  limits:
    memory: "1Gi"
    cpu: "1000m"
```

✅ **Use HPA for auto-scaling**
```yaml
minReplicas: 3
maxReplicas: 10
```

❌ **Don't run without resource limits** (can crash nodes)

### 2. High Availability

✅ **Run minimum 3 replicas in production**
```yaml
replicas: 3
```

✅ **Use pod anti-affinity** (spread pods across nodes)
```yaml
affinity:
  podAntiAffinity:
    preferredDuringSchedulingIgnoredDuringExecution:
    - weight: 100
      podAffinityTerm:
        labelSelector:
          matchExpressions:
          - key: app
            operator: In
            values:
            - merchant-backend
        topologyKey: kubernetes.io/hostname
```

❌ **Don't run single replica in production**

### 3. Health Checks

✅ **Always configure liveness and readiness probes**
```yaml
livenessProbe:
  httpGet:
    path: /health
    port: 5001
readinessProbe:
  httpGet:
    path: /ready
    port: 5001
```

❌ **Don't use the same endpoint for both probes if they have different purposes**

### 4. Rolling Updates

✅ **Use rolling update strategy**
```yaml
strategy:
  type: RollingUpdate
  rollingUpdate:
    maxSurge: 1
    maxUnavailable: 0
```

✅ **Test changes in staging first**

❌ **Don't deploy directly to production without testing**

### 5. Secrets Management

✅ **Use Kubernetes secrets for sensitive data**
```bash
kubectl create secret generic api-keys --from-literal=key=value
```

✅ **Consider external secret management** (AWS Secrets Manager, Vault)

❌ **Never commit secrets to git**
❌ **Never use plain environment variables for secrets**

### 6. Monitoring

✅ **Always check logs after deployment**
```bash
kubectl logs -f deployment/merchant-backend -n production
```

✅ **Set up alerting for critical metrics**

✅ **Monitor resource usage regularly**
```bash
kubectl top pods -n production
```

### 7. Labels and Annotations

✅ **Use consistent labels**
```yaml
labels:
  app: merchant-backend
  tier: backend
  environment: production
  version: v1.0.0
```

✅ **Use annotations for metadata**
```yaml
annotations:
  deployed-by: "ci-cd-pipeline"
  deployment-date: "2025-01-15"
```

### 8. Namespace Organization

✅ **Separate environments with namespaces**
- `development`
- `staging`
- `production`

✅ **Set resource quotas per namespace**
```yaml
apiVersion: v1
kind: ResourceQuota
metadata:
  name: production-quota
spec:
  hard:
    requests.cpu: "10"
    requests.memory: 20Gi
    limits.cpu: "20"
    limits.memory: 40Gi
```

## Cheat Sheet

### Quick Commands

```bash
# Get everything
kubectl get all -n production

# Describe in detail
kubectl describe <resource-type> <resource-name> -n production

# Edit resource
kubectl edit <resource-type> <resource-name> -n production

# Delete resource
kubectl delete <resource-type> <resource-name> -n production

# Get yaml
kubectl get <resource-type> <resource-name> -o yaml -n production

# Get json
kubectl get <resource-type> <resource-name> -o json -n production

# Watch resources
kubectl get pods -n production --watch

# Set namespace permanently
kubectl config set-context --current --namespace=production
```

### Useful Aliases

Add to your `.bashrc` or `.zshrc`:

```bash
alias k='kubectl'
alias kgp='kubectl get pods'
alias kgs='kubectl get svc'
alias kgd='kubectl get deployment'
alias kl='kubectl logs -f'
alias kd='kubectl describe'
alias ke='kubectl exec -it'
alias kpf='kubectl port-forward'
alias kn='kubectl config set-context --current --namespace'
```

## Additional Resources

- [Official Kubernetes Documentation](https://kubernetes.io/docs/)
- [kubectl Cheat Sheet](https://kubernetes.io/docs/reference/kubectl/cheatsheet/)
- [Kubernetes Best Practices](https://kubernetes.io/docs/concepts/configuration/overview/)
- [Production Runbook](./PRODUCTION_RUNBOOK.md)
- [Deployment Guide](./DEPLOYMENT_GUIDE.md)
