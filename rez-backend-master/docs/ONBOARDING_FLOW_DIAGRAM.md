# Merchant Onboarding Flow Diagram

## Visual Overview

```
╔═══════════════════════════════════════════════════════════════════════════╗
║                      MERCHANT ONBOARDING SYSTEM                           ║
║                         5-Step Wizard Flow                                ║
╚═══════════════════════════════════════════════════════════════════════════╝

┌─────────────────────────────────────────────────────────────────────────┐
│                        START: Merchant Registers                        │
│                     POST /api/merchant/auth/register                    │
└────────────────────────────────┬────────────────────────────────────────┘
                                 │
                                 ▼
              ┌──────────────────────────────────────┐
              │   Onboarding Status: PENDING         │
              │   Current Step: 1                    │
              │   Progress: 0%                       │
              └──────────────────┬───────────────────┘
                                 │
                                 ▼
╔═════════════════════════════════════════════════════════════════════════╗
║                           STEP 1: BUSINESS INFO                         ║
╠═════════════════════════════════════════════════════════════════════════╣
║  Required:                                                              ║
║  • Company Name                                                         ║
║  • Business Type                                                        ║
║                                                                         ║
║  Optional:                                                              ║
║  • Registration Number                                                  ║
║  • GST Number (validated)                                               ║
║  • PAN Number (validated)                                               ║
║                                                                         ║
║  API: POST /api/merchant/onboarding/step/1                              ║
║  Auto-save: Yes                                                         ║
╚═════════════════════════════════════════════════════════════════════════╝
                                 │
                                 ▼
                   ┌─────────────────────────┐
                   │  Complete Step 1        │
                   │  POST /step/1/complete  │
                   └───────────┬─────────────┘
                               │
                               ▼
                   ┌─────────────────────────┐
                   │  Email: Step Completed  │
                   │  Progress: 20%          │
                   └───────────┬─────────────┘
                               │
                               ▼
╔═════════════════════════════════════════════════════════════════════════╗
║                          STEP 2: STORE DETAILS                          ║
╠═════════════════════════════════════════════════════════════════════════╣
║  Required:                                                              ║
║  • Store Name                                                           ║
║  • Category                                                             ║
║  • Address (Complete)                                                   ║
║    - Street, City, State, ZIP, Country                                  ║
║                                                                         ║
║  Optional:                                                              ║
║  • Description                                                          ║
║  • Logo URL (Cloudinary)                                                ║
║  • Banner URL (Cloudinary)                                              ║
║  • Landmark                                                             ║
║                                                                         ║
║  API: POST /api/merchant/onboarding/step/2                              ║
╚═════════════════════════════════════════════════════════════════════════╝
                                 │
                                 ▼
                   ┌─────────────────────────┐
                   │  Complete Step 2        │
                   │  Progress: 40%          │
                   └───────────┬─────────────┘
                               │
                               ▼
╔═════════════════════════════════════════════════════════════════════════╗
║                          STEP 3: BANK DETAILS                           ║
╠═════════════════════════════════════════════════════════════════════════╣
║  Required:                                                              ║
║  • Account Number                                                       ║
║  • IFSC Code (validated)                                                ║
║  • Account Holder Name                                                  ║
║                                                                         ║
║  Optional:                                                              ║
║  • Bank Name                                                            ║
║  • Branch Name                                                          ║
║                                                                         ║
║  Security: Encrypted storage recommended                                ║
║  API: POST /api/merchant/onboarding/step/3                              ║
╚═════════════════════════════════════════════════════════════════════════╝
                                 │
                                 ▼
                   ┌─────────────────────────┐
                   │  Complete Step 3        │
                   │  Progress: 60%          │
                   └───────────┬─────────────┘
                               │
                               ▼
╔═════════════════════════════════════════════════════════════════════════╗
║                        STEP 4: PRODUCT SETUP                            ║
╠═════════════════════════════════════════════════════════════════════════╣
║  Optional Step - Can Skip                                               ║
║                                                                         ║
║  Merchants can:                                                         ║
║  • Skip and add products later                                          ║
║  • Use separate Product API                                             ║
║                                                                         ║
║  API: POST /api/merchant/onboarding/step/4                              ║
╚═════════════════════════════════════════════════════════════════════════╝
                                 │
                                 ▼
                   ┌─────────────────────────┐
                   │  Complete Step 4        │
                   │  Progress: 80%          │
                   └───────────┬─────────────┘
                               │
                               ▼
╔═════════════════════════════════════════════════════════════════════════╗
║                    STEP 5: DOCUMENT VERIFICATION                        ║
╠═════════════════════════════════════════════════════════════════════════╣
║  Required: At least 1 document                                          ║
║                                                                         ║
║  Document Types:                                                        ║
║  • Business License                                                     ║
║  • ID Proof (Aadhaar/PAN/Passport)                                      ║
║  • Address Proof                                                        ║
║  • GST Certificate                                                      ║
║  • PAN Card                                                             ║
║                                                                         ║
║  Upload Specs:                                                          ║
║  • Max Size: 10MB                                                       ║
║  • Formats: JPG, PNG, GIF, PDF                                          ║
║  • Storage: Cloudinary                                                  ║
║                                                                         ║
║  API: POST /api/merchant/onboarding/documents/upload                    ║
╚═════════════════════════════════════════════════════════════════════════╝
                                 │
                                 ▼
                   ┌─────────────────────────┐
                   │  Upload Documents       │
                   │  (One or More)          │
                   └───────────┬─────────────┘
                               │
                               ▼
                   ┌─────────────────────────┐
                   │  Complete Step 5        │
                   │  Progress: 100%         │
                   └───────────┬─────────────┘
                               │
                               ▼
              ┌────────────────────────────────────┐
              │    SUBMIT FOR VERIFICATION         │
              │  POST /api/merchant/onboarding/    │
              │            submit                  │
              └──────────────┬─────────────────────┘
                             │
                             ▼
              ┌────────────────────────────────────┐
              │  Status: COMPLETED                 │
              │  Emails Sent:                      │
              │  • Merchant: "Submitted"           │
              │  • Admin: "New Submission"         │
              └──────────────┬─────────────────────┘
                             │
                             ▼

╔═════════════════════════════════════════════════════════════════════════╗
║                        ADMIN VERIFICATION PHASE                         ║
╚═════════════════════════════════════════════════════════════════════════╝

                  ┌──────────────────────────┐
                  │   Admin Receives Email   │
                  │   + Dashboard Alert      │
                  └───────────┬──────────────┘
                              │
                              ▼
              ┌───────────────────────────────────┐
              │  GET /api/admin/onboarding/       │
              │             pending               │
              └───────────┬───────────────────────┘
                          │
                          ▼
        ┌─────────────────────────────────────────────┐
        │        Admin Reviews Application            │
        │  • Business Info                            │
        │  • Store Details                            │
        │  • Bank Details                             │
        │  • Documents                                │
        └──────────────┬──────────────────────────────┘
                       │
           ┌───────────┴───────────┐
           │                       │
           ▼                       ▼
┌────────────────────┐   ┌──────────────────────┐
│  Documents Valid?  │   │  Request Additional  │
└─────────┬──────────┘   │     Documents        │
          │              └──────────┬───────────┘
          │                         │
    ┌─────┴─────┐                   │
    │           │                   │
   NO          YES                  ▼
    │           │         ┌──────────────────────┐
    │           │         │  POST /admin/        │
    │           │         │  onboarding/:id/     │
    │           │         │  request-documents   │
    │           │         └──────────┬───────────┘
    │           │                    │
    │           │                    ▼
    │           │         ┌──────────────────────┐
    │           │         │  Merchant Uploads    │
    │           │         │  More Documents      │
    │           │         └──────────┬───────────┘
    │           │                    │
    │           │◄───────────────────┘
    │           │
    ▼           ▼
┌─────────────────────────────────────────┐
│   Verify Documents (Individual)         │
│   POST /admin/onboarding/:id/           │
│        documents/:index/verify          │
│                                         │
│   OR                                    │
│                                         │
│   Verify All Documents                  │
│   POST /admin/onboarding/:id/           │
│        documents/verify-all             │
└──────────────┬──────────────────────────┘
               │
    ┌──────────┴──────────┐
    │                     │
    ▼                     ▼
┌─────────┐         ┌─────────┐
│ APPROVE │         │ REJECT  │
│ approve │         │ reject  │
│         │         │ reason  │
└────┬────┘         └────┬────┘
     │                   │
     ▼                   ▼
╔═══════════════╗   ╔═══════════════╗
║   APPROVED    ║   ║   REJECTED    ║
╚═══════════════╝   ╚═══════════════╝
     │                   │
     ▼                   ▼
┌────────────────┐  ┌────────────────┐
│ Auto-Create    │  │ Send Rejection │
│ Store:         │  │ Email with     │
│ • Name         │  │ Reason         │
│ • Location     │  │                │
│ • Category     │  │ Allow Reapply  │
│ • Contact      │  └────────────────┘
│ • Merchant ID  │
│ • Active       │
│ • Verified     │
└──────┬─────────┘
       │
       ▼
┌────────────────┐
│ Send Welcome   │
│ Email:         │
│ • Store ID     │
│ • Dashboard    │
│ • Next Steps   │
└──────┬─────────┘
       │
       ▼
┌────────────────────────────┐
│  MERCHANT ACTIVE           │
│  • Dashboard Access        │
│  • Add Products            │
│  • Manage Store            │
│  • Receive Orders          │
└────────────────────────────┘


╔═════════════════════════════════════════════════════════════════════════╗
║                          ANALYTICS TRACKING                             ║
╚═════════════════════════════════════════════════════════════════════════╝

┌───────────────────────────────────────────────────────────────────────┐
│  Metrics Tracked:                                                     │
│                                                                       │
│  1. Total Merchants by Status                                        │
│     • Pending, In Progress, Completed, Rejected                      │
│                                                                       │
│  2. Average Completion Time (Hours)                                  │
│     • startedAt → completedAt                                        │
│                                                                       │
│  3. Drop-off Rate by Step                                            │
│     • How many merchants abandon at each step                        │
│                                                                       │
│  4. Step Distribution                                                │
│     • Current step counts for in-progress merchants                  │
│                                                                       │
│  5. Pending Verifications Count                                      │
│     • Merchants waiting for admin approval                           │
│                                                                       │
│  6. Approval/Rejection Rates                                         │
│     • Overall conversion rate                                        │
│                                                                       │
│  7. Document Statistics                                              │
│     • By type, by status, verification time                          │
│                                                                       │
│  API: GET /api/admin/onboarding/analytics                            │
│       GET /api/admin/onboarding/documents/statistics                 │
└───────────────────────────────────────────────────────────────────────┘


╔═════════════════════════════════════════════════════════════════════════╗
║                            EMAIL FLOW                                   ║
╚═════════════════════════════════════════════════════════════════════════╝

Merchant Emails:                    Admin Emails:
─────────────────                   ──────────────

1. Registration                     1. New Submission
   └─> Welcome Email                   └─> Notification Email

2. Step 1 Complete                  2. (Manual Review)
   └─> Progress Email

3. Step 2 Complete
   └─> Progress Email

4. Step 3 Complete
   └─> Progress Email

5. Step 5 Complete
   └─> Progress Email

6. Submission
   └─> "Under Review" Email

7. Documents Verified               3. (Decision Made)
   └─> "All Verified" Email

8. Approved                         4. (After Approval)
   └─> Welcome Kit Email
   └─> Store Created

OR

8. Rejected                         4. (After Rejection)
   └─> Rejection Email
   └─> Reapply Instructions

Additional Emails:
─────────────────
• Document Approved (Individual)
• Document Rejected (Individual)
• Request Additional Documents


╔═════════════════════════════════════════════════════════════════════════╗
║                      RESUME CAPABILITY                                  ║
╚═════════════════════════════════════════════════════════════════════════╝

┌────────────────────────────────────────────────────────────────────┐
│  Merchant can pause at any step:                                  │
│                                                                    │
│  • All data is auto-saved                                         │
│  • Progress tracked in database                                   │
│  • Can resume from any device                                     │
│  • GET /api/merchant/onboarding/status                            │
│    returns current state                                          │
│                                                                    │
│  Example:                                                         │
│  {                                                                │
│    "currentStep": 3,                                              │
│    "completedSteps": [1, 2],                                      │
│    "progressPercentage": 40,                                      │
│    "stepData": { ... saved data ... }                             │
│  }                                                                │
└────────────────────────────────────────────────────────────────────┘
```

