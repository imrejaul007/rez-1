# Upload Configuration - Documentation Index

**Version:** 1.0.0
**Status:** Ready for Migration
**Created:** 2025-11-03
**Current Progress:** 0% (40 files need migration)

---

## Quick Links

| Document | Purpose | When to Use |
|----------|---------|-------------|
| [Quick Reference](UPLOAD_CONFIG_QUICK_REFERENCE.md) | Single-page cheat sheet | Daily development |
| [Full Guide](UPLOAD_CONFIG_GUIDE.md) | Complete documentation | Deep dive, learning |
| [Implementation Summary](UPLOAD_CONFIG_IMPLEMENTATION_SUMMARY.md) | Project status & overview | Project management |
| [Architecture](UPLOAD_CONFIG_ARCHITECTURE.md) | Visual diagrams & flows | Understanding structure |

---

## Getting Started

### For New Developers

1. **Start here:** [Quick Reference](UPLOAD_CONFIG_QUICK_REFERENCE.md)
   - Learn the basic imports
   - See common usage patterns
   - Copy-paste code snippets

2. **Then read:** [Full Guide](UPLOAD_CONFIG_GUIDE.md) - Configuration Structure
   - Understand what each config section does
   - Learn the helper functions
   - See complete examples

3. **Explore:** [Architecture](UPLOAD_CONFIG_ARCHITECTURE.md)
   - See visual flow diagrams
   - Understand data flow
   - Learn error handling patterns

### For Project Leads

1. **Start here:** [Implementation Summary](UPLOAD_CONFIG_IMPLEMENTATION_SUMMARY.md)
   - Current migration status
   - Priority files
   - Timeline and next steps

2. **Then review:** [Full Guide](UPLOAD_CONFIG_GUIDE.md) - Migration Guide
   - Migration process
   - Testing requirements
   - Verification steps

3. **Monitor:** Run verification script
   ```bash
   node scripts/verify-upload-config.js
   ```

### For Migrating Existing Code

1. **Run verification:**
   ```bash
   cd frontend
   node scripts/verify-upload-config.js
   ```

2. **Read migration guide:** [Full Guide](UPLOAD_CONFIG_GUIDE.md) - Migration Guide
   - Step-by-step instructions
   - Before/after examples
   - Best practices

3. **Use migration tool:**
   ```bash
   # Dry run to see changes
   node scripts/migrate-to-upload-config.js --dry-run

   # Apply with backups
   node scripts/migrate-to-upload-config.js --auto --backup
   ```

4. **Verify completion:**
   ```bash
   node scripts/verify-upload-config.js
   ```

---

## Document Overview

### 1. Quick Reference (UPLOAD_CONFIG_QUICK_REFERENCE.md)
**Best for:** Daily development reference

**Contains:**
- Common configuration values table
- Helper function signatures
- Code snippets for common tasks
- Error classification
- Migration checklist

**Use when:**
- You need a quick lookup
- Writing new code
- Reviewing PRs
- Learning the API

**Length:** ~200 lines

---

### 2. Full Guide (UPLOAD_CONFIG_GUIDE.md)
**Best for:** Comprehensive understanding

**Contains:**
- Complete configuration documentation
- Detailed migration guide
- Usage examples for all scenarios
- Helper function documentation
- Best practices
- Troubleshooting

**Use when:**
- Learning the system
- Migrating code
- Need detailed examples
- Solving complex problems

**Length:** ~800 lines

**Sections:**
1. Quick Start
2. Configuration Structure (all 11 sections)
3. Migration Guide
4. Usage Examples (5 real-world scenarios)
5. Helper Functions
6. Best Practices
7. Verification

---

### 3. Implementation Summary (UPLOAD_CONFIG_IMPLEMENTATION_SUMMARY.md)
**Best for:** Project management and status

**Contains:**
- Executive summary
- Files created
- Current migration status
- Priority files list
- All 40 files needing migration
- Configuration values table
- Migration process
- Benefits and next steps

