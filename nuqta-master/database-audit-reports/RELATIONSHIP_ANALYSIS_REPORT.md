# RELATIONSHIP ANALYSIS REPORT

Generated: 2025-11-15T08:02:53.572Z

## Relationship Summary

| From | To | Checked | Valid | Invalid | Missing | Valid % |
|------|-------|---------|-------|---------|---------|--------|
| products.storeId | stores._id | 100 | 0 | 0 | 100 | 0.0% |
| products.categoryId | categories._id | 100 | 0 | 0 | 100 | 0.0% |
| products.category | categories._id | 100 | 93 | 7 | 0 | 93.0% |
| orders.items.productId | products._id | 21 | 0 | 0 | 21 | 0.0% |
| orders.userId | users._id | 15 | 0 | 0 | 15 | 0.0% |
| reviews.productId | products._id | 5 | 0 | 0 | 5 | 0.0% |
| reviews.storeId | stores._id | 5 | 0 | 0 | 5 | 0.0% |
| videos.productId | products._id | 100 | 0 | 0 | 100 | 0.0% |
| videos.storeId | stores._id | 100 | 0 | 0 | 100 | 0.0% |
| projects.storeId | stores._id | 16 | 0 | 0 | 16 | 0.0% |
| offers.applicableStores | stores._id | 0 | 0 | 0 | 0 | 0% |
| wishlists.userId | users._id | 100 | 0 | 0 | 100 | 0.0% |
| wishlists.items.productId | products._id | 0 | 0 | 0 | 0 | 0% |
| carts.userId | users._id | 1 | 0 | 0 | 1 | 0.0% |
| carts.items.productId | products._id | 4 | 0 | 0 | 4 | 0.0% |

## Detailed Analysis

### products.storeId → stores._id

- **Documents Checked:** 100
- **Valid References:** 0 (0.0%)
- **Invalid References:** 0
- **Missing References:** 100

---

### products.categoryId → categories._id

- **Documents Checked:** 100
- **Valid References:** 0 (0.0%)
- **Invalid References:** 0
- **Missing References:** 100

---

### products.category → categories._id

- **Documents Checked:** 100
- **Valid References:** 93 (93.0%)
- **Invalid References:** 7
- **Missing References:** 0

**Orphaned Reference Samples:**

```json
[
  {
    "sourceId": "6905afbb5f8c7aa14aa29956",
    "category": "68ee29d08c4fa11015d70340"
  },
  {
    "sourceId": "6905afbb5f8c7aa14aa29965",
    "category": "68ee29d08c4fa11015d70342"
  },
  {
    "sourceId": "6905afbb5f8c7aa14aa29969",
    "category": "68ee29d08c4fa11015d70343"
  },
  {
    "sourceId": "6905afbb5f8c7aa14aa2996e",
    "category": "68ee29d08c4fa11015d70343"
  },
  {
    "sourceId": "6905afbb5f8c7aa14aa29970",
    "category": "68ee29d08c4fa11015d70343"
  }
]
```

---

### orders.items.productId → products._id

- **Documents Checked:** 21
- **Valid References:** 0 (0.0%)
- **Invalid References:** 0
- **Missing References:** 21

---

### orders.userId → users._id

- **Documents Checked:** 15
- **Valid References:** 0 (0.0%)
- **Invalid References:** 0
- **Missing References:** 15

---

### reviews.productId → products._id

- **Documents Checked:** 5
- **Valid References:** 0 (0.0%)
- **Invalid References:** 0
- **Missing References:** 5

---

### reviews.storeId → stores._id

- **Documents Checked:** 5
- **Valid References:** 0 (0.0%)
- **Invalid References:** 0
- **Missing References:** 5

---

### videos.productId → products._id

- **Documents Checked:** 100
- **Valid References:** 0 (0.0%)
- **Invalid References:** 0
- **Missing References:** 100

---

### videos.storeId → stores._id

- **Documents Checked:** 100
- **Valid References:** 0 (0.0%)
- **Invalid References:** 0
- **Missing References:** 100

---

### projects.storeId → stores._id

- **Documents Checked:** 16
- **Valid References:** 0 (0.0%)
- **Invalid References:** 0
- **Missing References:** 16

---

### offers.applicableStores → stores._id

- **Documents Checked:** 0
- **Valid References:** 0 (0%)
- **Invalid References:** 0
- **Missing References:** 0

---

### wishlists.userId → users._id

- **Documents Checked:** 100
- **Valid References:** 0 (0.0%)
- **Invalid References:** 0
- **Missing References:** 100

---

### wishlists.items.productId → products._id

- **Documents Checked:** 0
- **Valid References:** 0 (0%)
- **Invalid References:** 0
- **Missing References:** 0

---

### carts.userId → users._id

- **Documents Checked:** 1
- **Valid References:** 0 (0.0%)
- **Invalid References:** 0
- **Missing References:** 1

---

### carts.items.productId → products._id

- **Documents Checked:** 4
- **Valid References:** 0 (0.0%)
- **Invalid References:** 0
- **Missing References:** 4

---

