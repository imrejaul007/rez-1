# IDOR Vulnerability Fixes

## Fixed Vulnerabilities

### 1. `/order/:orderId/financial` - Missing Ownership Check (CRITICAL)

**Severity:** Critical

**Location:** `src/routes/orderRoutes.ts` (lines 132-138)

**Issue:**
The `/order/:orderId/financial` endpoint allowed any authenticated user to access the financial details (ledger trail, coin transactions, refunds) of ANY order by simply knowing the order ID. This was an Insecure Direct Object Reference (IDOR) vulnerability.

**Root Cause:**
Unlike the `/:orderId` endpoint which had IDOR protection middleware, the `/financial` sub-route was missing ownership verification entirely.

**Fix Applied:**
Added ownership verification middleware identical to the one used on the `/:orderId` endpoint:

```typescript
// IDOR protection: verify order ownership before controller access
async (req, res, next) => {
  const { Order } = await import('../models/Order');
  const order = await Order.findById(req.params.orderId).select('_id user').lean();
  if (!order) return res.status(404).json({ success: false, message: 'Order not found' });
  if (order.user.toString() !== req.userId) {
    return res.status(403).json({ success: false, message: 'Access denied' });
  }
  next();
}
```

**Behavior After Fix:**
- If the order does not exist: Returns `404 Not Found`
- If the order exists but belongs to another user: Returns `403 Forbidden`
- If the order exists and belongs to the requesting user: Proceeds to `getOrderFinancialDetails`

**Date Fixed:** 2026-06-25

---

## Security Best Practices Applied

1. **Dynamic Import Pattern:** Using `import('../models/Order')` inside the middleware to avoid circular dependency issues while keeping the middleware self-contained.

2. **Lean Query:** Using `.lean()` for efficient database queries when we only need the document fields, not Mongoose methods.

3. **Field Selection:** Only selecting `_id` and `user` fields to minimize data exposure and optimize query performance.

4. **Consistent Error Responses:** Using the same response format (`{ success: false, message: '...' }`) for consistency with the existing endpoint pattern.
