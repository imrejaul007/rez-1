# Payment Verification Testing Guide

## Overview
Comprehensive testing guide for the payment verification system. Covers all verification methods, edge cases, and error scenarios.

## Test Environment Setup

### Prerequisites
```bash
# Install dependencies
npm install

# Required packages (should already be installed)
- expo-local-authentication
- expo-image-picker
- react-native-webview
- @stripe/stripe-react-native (optional)
- react-native-razorpay (optional)
```

### Mock Mode Configuration
By default, all verifications run in mock mode without backend integration.

```typescript
// services/paymentVerificationService.ts
// Mock responses are automatically used when backend calls fail
```

## Test Scenarios

### 1. Card Verification (3D Secure)

#### Test Case 1.1: Successful Card Verification
```
Steps:
1. Navigate to /account/payment
2. Click "Verify" on a card payment method
3. CardVerificationModal should open
4. Wait for mock verification to complete
5. Should see success message

Expected: Card marked as verified with green checkmark
```

#### Test Case 1.2: Card Verification with 3DS
```
Steps:
1. Click "Verify" on card (with backend integrated)
2. WebView should load with 3DS authentication page
3. Complete authentication on bank page
4. Should redirect back to app

Expected: Callback URL captured, verification completed
```

#### Test Case 1.3: User Cancels Verification
```
Steps:
1. Open card verification modal
2. Click close/cancel button
3. Confirm cancellation in dialog

Expected: Modal closes, card remains unverified
```

#### Test Case 1.4: Verification Timeout
```
Steps:
1. Initiate card verification
2. Wait for timeout period (30 minutes)
3. Try to complete verification

Expected: Error message about expired session
```

### 2. Bank Account Verification (Micro-deposits)

#### Test Case 2.1: Successful Bank Verification
```
Steps:
1. Click "Verify" on bank account
2. BankVerificationModal opens
3. Read instructions
4. Enter test amounts:
   - Amount 1: 2.45
   - Amount 2: 5.78
5. Click "Verify Deposits"

Expected: Bank account verified successfully
```

#### Test Case 2.2: Incorrect Deposit Amounts
```
Steps:
1. Open bank verification modal
2. Enter incorrect amounts:
   - Amount 1: 1.00
   - Amount 2: 2.00
3. Click "Verify Deposits"

Expected: Error message, amounts don't match
```

#### Test Case 2.3: Timeline Display
```
Steps:
1. Open bank verification modal
2. Verify timeline shows:
   - Step 1: Wait for deposits
   - Step 2: Check bank
   - Step 3: Enter amounts
3. Check expected date display

Expected: All timeline items visible, date formatted correctly
```

#### Test Case 2.4: Missing Amount Fields
```
Steps:
1. Open bank verification modal
2. Enter only one amount
3. Try to submit

Expected: Error message or disabled button
```

### 3. UPI Verification

#### Test Case 3.1: Valid UPI ID
```
Steps:
1. Click "Verify" on UPI method
2. UPIVerificationModal opens with pre-filled VPA
3. Wait for verification

Expected:
- VPA format validated
- Name retrieved (in mock: "User Name")
- Success message shown
```

#### Test Case 3.2: Invalid UPI Format
```
Steps:
1. Open UPI verification
2. Change VPA to invalid format:
   - "invalid-upi" (no @)
   - "test@" (incomplete)
   - "@paytm" (no username)
3. Click verify

Expected: Error message "Invalid UPI ID format"
```

#### Test Case 3.3: Edit UPI ID
```
Steps:
1. Open UPI verification
2. Edit the VPA field
3. Enter new valid UPI ID
4. Click verify

Expected: Verification runs with new UPI ID
```

### 4. KYC Document Upload

#### Test Case 4.1: Upload PAN Card
```
Steps:
1. Open KYC verification modal
2. Select "PAN Card" document type
3. Click front image upload area
4. Select image from gallery
5. Preview image
6. Click "Submit Documents"

Expected: Document uploaded, pending review message shown
```

#### Test Case 4.2: Upload Aadhaar (Front & Back)
```
Steps:
1. Select "Aadhaar Card" document type
2. Upload front image
3. Upload back image
4. Submit

Expected: Both images uploaded, requires back confirmation
```

