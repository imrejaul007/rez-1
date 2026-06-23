# Phase 1 — New Files Inventory (git -> user merge)

_Generated from `diff -rq` between `rez-backend` (git) and `rez-backend-master` (user)._
_All paths absolute, forward-slash. Build outputs (`node_modules`, `.git`, `dist`, `coverage`, `.husky`) excluded._

## Top-level directories only in git

| Directory | File count |
|-----------|-----------|
| `C:/Users/user/Downloads/rez-backend-master/rez-backend/.claude-flow` | 12 |

## All new directories (with file counts)

| Directory | File count |
|-----------|-----------|
| `.claude-flow/` | 12 |
| `.github/ISSUE_TEMPLATE/` | 3 |
| `docs/sprint-0/` | 5 |
| `docs/sprint-minus-1a/` | 3 |
| `scripts/arch-fitness/` | 5 |
| `src/__tests__/contracts/` | 1 |
| `src/__tests__/errors/` | 1 |
| `src/__tests__/indexes/` | 1 |
| `src/__tests__/integration/` | 4 |
| `src/__tests__/mocks/` | 1 |
| `src/.claude-flow/` | 7 |
| `src/@rez/` | 161 |
| `src/constants/` | 1 |
| `src/docs/` | 2 |
| `src/events/__tests__/` | 2 |
| `src/events/canonical/` | 11 |
| `src/merchantroutes/__tests__/` | 2 |
| `src/merchantroutes/.claude-flow/` | 1 |
| `src/prompts/` | 2 |
| `src/routes/__tests__/` | 1 |
| `src/routes/karmaLoyalty/` | 1 |
| `src/scripts/migrations/` | 9 |
| `src/services/auth/` | 3 |
| `src/services/cpaPricing/` | 2 |
| `src/services/customerLifecycle/` | 2 |
| `src/services/dailyActions/` | 10 |
| `src/services/growthScore/` | 2 |
| `src/services/merchantRoi/` | 2 |
| `src/utils/__tests__/` | 1 |
| `uploads/invoices/` | 45 |

## Individual files only in git (top 100)

Total individual files (outside fully-new dirs): **640**

- `.gitattributes`
- `.github/PULL_REQUEST_TEMPLATE.md`
- `.github/workflows/arch-fitness.yml`
- `.github/workflows/auto-merge.yml`
- `.github/workflows/auto-rebase.yml`
- `.github/workflows/ci-doctor.yml`
- `.github/workflows/ci.yml`
- `.github/workflows/deploy-check.yml`
- `.github/workflows/performance-gate.yml`
- `.github/workflows/pr-guard.yml`
- `.github/workflows/typescript-check.yml`
- `.lintstagedrc.json`
- `.nvmrc`
- `.prettierignore`
- `.prettierrc`
- `ABUSE_PREVENTION_AUDIT.md`
- `API_CONTRACTS.md`
- `AUDIT_REPORT.md`
- `AUDIT_REPORT_ABUSE_FIXES.md`
- `BACKEND_MASTER_AUDIT_2026_04_15.md`
- `CHANGELOG.md`
- `CLAUDE.md`
- `ECONGUARD_AUDIT_REPORT.md`
- `LEDGER_INTEGRITY_AUDIT.md`
- `MEMORY_OPTIMIZATIONS.md`
- `README.home-services.md`
- `README.md`
- `REWARD_ECONOMICS.md`
- `SCALEPILOT_OPTIMIZATION.md`
- `VELOCITY_IMPLEMENTATION_GUIDE.md`
- `alert_rules.yml`
- `docker-compose.microservices.yml`
- `docs/DEVELOPER_WORKFLOW.md`
- `docs/env-vars.md`
- `jest.middleware.config.js`
- `k8s/SCALING_STRATEGY.md`
- `k8s/worker-deployment.yaml`
- `monitoring/alert-rules.yml`
- `monitoring/alertmanager.yml`
- `monitoring/bullmq-queue.json`
- `monitoring/business-metrics.json`
- `monitoring/grafana/provisioning/dashboards/dashboards.yml`
- `monitoring/grafana/provisioning/datasources/datasources.yml`
- `monitoring/service-health.json`
- `prometheus-alerts.yml`
- `render.yaml`
- `scripts/ci-doctor-fix.py`
- `scripts/ci-doctor-pr-body.py`
- `scripts/createAdminUser.ts`
- `scripts/fixAdminRefreshToken.ts`
- `scripts/install-pre-push-hooks.sh`
- `scripts/loadTest.ts`
- `scripts/phase5-db-migration.ts`
- `scripts/pre-deploy-phase4-ledger-index.js`
- `src/__tests__/admin-security-audit.test.ts`
- `src/__tests__/bullmq-pipeline.test.ts`
- `src/__tests__/cashback.holdPeriod.test.ts`
- `src/__tests__/cashbackCapConcurrency.test.ts`
- `src/__tests__/cashbackService.test.ts`
- `src/__tests__/coinExpiryJob.test.ts`
- `src/__tests__/financial-contracts.test.ts`
- `src/__tests__/fraudDetection.test.ts`
- `src/__tests__/habitLoop.integration.test.ts`
- `src/__tests__/karmaIntegration.test.ts`
- `src/__tests__/merchant-analytics-endpoints.test.ts`
- `src/__tests__/merchant-auth-security.test.ts`
- `src/__tests__/merchantPayoutJob.test.ts`
- `src/__tests__/middleware-security.test.ts`
- `src/__tests__/mindIntegration.test.ts`
- `src/__tests__/order-table-fixes.test.ts`
- `src/__tests__/otp-security.test.ts`
- `src/__tests__/payment-atomicity.test.ts`
- `src/__tests__/personaFeedConfig.test.ts`
- `src/__tests__/personaIntegration.test.ts`
- `src/__tests__/personaNotifications.test.ts`
- `src/__tests__/personaResolver.test.ts`
- `src/__tests__/personaSearch.test.ts`
- `src/__tests__/qrCheckin.security.test.ts`
- `src/__tests__/rateLimiter.test.ts`
- `src/__tests__/referral.fraud.test.ts`
- `src/__tests__/rewardEngine.test.ts`
- `src/__tests__/security.test.ts`
- `src/__tests__/sharedTypesValidator.test.ts`
- `src/__tests__/streakService.test.ts`
- `src/__tests__/wallet.idempotency.test.ts`
- `src/__tests__/walletService.test.ts`
- `src/__tests__/webhookIdempotency.test.ts`
- `src/config/bullmq-connection.ts`
- `src/config/bullmq-queues.ts`
- `src/config/bullmqFailureHandler.ts`
- `src/config/circuitBreakerConfig.ts`
- `src/config/databaseOptimization.ts`
- `src/config/distributedTracing.ts`
- `src/config/economicsConfig.ts`
- `src/config/financialStateMachine.ts`
- `src/config/graphqlSetup.ts`
- `src/config/jobQueues.ts`
- `src/config/monitoring.ts`
- `src/config/productionMiddleware.ts`
- `src/config/redis-pool.ts`

_(...truncated — 540 more individual files. See PHASE1_NEW_FILES.json for full list.)_

## Stats

- **Total new files**: 943
- **Total new directories (fully new)**: 30
- **Individual files outside fully-new dirs**: 640
- **Files inside fully-new dirs**: 303
