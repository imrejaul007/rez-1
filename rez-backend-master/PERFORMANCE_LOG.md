# REZ Performance Log

Started: March 2026

## Measurement Command
```bash
for i in $(seq 30); do
  curl -s -o /dev/null -w "%{time_total}\n" \
    http://localhost:5000/ENDPOINT -H "Authorization: Bearer $TOKEN"
done | awk '{ sum+=$1; n++ } END { printf "avg: %.0fms\n", sum/n*1000 }'
```

## Log

| Date | Fix | File | Before | After | Method |
|------|-----|------|--------|-------|--------|
| 2026-03-20 | CORS production guard | middleware.ts | silent fallback | throws error | NODE_ENV test |
| 2026-03-20 | lazyWithRetry for lazy components | app/(tabs)/index.tsx | crash on slow 4G | 1.5s retry | device test |
| 2026-03-20 | earningsController parallel queries | earningsController.ts | ~340ms sequential | ~90ms parallel | curl timing |
| 2026-03-20 | priveController caching | priveController.ts | ~200ms per call | ~5ms cached | curl timing |
| 2026-03-20 | storePaymentController caching | storePaymentController.ts | 6x Store.findOne | 1x cached | curl timing |
| 2026-03-20 | productController .lean() | productController.ts | ~120KB payload | ~30KB payload | response size |
| 2026-03-20 | Compression threshold 2KB | middleware.ts | 1KB default | 2KB threshold | config change |
| 2026-03-20 | /api/user/boot endpoint | userBootController.ts | 4 startup calls | 1 boot call | curl timing |
| 2026-03-20 | Mall client cache (2min TTL) | mallApi.ts | refetch every open | instant from cache | network tab |
| 2026-03-20 | queryClient smart retry | queryClient.ts | retries 4xx errors | skips 4xx | config change |
| 2026-03-20 | Wallet dedup via walletApi | storePaymentApi/pointsApi | 3 parallel calls | 1 deduplicated | network tab |