---

## Status Transitions

```
PENDING → IN_PROGRESS → COMPLETED → APPROVED
                            ↓
                        REJECTED
```

---

## API Endpoint Summary

### Merchant Endpoints (8)
1. `GET /api/merchant/onboarding/status` - Get progress
2. `POST /api/merchant/onboarding/step/:stepNumber` - Save data
3. `POST /api/merchant/onboarding/step/:stepNumber/complete` - Complete step
4. `POST /api/merchant/onboarding/step/:stepNumber/previous` - Go back
5. `POST /api/merchant/onboarding/submit` - Submit for review
6. `POST /api/merchant/onboarding/documents/upload` - Upload doc
7. `GET /api/merchant/onboarding/documents` - Get all docs
8. `DELETE /api/merchant/onboarding/documents/:index` - Delete doc

### Admin Endpoints (8)
1. `POST /api/admin/onboarding/:id/approve` - Approve
2. `POST /api/admin/onboarding/:id/reject` - Reject
3. `POST /api/admin/onboarding/:id/documents/:index/verify` - Verify doc
4. `POST /api/admin/onboarding/:id/documents/verify-all` - Verify all
5. `POST /api/admin/onboarding/:id/request-documents` - Request more
6. `GET /api/admin/onboarding/pending` - Get pending list
7. `GET /api/admin/onboarding/analytics` - Get analytics
8. `GET /api/admin/onboarding/documents/statistics` - Get doc stats

---

## Database Indexes

```
Merchant Collection:
- onboarding.status (ascending)
- onboarding.currentStep (ascending)
- onboarding.completedAt (descending)

Store Collection:
- createdViaOnboarding (ascending)
```

---

## Validation Rules

### GST Format
```
Pattern: 22AAAAA0000A1Z5
Regex: /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/
```

### PAN Format
```
Pattern: AAAAA9999A
Regex: /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/
```

### IFSC Format
```
Pattern: AAAA0XXXXXX
Regex: /^[A-Z]{4}0[A-Z0-9]{6}$/
```

---

**Created:** November 17, 2025
**Version:** 1.0
**Agent:** Agent 1
