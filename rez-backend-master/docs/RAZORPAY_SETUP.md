# 🔐 Razorpay Payment Gateway Setup Guide

## Step 1: Sign Up for Razorpay

1. Go to [https://razorpay.com](https://razorpay.com)
2. Click "Sign Up" and create an account
3. Complete KYC verification (for production)

---

## Step 2: Get API Keys

### Test Mode (Development):

1. Go to **Dashboard** → **Settings** → **API Keys**
2. Click on "Generate Test Key"
3. You'll get:
   - **Key ID**: `rzp_test_xxxxxxxxxxxxxx`
   - **Key Secret**: `xxxxxxxxxxxxxxxxxxxxxx`

### Live Mode (Production):

1. Complete KYC verification
2. Go to **Dashboard** → **Settings** → **API Keys**
3. Switch to "Live Mode"
4. Click "Generate Live Key"
5. You'll get:
   - **Key ID**: `rzp_live_xxxxxxxxxxxxxx`
   - **Key Secret**: `xxxxxxxxxxxxxxxxxxxxxx`

---

## Step 3: Add Keys to Backend

Add these environment variables to your `user-backend/.env` file:

```bash
# Razorpay Payment Gateway
RAZORPAY_KEY_ID=rzp_test_xxxxxxxxxxxxx
RAZORPAY_KEY_SECRET=xxxxxxxxxxxxxxxxxxxxx
```

**Important:**
- Use **test keys** for development
- Use **live keys** only in production
- **NEVER** commit `.env` file to Git
- Keep your Key Secret confidential

---

## Step 4: Test Payment Flow

### Test Mode Credentials:

Razorpay provides these test credentials:

#### UPI (Always Successful):
- VPA: `success@razorpay`
- Status: Payment succeeds

#### UPI (Always Failed):
- VPA: `failure@razorpay`
- Status: Payment fails

#### Test Cards:

**Successful Payment:**
- Card Number: `4111 1111 1111 1111`
- CVV: Any 3 digits
- Expiry: Any future date
- Name: Any name

**Failed Payment:**
- Card Number: `4000 0000 0000 0002`
- CVV: Any 3 digits
- Expiry: Any future date

#### Net Banking:
- Select any bank
- Use test credentials provided by Razorpay

---

## Step 5: Configure Webhooks (Optional)

Webhooks let you receive real-time notifications about payments.

### Setup:

1. Go to **Dashboard** → **Settings** → **Webhooks**
2. Click "Add New Webhook"
3. Enter webhook URL: `https://your-domain.com/api/razorpay/webhook`
4. Select events to track:
   - `payment.captured`
   - `payment.failed`
   - `refund.created`
5. Copy the **Webhook Secret**
6. Add to `.env`:
   ```bash
   RAZORPAY_WEBHOOK_SECRET=your_webhook_secret
   ```

---

## Step 6: Test in Your App

### Start Backend:
```bash
cd user-backend
npm start
```

### Start Frontend:
```bash
cd frontend
npm start
```

### Test Flow:

1. **Add items to cart**
2. **Go to checkout**
3. **Click "Other payment mode"**
4. **Click "Pay Instantly" button**
5. **Razorpay modal opens**
6. **Select payment method:**
   - UPI: Enter `success@razorpay`
   - Card: Use test card `4111 1111 1111 1111`
   - Net Banking: Select any bank
7. **Complete payment**
8. **Order should be created successfully**

---

## Step 7: Go Live (Production)

### Before Going Live:

✅ **Complete KYC**
   - Submit business documents
   - Wait for approval (usually 1-2 days)

✅ **Update Keys**
   - Replace test keys with live keys in `.env`
   - Set `NODE_ENV=production`

✅ **Test Thoroughly**
   - Test successful payments
   - Test failed payments
   - Test refunds
   - Verify order creation

✅ **Configure Domain**
   - Add your production domain to Razorpay dashboard
   - Update CORS settings

✅ **Monitor Transactions**
   - Check Razorpay dashboard regularly
   - Monitor webhook events
   - Track payment success rate

---

## Payment Gateway Features

### ✅ Implemented:

- 💳 Create Razorpay orders
- ✅ Verify payment signatures
- 📊 Fetch payment details
- 💰 Create refunds
- 🔔 Webhook support
- 🔐 Secure signature verification
- 🎨 Branded checkout experience

### Payment Methods Supported:

- **UPI**: PhonePe, Google Pay, Paytm, etc.
- **Cards**: Visa, Mastercard, Rupay, Amex
- **Net Banking**: All major banks
- **Wallets**: Paytm, PhonePe, Mobikwik, etc.
- **EMI**: Credit card EMI (if enabled)

---

## Pricing

### Razorpay Charges:

- **Domestic Cards**: 2% per transaction
- **Domestic UPI**: ₹3 per transaction (up to ₹2000), 1.5% (above ₹2000)
- **International Cards**: 3% + ₹20 per transaction
- **Net Banking**: 2% per transaction
- **Wallets**: 2% per transaction

**Note:** Pricing may vary. Check latest pricing on [Razorpay website](https://razorpay.com/pricing/).

---

## Troubleshooting

### Issue: "Razorpay script failed to load"

**Solution:**
- Check internet connection
- Check if Razorpay CDN is accessible
- Try reloading the page

### Issue: "Invalid API Key"

**Solution:**
- Verify `RAZORPAY_KEY_ID` in `.env`
- Ensure you're using correct mode (test/live)
- Restart backend server after changing `.env`

### Issue: "Signature verification failed"

**Solution:**
- Verify `RAZORPAY_KEY_SECRET` in `.env`
- Check if secret matches the key ID
- Ensure no extra spaces in `.env` values

### Issue: "Payment successful but order not created"

**Solution:**
- Check backend logs for errors
- Verify order creation API is working
- Check database connection
- Ensure cart is not empty

---

## Security Best Practices

### ✅ DO:

- Always verify payment signatures on backend
- Use HTTPS in production
- Keep Key Secret confidential
- Validate payment amount on backend
- Implement rate limiting
- Log all transactions
- Use webhooks for critical updates

### ❌ DON'T:

- Never expose Key Secret in frontend
- Don't skip signature verification
- Don't trust client-side payment status
- Don't commit `.env` to Git
- Don't use test keys in production

---

## Support

### Razorpay Support:

- **Documentation**: [https://razorpay.com/docs/](https://razorpay.com/docs/)
- **Support Email**: support@razorpay.com
- **Phone**: 1800-120-3456 (India)
- **Chat**: Available in dashboard

### Need Help?

If you encounter any issues:

1. Check backend console for errors
2. Check frontend console for errors
3. Verify `.env` configuration
4. Test with Razorpay test credentials
5. Check Razorpay dashboard for transaction status

---

## Quick Reference

### Environment Variables:

```bash
RAZORPAY_KEY_ID=rzp_test_xxxxxxxxxxxxx
RAZORPAY_KEY_SECRET=xxxxxxxxxxxxxxxxxxxxx
NODE_ENV=development
```

### API Endpoints:

- `POST /api/razorpay/create-order` - Create payment order
- `POST /api/razorpay/verify-payment` - Verify payment
- `GET /api/razorpay/config` - Get public config
- `POST /api/razorpay/webhook` - Webhook handler
- `POST /api/razorpay/refund` - Create refund

### Frontend Usage:

```typescript
// Open Razorpay checkout
handlers.handleRazorpayPayment({
  name: 'John Doe',
  email: 'john@example.com',
  phone: '9999999999'
});
```

---

## 🎉 You're All Set!

Your Razorpay integration is ready to accept payments!

**Next Steps:**
1. Get your API keys
2. Add to `.env`
3. Restart backend
4. Test with test credentials
5. Go live after KYC approval

**Happy Selling! 🚀**

