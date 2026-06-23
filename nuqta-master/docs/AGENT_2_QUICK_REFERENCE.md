# Agent 2 - Quick Reference for Integration

## For Agent 1 (ReportModal Creator)

### Required Modal Component Location
```
frontend/components/ugc/ReportModal.tsx
```

### Required Props Interface
```typescript
interface ReportModalProps {
  visible: boolean;
  onClose: () => void;
  videoId: string;
  videoTitle: string;
  onReportSuccess: () => void;
}
```

### How to Activate After Creation
1. Go to `frontend/app/UGCDetailScreen.tsx`
2. **Line 16**: Uncomment the import
   ```typescript
   import ReportModal from '@/components/ugc/ReportModal';
   ```
3. **Lines 358-366**: Uncomment the component
   ```tsx
   <ReportModal
     visible={reportModalVisible}
     onClose={() => setReportModalVisible(false)}
     videoId={item.id}
     videoTitle={item.description}
     onReportSuccess={handleReportSuccess}
   />
   ```

### Modal Behavior Expected
- Show modal when `visible={true}`
- Call `onReportSuccess()` after successful API submission
- Call `onClose()` on cancel or after success
- Handle all loading/error states internally

---

## For Agent 3 (Toast Notification)

### Location to Add Toast
- **File**: `frontend/app/UGCDetailScreen.tsx`
- **Function**: `handleReportSuccess()`
- **Line**: 197

### Current Code
```typescript
const handleReportSuccess = () => {
  setReportModalVisible(false);
  setIsReported(true);
  // Agent 3 will add toast notification here
  console.log('Video reported successfully');
};
```

### Suggested Toast Implementation
```typescript
const handleReportSuccess = () => {
  setReportModalVisible(false);
  setIsReported(true);

  // Add this:
  showToast({
    message: 'Video reported successfully. Thank you for your feedback.',
    type: 'success',
    duration: 3000
  });
};
```

### Required Import (if not already present)
```typescript
import { showToast } from '@/components/common/ToastManager';
```

---

## Files Modified

### ✅ Complete
- `frontend/app/UGCDetailScreen.tsx` (60+ lines added/modified)

### ⏳ Waiting for Other Agents
- `frontend/components/ugc/ReportModal.tsx` (Agent 1)
- Toast notification in `handleReportSuccess()` (Agent 3)

---

## State Management Summary

```typescript
// Added state
const [reportModalVisible, setReportModalVisible] = useState(false);
const [isReported, setIsReported] = useState(false);
const { state: authState } = useAuth();

// Added handlers
const handleReportPress = () => { /* Auth check + modal control */ };
const handleReportSuccess = () => { /* Close modal + update state */ };
```

---

## Visual Summary

### Button States
1. **Active**: Red background, outline icon, "Report" text
2. **Reported**: Gray background, filled icon, "Reported" text, disabled

### Button Location
Header right section, first element before product count and view count badges.

---

## Testing After Full Integration

```bash
# After Agent 1 completes ReportModal:
1. Uncomment lines 16 and 358-366 in UGCDetailScreen.tsx
2. Test report flow with authentication
3. Verify modal opens and closes correctly

# After Agent 3 adds toast:
4. Verify success toast appears after report
5. Test all flows end-to-end
```

---

## Contact Points Between Agents

```
Agent 1 → Agent 2: ReportModal component creation
Agent 2 → Agent 1: Props interface & integration location
Agent 2 → Agent 3: Toast notification location
Agent 3 → Agent 2: Toast implementation in handleReportSuccess
```

---

**Status**: Agent 2 work is 100% complete and ready for integration.