**Use when:**
- Planning sprints
- Tracking progress
- Onboarding new team members
- Reporting to stakeholders

**Length:** ~600 lines

**Key Sections:**
- Current State (with verification results)
- Migration Status (0% progress tracker)
- Priority Files (8 critical files)
- Complete file list (40 files)

---

### 4. Architecture (UPLOAD_CONFIG_ARCHITECTURE.md)
**Best for:** Understanding system design

**Contains:**
- Visual diagrams (ASCII art)
- Configuration structure tree
- Helper function flows
- Retry logic visualization
- Network adaptive flow
- Queue processing flow
- File validation pipeline
- Migration workflow
- Complete upload flow example
- Error hierarchy
- Performance considerations

**Use when:**
- Understanding data flow
- Debugging complex issues
- Designing new features
- Code reviews
- Architecture discussions

**Length:** ~500 lines

**Diagrams:**
- System overview
- Configuration tree
- Validation flow
- Error handling flow
- Retry logic with exponential backoff
- Network detection and adaptation
- Queue system
- File validation pipeline
- Migration process
- Complete upload flow
- Error hierarchy
- Performance optimization

---

## Core Files

### Configuration File
**Location:** `frontend/config/uploadConfig.ts`

**Exports:**
```typescript
// Configuration sections
export const FILE_SIZE_LIMITS = { ... };
export const ALLOWED_FILE_FORMATS = { ... };
export const UPLOAD_CONFIG = { ... };
export const QUEUE_CONFIG = { ... };
export const IMAGE_QUALITY_CONFIG = { ... };
export const RETRYABLE_ERRORS = [ ... ];
export const NON_RETRYABLE_ERRORS = [ ... ];
export const PROGRESS_CONFIG = { ... };
export const ANALYTICS_CONFIG = { ... };
export const NETWORK_ADAPTIVE_CONFIG = { ... };
export const BILL_SPECIFIC_CONFIG = { ... };

// Consolidated export
export const BILL_UPLOAD_CONFIG = { ... };

// Helper functions
export const shouldRetryError = (errorCode: string): boolean => { ... };
export const isValidFileFormat = (mimeType: string): boolean => { ... };
export const isValidExtension = (extension: string): boolean => { ... };
export const isValidFileSize = (size: number): boolean => { ... };
export const calculateRetryDelay = (attemptNumber: number): number => { ... };

// Types
export type RetryableError = ...;
export type NonRetryableError = ...;
export type AllowedImageFormat = ...;
export type AllowedExtension = ...;
```

**Size:** ~350 lines

---

### Verification Script
**Location:** `frontend/scripts/verify-upload-config.js`

**Purpose:** Scan codebase and track migration progress

**Usage:**
```bash
node scripts/verify-upload-config.js
```

**Output:**
- ✅ Config integrity check
- 📦 Available configuration objects
- 🔍 Files with hardcoded values
- 📋 Migration recommendations
- 📊 Progress statistics

**Size:** ~400 lines

---

### Migration Script
**Location:** `frontend/scripts/migrate-to-upload-config.js`

**Purpose:** Automate migration from hardcoded values

**Usage:**
```bash
# Preview changes
node scripts/migrate-to-upload-config.js --dry-run

# Interactive migration
node scripts/migrate-to-upload-config.js

# Automatic with backups
node scripts/migrate-to-upload-config.js --auto --backup

# Specific file
node scripts/migrate-to-upload-config.js --file=services/billUploadService.ts
```

**Features:**
- Automatic pattern replacement
- Import injection
- Before/after diff display
- Backup file creation
- Interactive confirmation
- Dry-run mode

**Size:** ~450 lines

---

## Common Scenarios

### Scenario 1: "I need to validate a file before upload"

**Reference:** [Quick Reference](UPLOAD_CONFIG_QUICK_REFERENCE.md) - File Validation

```typescript
import { isValidFileSize, isValidFileFormat } from '@/config/uploadConfig';

if (!isValidFileSize(file.size) || !isValidFileFormat(file.type)) {
  throw new Error('Invalid file');
}
```