#### Test Case 4.3: Missing Back Image for Aadhaar
```
Steps:
1. Select document requiring back (Aadhaar/DL)
2. Upload only front image
3. Try to submit

Expected: Submit button disabled or error message
```

#### Test Case 4.4: Document Type Selection
```
Steps:
1. Test each document type:
   - PAN Card (front only)
   - Aadhaar (front + back)
   - Passport (front only)
   - Driver's License (front + back)

Expected: Back upload shown/hidden appropriately
```

#### Test Case 4.5: Image Too Large
```
Steps:
1. Try to upload image > 5MB
2. Check validation

Expected: Error message about file size (if implemented)
```

### 5. OTP Verification

#### Test Case 5.1: Successful OTP Verification
```
Steps:
1. Open OTP verification modal
2. OTP sent automatically
3. Enter any 6 digits (mock mode)
4. Auto-submit on 6th digit

Expected: Verification successful
```

#### Test Case 5.2: Incorrect OTP
```
Steps:
1. Wait for OTP
2. Enter wrong code (with backend)
3. Submit

Expected:
- Error message shown
- Attempts decremented
- OTP fields cleared
```

#### Test Case 5.3: Resend OTP
```
Steps:
1. Wait for OTP
2. Wait for resend timer (60s)
3. Click "Resend OTP"

Expected:
- New OTP sent
- Timer resets to 60s
- Success message
```

#### Test Case 5.4: OTP Timer
```
Steps:
1. Open modal
2. Watch timer count down
3. Verify "Resend OTP in Xs" text updates
4. Button enabled when timer reaches 0

Expected: Timer counts down correctly, button state changes
```

#### Test Case 5.5: Auto-advance Between Inputs
```
Steps:
1. Open modal
2. Type digits one by one
3. Verify focus moves automatically

Expected: Each digit auto-focuses next input
```

#### Test Case 5.6: Backspace Handling
```
Steps:
1. Enter some digits
2. Press backspace on empty field
3. Should move to previous field

Expected: Focus moves backward on backspace
```

#### Test Case 5.7: Maximum Attempts Exceeded
```
Steps:
1. Enter wrong OTP 3 times

Expected:
- Modal shows max attempts message
- Modal closes
- Payment method remains unverified
```

### 6. Biometric Authentication

#### Test Case 6.1: Biometric Available
```
Steps:
1. Check if device has biometric
2. Call checkBiometricAvailability()

Expected: Returns true if available, false otherwise
```

#### Test Case 6.2: Successful Biometric Auth
```
Steps:
1. Trigger biometric verification
2. System prompt appears
3. Authenticate with fingerprint/face

Expected: Verification successful
```

#### Test Case 6.3: Biometric Auth Failed
```
Steps:
1. Trigger biometric
2. Fail authentication (wrong finger/face)

Expected: Error message, option to retry
```

#### Test Case 6.4: User Cancels Biometric
```
Steps:
1. Trigger biometric
2. Cancel system prompt

Expected: Returns to previous screen, not verified
```

## Edge Cases

### Edge Case 1: Network Offline
```
Test: Disable network, try any verification
Expected: Error message about network, option to retry
```

### Edge Case 2: App Backgrounded During Verification
```
Test: Start verification, background app, return
Expected: Session preserved or timeout message
```

### Edge Case 3: Multiple Payment Methods
```
Test: Verify multiple methods in sequence
Expected: Each verification independent, no conflicts
```

### Edge Case 4: Already Verified Method
```
Test: Try to verify already verified method
Expected: Success message or no verify button shown
```

### Edge Case 5: Expired Verification
```
Test: Wait for verification to expire
Expected: Re-verification required message
```

## Error Scenarios

### Error 1: Backend Unavailable
```
Test: Stop backend, try verification
Expected: Falls back to mock or shows retry option
```

### Error 2: Invalid Payment Method ID
```
Test: Pass invalid/null payment method ID
Expected: Error message, modal doesn't open
```

### Error 3: Gateway Error (Stripe/Razorpay)
```
Test: Simulate gateway error
Expected: Clear error message, retry option
```

### Error 4: WebView Load Failure
```
Test: Invalid 3DS URL
Expected: Error message, fallback option
```

