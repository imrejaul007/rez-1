// This file is kept for backward compatibility.
// The actual error handling is implemented in errorHandler.ts
// which provides comprehensive error handling with:
// - Mongoose validation error handling
// - Duplicate key error handling
// - JWT token error handling
// - Service-specific error handling (Twilio, SendGrid, Stripe, Razorpay)
// - Structured logging via createServiceLogger
// - Correlation ID tracking
// - Sentry integration