---

### Scenario 2: "I need to implement retry logic"

**Reference:** [Full Guide](UPLOAD_CONFIG_GUIDE.md) - Example 2: Upload Service with Retry Logic

```typescript
import { BILL_UPLOAD_CONFIG, shouldRetryError, calculateRetryDelay } from '@/config/uploadConfig';

const { MAX_RETRIES, TIMEOUT_MS } = BILL_UPLOAD_CONFIG.UPLOAD_CONFIG;

while (attempt < MAX_RETRIES) {
  try {
    return await upload(file, { timeout: TIMEOUT_MS });
  } catch (error) {
    if (!shouldRetryError(error.code)) throw error;
    await new Promise(r => setTimeout(r, calculateRetryDelay(attempt)));
  }
}
```

---

### Scenario 3: "I need to understand the upload flow"

**Reference:** [Architecture](UPLOAD_CONFIG_ARCHITECTURE.md) - Complete Upload Flow

See the visual diagram showing the complete flow from file selection to upload completion.

---

### Scenario 4: "I need to migrate a file"

**Reference:** [Full Guide](UPLOAD_CONFIG_GUIDE.md) - Migration Guide

**Steps:**
1. Run verification to see what needs changing
2. Add import: `import { BILL_UPLOAD_CONFIG } from '@/config/uploadConfig';`
3. Replace hardcoded values with config references
4. Use helper functions
5. Verify with script

---

### Scenario 5: "I need to add a new upload configuration"

**Reference:** [Implementation Summary](UPLOAD_CONFIG_IMPLEMENTATION_SUMMARY.md) - Maintenance

**Steps:**
1. Add to `config/uploadConfig.ts` in appropriate section
2. Export from section
3. Add to `BILL_UPLOAD_CONFIG` consolidated export
4. Update documentation
5. Add pattern to verification script

---

## Migration Status

### Current State
- **Total files:** 40
- **Migrated:** 0
- **Progress:** 0%
- **Status:** Ready for migration

### Priority Files (Migrate First)

1. **services/billUploadService.ts** - Core upload logic
2. **services/billUploadQueueService.ts** - Queue management
3. **services/billUploadAnalytics.ts** - Analytics
4. **services/fileUploadService.ts** - File handling
5. **services/imageUploadService.ts** - Image processing
6. **utils/fileUploadConstants.ts** - Can be deprecated after migration
7. **utils/billUploadErrors.ts** - Error handling
8. **utils/imageQualityValidator.ts** - Quality checks

### Verification

Run this command to check current status:

```bash
cd frontend
node scripts/verify-upload-config.js
```

Expected output when complete:
```
✅ All integrity checks passed!
✅ All files are using the centralized config!
Migration Progress: 100%
```

---

## Tools & Commands

### Verification
```bash
# Check migration status
node scripts/verify-upload-config.js
```

### Migration
```bash
# Dry run - preview changes
node scripts/migrate-to-upload-config.js --dry-run

# Interactive - confirm each file
node scripts/migrate-to-upload-config.js

# Auto - apply all changes
node scripts/migrate-to-upload-config.js --auto --backup

# Single file
node scripts/migrate-to-upload-config.js --file=<path>
```

### Testing
```bash
# Run tests after migration
npm test

# Run specific upload tests
npm test -- billUpload
```

---

## Best Practices

1. ✅ **Always import from config** - Never hardcode upload values
2. ✅ **Use helper functions** - Leverage provided utilities
3. ✅ **Destructure values** - Makes code more readable
4. ✅ **Run verification** - Before committing changes
5. ✅ **Test after migration** - Ensure functionality works

---

## Troubleshooting

### Problem: Import errors

**Solution:** Check import path
```typescript
// Correct
import { BILL_UPLOAD_CONFIG } from '@/config/uploadConfig';

// Incorrect
import { BILL_UPLOAD_CONFIG } from 'config/uploadConfig';
```

**Reference:** [Full Guide](UPLOAD_CONFIG_GUIDE.md) - Troubleshooting