## Integration Tests

### Integration 1: End-to-End Card Flow
```
1. Add new card → 2. Verify card → 3. Make payment → 4. Success
```

### Integration 2: End-to-End Bank Flow
```
1. Add bank → 2. Initiate verification → 3. Wait → 4. Verify amounts → 5. Success
```

### Integration 3: Multiple Verifications
```
1. Verify card → 2. Verify UPI → 3. Upload KYC → 4. All verified
```

## Performance Tests

### Performance 1: Modal Load Time
```
Test: Measure time from button click to modal display
Target: < 300ms
```

### Performance 2: Image Upload Time
```
Test: Upload 5MB image
Target: < 5 seconds
```

### Performance 3: OTP Send Time
```
Test: Time from request to OTP received
Target: < 3 seconds (with backend)
```

## Accessibility Tests

### A11y 1: Screen Reader
```
Test: Use screen reader on all modals
Expected: All elements readable, logical order
```

### A11y 2: Keyboard Navigation
```
Test: Navigate using only keyboard
Expected: All interactive elements accessible
```

### A11y 3: High Contrast Mode
```
Test: Enable high contrast
Expected: All text readable, buttons visible
```

## Platform-Specific Tests

### iOS Tests
- Face ID authentication
- WebView 3DS flow
- Image picker
- Modal presentations
- Keyboard behavior

### Android Tests
- Fingerprint authentication
- WebView 3DS flow
- Image picker
- Modal presentations
- Back button handling

### Web Tests
- Browser-based 3DS (if applicable)
- File upload via browser
- Modal behavior
- Responsive design

## Test Data

### Valid UPI IDs
```
test@paytm
user@gpay
merchant@phonepe
valid@upi
```

### Invalid UPI IDs
```
invalid-upi (no @)
test@ (incomplete)
@paytm (no username)
test@@paytm (double @)
```

### Test Card Numbers (Stripe)
```
4242424242424242 - Success
4000000000003220 - 3DS Required
4000000000000002 - Card Declined
```

### Test Bank Amounts
```
Correct: 2.45, 5.78
Incorrect: 1.00, 2.00
```

## Automated Test Scripts

### Unit Tests
```typescript
// Example: UPI validation
describe('UPI Verification', () => {
  it('validates correct UPI format', () => {
    expect(validateUPIVPA('user@paytm')).toBe(true);
  });

  it('rejects invalid UPI format', () => {
    expect(validateUPIVPA('invalid')).toBe(false);
  });
});
```

### Integration Tests
```typescript
// Example: Full verification flow
describe('Card Verification Flow', () => {
  it('completes verification successfully', async () => {
    const result = await verifyCard({ paymentMethodId: 'pm_123' });
    expect(result.status).toBe('VERIFIED');
  });
});
```

## Regression Tests

After each change, verify:
1. All modals still open correctly
2. Verification flows complete
3. Status badges update
4. Error messages display
5. Success callbacks fire

## Monitoring & Logging

### Key Metrics to Track
- Verification success rate by type
- Average completion time
- Drop-off points
- Error rates
- Fraud detection triggers

### Log Events
```typescript
console.log('🔒 [VERIFICATION] Started:', type);
console.log('✅ [VERIFICATION] Success:', result);
console.log('❌ [VERIFICATION] Failed:', error);
```

## Checklist

Before marking verification as complete:

- [ ] All 6 verification types tested
- [ ] All modals open and close properly
- [ ] Success flows work
- [ ] Error handling works
- [ ] Edge cases handled
- [ ] Loading states display
- [ ] Accessibility verified
- [ ] iOS tested
- [ ] Android tested
- [ ] Web tested (if applicable)
- [ ] Backend integration tested
- [ ] Mock mode works
- [ ] Documentation updated
- [ ] Analytics events fire

## Known Issues

Track known issues here:
1. WebView not available in Expo Go (expected)
2. Biometric requires device support (expected)
3. [Add any discovered issues]

## Next Testing Phase

1. Beta user testing
2. Security audit
3. Performance testing
4. Stress testing
5. Production monitoring setup

---

**Testing Status:** Ready for comprehensive testing
**Last Updated:** January 2025