---

### Problem: TypeScript type errors

**Solution:** Import types
```typescript
import type { RetryableError } from '@/config/uploadConfig';
```

**Reference:** [Full Guide](UPLOAD_CONFIG_GUIDE.md) - Troubleshooting

---

### Problem: Config is readonly

**Solution:** Create new object if needed
```typescript
// Don't modify config
// BILL_UPLOAD_CONFIG.UPLOAD_CONFIG.TIMEOUT_MS = 120000; // ❌

// Create new object
const custom = { ...BILL_UPLOAD_CONFIG.UPLOAD_CONFIG, TIMEOUT_MS: 120000 }; // ✅
```

**Reference:** [Full Guide](UPLOAD_CONFIG_GUIDE.md) - Best Practices

---

## Support & Resources

### Documentation Files

| File | Purpose | Lines |
|------|---------|-------|
| `config/uploadConfig.ts` | Configuration source | ~350 |
| `UPLOAD_CONFIG_QUICK_REFERENCE.md` | Daily reference | ~200 |
| `UPLOAD_CONFIG_GUIDE.md` | Full documentation | ~800 |
| `UPLOAD_CONFIG_IMPLEMENTATION_SUMMARY.md` | Status & overview | ~600 |
| `UPLOAD_CONFIG_ARCHITECTURE.md` | Visual diagrams | ~500 |
| `scripts/verify-upload-config.js` | Verification tool | ~400 |
| `scripts/migrate-to-upload-config.js` | Migration tool | ~450 |

### Quick Access

- 🚀 **Quick Start:** [Quick Reference](UPLOAD_CONFIG_QUICK_REFERENCE.md)
- 📚 **Learn:** [Full Guide](UPLOAD_CONFIG_GUIDE.md)
- 📊 **Track:** [Implementation Summary](UPLOAD_CONFIG_IMPLEMENTATION_SUMMARY.md)
- 🏗️ **Understand:** [Architecture](UPLOAD_CONFIG_ARCHITECTURE.md)
- ✅ **Verify:** `node scripts/verify-upload-config.js`
- 🔄 **Migrate:** `node scripts/migrate-to-upload-config.js`

---

## Roadmap

### Phase 1: Foundation ✅ COMPLETE
- [x] Create configuration file
- [x] Add helper functions
- [x] Create verification script
- [x] Create migration script
- [x] Write documentation

### Phase 2: Migration 🔄 IN PROGRESS (0%)
- [ ] Migrate priority files (8 files)
- [ ] Migrate service files (18 files)
- [ ] Migrate util files (11 files)
- [ ] Migrate component files (3 files)
- [ ] Test all migrations

### Phase 3: Cleanup ⏳ PENDING
- [ ] Remove duplicate constants
- [ ] Deprecate old files
- [ ] Update tests
- [ ] Final verification

### Phase 4: Maintenance ⏳ ONGOING
- [ ] Add to CI/CD pipeline
- [ ] Monitor new PRs
- [ ] Update documentation
- [ ] Extend as needed

---

## Metrics & Goals

### Target Metrics
- **Migration Progress:** 100%
- **Hardcoded Values:** 0
- **Test Coverage:** 100% for upload features
- **Documentation:** Complete and current

### Current Metrics
- **Migration Progress:** 0%
- **Files Remaining:** 40
- **Estimated Time:** 2-3 days (manual), 4-6 hours (automated)

---

## Version History

| Version | Date | Changes | Migrated Files |
|---------|------|---------|----------------|
| 1.0.0 | 2025-11-03 | Initial implementation | 0/40 (0%) |

---

## Contact & Support

For questions:
1. Check this index for relevant documentation
2. Read the appropriate guide
3. Run verification script
4. Check examples in Full Guide

For bugs or issues:
1. Run verification script
2. Check troubleshooting section
3. Review architecture diagrams
4. Test with migration tool

---

**Last Updated:** 2025-11-03
**Maintained By:** Development Team
**Next Review:** After migration completion
