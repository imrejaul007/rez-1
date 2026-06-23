# Security Best Practices Guide

**Version:** 1.0
**Last Updated:** November 17, 2025
**Audience:** All Backend Developers
**Scope:** Merchant Backend Application

---

## Table of Contents

1. [Introduction](#1-introduction)
2. [Authentication & Authorization](#2-authentication--authorization)
3. [Input Validation & Sanitization](#3-input-validation--sanitization)
4. [Data Protection](#4-data-protection)
5. [API Security](#5-api-security)
6. [Database Security](#6-database-security)
7. [Error Handling](#7-error-handling)
8. [File Upload Security](#8-file-upload-security)
9. [Session Management](#9-session-management)
10. [Logging & Monitoring](#10-logging--monitoring)
11. [Code Security](#11-code-security)
12. [Deployment Security](#12-deployment-security)

---

## 1. Introduction

This document provides security best practices for developing and maintaining the merchant backend application. All developers must follow these guidelines to ensure the security of our systems and data.

### 1.1 Security Principles

**Defense in Depth**
- Implement multiple layers of security
- Don't rely on a single control
- Example: Authentication + Validation + Sanitization + Business Logic

**Least Privilege**
- Grant minimum necessary permissions
- Use role-based access control (RBAC)
- Regularly review and audit permissions

**Fail Securely**
- Default to deny access
- Handle errors without exposing sensitive information
- Log failures for investigation

**Security by Design**
- Consider security from the start
- Threat modeling during design phase
- Security reviews before deployment

---

## 2. Authentication & Authorization

### 2.1 Password Management

#### ✅ DO
```typescript
import bcrypt from 'bcryptjs';

// Hash passwords with bcrypt (12+ rounds)
const hashedPassword = await bcrypt.hash(password, 12);

// Enforce password strength
const passwordSchema = Joi.string()
  .min(8)
  .max(128)
  .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
  .required();
```

#### ❌ DON'T
```typescript
// NEVER store plaintext passwords
const user = { password: req.body.password }; // ❌

// NEVER use weak hashing
const hash = crypto.createHash('md5').update(password).digest('hex'); // ❌

// NEVER log passwords
console.log('User password:', password); // ❌
```

### 2.2 JWT Token Security

#### ✅ DO
```typescript
// Use strong secrets (min 32 chars)
const token = jwt.sign({ userId }, process.env.JWT_SECRET, {
  expiresIn: '7d'
});

// Validate all JWT claims
const decoded = jwt.verify(token, process.env.JWT_SECRET);
if (decoded.exp < Date.now() / 1000) {
  throw new Error('Token expired');
}

// Use different secrets for different purposes
const userToken = jwt.sign(payload, process.env.JWT_SECRET);
const merchantToken = jwt.sign(payload, process.env.JWT_MERCHANT_SECRET);
```

#### ❌ DON'T
```typescript
// NEVER use default/weak secrets
const token = jwt.sign({ userId }, 'secret'); // ❌

// NEVER include sensitive data in JWT payload
const token = jwt.sign({ password, creditCard }, secret); // ❌

// NEVER skip expiration
const token = jwt.sign({ userId }, secret); // No expiresIn ❌
```

### 2.3 Access Control

#### ✅ DO
```typescript
// Verify user ownership
router.get('/orders/:id', authenticate, async (req, res) => {
  const order = await Order.findById(req.params.id);

  // Check if order belongs to requesting user
  if (order.userId.toString() !== req.userId) {
    return res.status(403).json({ error: 'Access denied' });
  }

  res.json(order);
});

// Use RBAC for merchants
router.delete('/products/:id',
  merchantAuth,
  requirePermission('products_delete'),
  deleteProduct
);
```

#### ❌ DON'T
```typescript
// NEVER trust client-provided IDs without verification
router.get('/orders/:id', async (req, res) => {
  const order = await Order.findById(req.params.id);
  res.json(order); // ❌ No ownership check
});

// NEVER use client-provided role
if (req.body.role === 'admin') { // ❌ Client controls role
  // Grant admin access
}
```

---

## 3. Input Validation & Sanitization

### 3.1 Validation

#### ✅ DO
```typescript
import { validateBody } from './middleware/validationMiddleware';
import { createProductSchema } from './validators/productValidators';

// Always validate user input
router.post('/products',
  validateBody(createProductSchema),
  createProduct
);

// Validate all sources (body, query, params)
router.get('/products',
  validateQuery(queryProductsSchema),
  getProducts
);

// Validate nested objects
const addressSchema = Joi.object({
  street: Joi.string().trim().max(200).required(),
  city: Joi.string().trim().max(100).required(),
  postalCode: Joi.string().trim().max(20).required()
});
```

#### ❌ DON'T
```typescript
// NEVER trust user input without validation
router.post('/products', async (req, res) => {
  const product = await Product.create(req.body); // ❌ No validation
});

// NEVER use loose validation
const schema = Joi.object({
  name: Joi.string(), // ❌ No length limits, not required
  price: Joi.number()  // ❌ Can be negative, no precision
});

// NEVER skip validation on "internal" endpoints
router.post('/admin/users', async (req, res) => {
  // ❌ Even admin endpoints need validation
  const user = await User.create(req.body);
});
```

### 3.2 Sanitization

#### ✅ DO
```typescript
import { sanitizeRequest } from './middleware/sanitization';

// Apply sanitization middleware
app.use(sanitizeRequest);

// Use specialized sanitizers
const email = sanitizeEmail(req.body.email);
const objectId = sanitizeObjectId(req.params.id);

// Escape HTML for display
const safeContent = validator.escape(userGeneratedContent);
```

#### ❌ DON'T
```typescript
// NEVER render user input without sanitization
res.send(`<h1>${req.body.title}</h1>`); // ❌ XSS vulnerability

// NEVER trust "safe" sources
const adminInput = req.body.content; // ❌ Still validate/sanitize

// NEVER use innerHTML with user data
const html = `<div>${userContent}</div>`; // ❌ XSS risk
```

---

## 4. Data Protection

### 4.1 Encryption

#### ✅ DO
```typescript
import { encrypt, decrypt } from './utils/encryption';

// Encrypt sensitive fields before storage
const encryptedAccount = encrypt(bankAccountNumber);
await merchant.update({ bankAccount: encryptedAccount });

// Use proper encryption algorithm (AES-256-GCM)
const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);

// Generate strong random tokens
const resetToken = crypto.randomBytes(32).toString('hex');
```

#### ❌ DON'T
```typescript
// NEVER store sensitive data in plaintext
await merchant.update({
  bankAccount: req.body.accountNumber // ❌ Plaintext
});

// NEVER use weak encryption
const cipher = crypto.createCipheriv('des', key, iv); // ❌ Weak algorithm

// NEVER reuse IVs
const iv = Buffer.from('1234567890123456'); // ❌ Static IV
```

### 4.2 Data Masking

#### ✅ DO
```typescript
import { maskSensitiveData } from './utils/encryption';

// Mask sensitive data in logs
console.log('Account:', maskSensitiveData(accountNumber)); // 1234****5678

// Remove sensitive fields from API responses
const userResponse = {
  ...user.toObject(),
  password: undefined,
  refreshToken: undefined
};

// Use .select() to exclude sensitive fields
const user = await User.findById(id).select('-password -refreshToken');
```

#### ❌ DON'T
```typescript
// NEVER log sensitive data
console.log('Payment:', creditCard); // ❌

// NEVER return sensitive fields in API
res.json(user); // ❌ Includes password, tokens

// NEVER expose internal IDs
res.json({ internalId: user._internalId }); // ❌
```

---

## 5. API Security

### 5.1 Rate Limiting

#### ✅ DO
```typescript
import { authLimiter, generalLimiter } from './middleware/rateLimiter';

// Apply rate limiting to all endpoints
app.use('/api', generalLimiter);

// Use stricter limits for authentication
router.post('/login', authLimiter, login);

// Different limits for different operations
router.post('/upload', uploadLimiter, upload);
```

#### ❌ DON'T
```typescript
// NEVER disable rate limiting in production
if (process.env.NODE_ENV === 'production') {
  // app.use(rateLimiter); // ❌ Commented out
}

// NEVER use same limit for all endpoints
const limiter = rateLimit({ max: 100 }); // ❌ Too generic
app.use(limiter);
```

### 5.2 CORS

#### ✅ DO
```typescript
import { corsMiddleware } from './middleware/corsConfig';

// Use environment-based whitelist
const allowedOrigins = process.env.CORS_ORIGIN.split(',');

// Strict CORS in production
if (process.env.NODE_ENV === 'production') {
  app.use(cors({
    origin: allowedOrigins,
    credentials: true
  }));
}
```

#### ❌ DON'T
```typescript
// NEVER allow all origins in production
app.use(cors({ origin: '*' })); // ❌ Security risk

// NEVER trust Origin header without validation
const origin = req.headers.origin;
res.setHeader('Access-Control-Allow-Origin', origin); // ❌
```

---

## 6. Database Security

### 6.1 Query Safety

#### ✅ DO
```typescript
// Use Mongoose (parameterized queries)
const user = await User.findOne({ email: req.body.email });

// Validate ObjectIds
if (!mongoose.Types.ObjectId.isValid(id)) {
  return res.status(400).json({ error: 'Invalid ID' });
}

// Use safe operators
const products = await Product.find({
  price: { $gte: minPrice, $lte: maxPrice }
});
```

#### ❌ DON'T
```typescript
// NEVER build queries with string concatenation
const query = `SELECT * FROM users WHERE email = '${req.body.email}'`; // ❌ SQL injection

// NEVER allow user-controlled operators
const query = { [req.body.field]: req.body.value }; // ❌ NoSQL injection

// NEVER use eval() or Function()
eval(req.body.code); // ❌ Code injection
```

### 6.2 Database Access

#### ✅ DO
```typescript
// Use connection string from environment
mongoose.connect(process.env.MONGODB_URI);

// Use read-only connections where possible
const readOnlyConnection = mongoose.createConnection(uri, {
  readPreference: 'secondary'
});

// Implement connection retry logic
mongoose.connect(uri, {
  retryWrites: true,
  retryReads: true
});
```

#### ❌ DON'T
```typescript
// NEVER hardcode credentials
mongoose.connect('mongodb://admin:password123@localhost'); // ❌

// NEVER use overly permissive database users
// Database user should have minimum required permissions

// NEVER expose database errors to users
catch (err) {
  res.status(500).json({ error: err.message }); // ❌ Exposes DB structure
}
```

---

## 7. Error Handling

### 7.1 Error Responses

#### ✅ DO
```typescript
// Generic error messages for security
try {
  await authenticate(req);
} catch (err) {
  return res.status(401).json({
    error: 'Authentication failed'  // Generic message
  });
}

// Log detailed errors server-side
catch (err) {
  console.error('Auth error:', err); // Detailed log
  res.status(401).json({ error: 'Authentication failed' }); // Generic response
}

// Different errors for development vs production
const errorResponse = process.env.NODE_ENV === 'development'
  ? { error: err.message, stack: err.stack }
  : { error: 'Internal server error' };
```

#### ❌ DON'T
```typescript
// NEVER expose stack traces in production
catch (err) {
  res.status(500).json({
    error: err.message,
    stack: err.stack  // ❌ Exposes internal details
  });
}

// NEVER reveal system details
catch (err) {
  res.status(500).json({
    error: `Database query failed: ${err.message}` // ❌ Leaks DB info
  });
}

// NEVER use different messages for timing attacks
if (!user) {
  return res.json({ error: 'User not found' }); // ❌
}
if (!await bcrypt.compare(password, user.password)) {
  return res.json({ error: 'Invalid password' }); // ❌ Reveals username exists
}
```

---

## 8. File Upload Security

### 8.1 File Validation

#### ✅ DO
```typescript
import { validateImageUpload } from './middleware/uploadSecurity';

// Validate file type using magic numbers
router.post('/upload', validateImageUpload, uploadHandler);

// Enforce file size limits
const upload = multer({
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB
});

// Generate secure filenames
const secureFilename = crypto.randomBytes(16).toString('hex') + path.extname(file.originalname);
```

#### ❌ DON'T
```typescript
// NEVER trust file extensions
if (filename.endsWith('.jpg')) { // ❌ Can be spoofed
  // Process as image
}

// NEVER store files with user-provided names
const filepath = path.join('/uploads', req.file.originalname); // ❌ Path traversal

// NEVER skip virus scanning
// Always scan uploaded files for malware
```

---

## 9. Session Management

### 9.1 Session Security

#### ✅ DO
```typescript
// Set secure session configuration
app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production', // HTTPS only
    httpOnly: true, // Prevent XSS
    sameSite: 'strict', // CSRF protection
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
  }
}));

// Implement session timeout
const SESSION_TIMEOUT = 30 * 60 * 1000; // 30 minutes
```

#### ❌ DON'T
```typescript
// NEVER use weak session secrets
app.use(session({ secret: 'secret' })); // ❌

// NEVER allow indefinite sessions
cookie: { maxAge: undefined } // ❌

// NEVER store sensitive data in sessions
req.session.password = password; // ❌
```

---

## 10. Logging & Monitoring

### 10.1 Security Logging

#### ✅ DO
```typescript
// Log security events
logger.security('Failed login attempt', {
  ip: req.ip,
  username: req.body.username,
  timestamp: new Date()
});

// Log authentication events
logger.info('User authenticated', {
  userId: user.id,
  ip: req.ip,
  userAgent: req.get('user-agent')
});

// Use structured logging
logger.error('Database error', {
  error: err.message,
  query: queryType,
  userId: req.userId
});
```

#### ❌ DON'T
```typescript
// NEVER log sensitive data
console.log('Login:', { password, creditCard }); // ❌

// NEVER log without context
console.log('Error occurred'); // ❌ No details

// NEVER ignore logging in production
if (process.env.NODE_ENV !== 'production') {
  console.log('Debug info'); // ❌ No production logs
}
```

---

## 11. Code Security

### 11.1 Dependencies

#### ✅ DO
```bash
# Regularly update dependencies
npm update

# Audit dependencies
npm audit

# Fix vulnerabilities
npm audit fix

# Use exact versions in production
npm install --save-exact package@1.2.3
```

#### ❌ DON'T
```bash
# NEVER use outdated packages
# Check for security updates regularly

# NEVER ignore audit warnings
# npm audit fix --force (without review) ❌

# NEVER use packages without verification
# Verify package authenticity and reputation
```

### 11.2 Code Practices

#### ✅ DO
```typescript
// Use TypeScript for type safety
interface User {
  id: string;
  email: string;
}

// Validate environment variables on startup
if (!process.env.JWT_SECRET) {
  throw new Error('JWT_SECRET is required');
}

// Use try-catch for async operations
try {
  const result = await riskyOperation();
} catch (err) {
  logger.error('Operation failed', err);
}
```

#### ❌ DON'T
```typescript
// NEVER use eval()
eval(req.body.code); // ❌ Code injection

// NEVER use Function() constructor
const fn = new Function(req.body.code); // ❌

// NEVER disable TypeScript checks
// @ts-ignore  ❌ (unless absolutely necessary)
```

---

## 12. Deployment Security

### 12.1 Production Checklist

#### ✅ DO
- [ ] All environment variables set
- [ ] HTTPS enforced
- [ ] Rate limiting enabled
- [ ] CORS whitelist configured
- [ ] Debug mode disabled
- [ ] Error details hidden
- [ ] Audit logging enabled
- [ ] Monitoring configured
- [ ] Backups automated
- [ ] Secrets rotated

#### ❌ DON'T
- [ ] Default credentials in use
- [ ] Debug mode enabled
- [ ] All origins allowed (CORS: *)
- [ ] Detailed errors exposed
- [ ] Rate limiting disabled
- [ ] Weak JWT secrets
- [ ] No HTTPS
- [ ] No monitoring

### 12.2 Environment Variables

#### ✅ DO
```bash
# Use strong, unique secrets
JWT_SECRET=$(openssl rand -base64 32)

# Use different secrets per environment
JWT_SECRET_DEV=...
JWT_SECRET_PROD=...

# Validate on startup
npm run validate-env
```

#### ❌ DON'T
```bash
# NEVER commit .env files
git add .env  # ❌

# NEVER use default values in production
JWT_SECRET=your-secret-here  # ❌

# NEVER share secrets between environments
# Use separate secrets for dev, staging, prod
```

---

## Security Checklist

Use this checklist for every new feature:

### Development
- [ ] Input validation implemented
- [ ] Input sanitization applied
- [ ] Authentication required (if needed)
- [ ] Authorization checked
- [ ] Sensitive data encrypted
- [ ] Error handling implemented
- [ ] Logging added
- [ ] Rate limiting considered

### Code Review
- [ ] No hardcoded secrets
- [ ] No SQL/NoSQL injection
- [ ] No XSS vulnerabilities
- [ ] No CSRF vulnerabilities
- [ ] No sensitive data in logs
- [ ] Proper error handling
- [ ] Type safety maintained

### Testing
- [ ] Security tests written
- [ ] Input validation tested
- [ ] Authentication tested
- [ ] Authorization tested
- [ ] Error cases tested
- [ ] npm audit clean

### Deployment
- [ ] Environment variables set
- [ ] HTTPS enforced
- [ ] Monitoring configured
- [ ] Backup tested
- [ ] Rollback plan ready

---

## Quick Reference

### Common Security Middleware Stack
```typescript
import helmet from 'helmet';
import { corsMiddleware } from './middleware/corsConfig';
import { sanitizeRequest } from './middleware/sanitization';
import { generalLimiter } from './middleware/rateLimiter';
import { ipBlocker } from './middleware/ipBlocker';

app.use(helmet());
app.use(corsMiddleware);
app.use(express.json({ limit: '1mb' }));
app.use(sanitizeRequest);
app.use(generalLimiter);
app.use(ipBlocker);
```

### Secure Route Template
```typescript
import { authenticate } from './middleware/auth';
import { validateBody } from './middleware/validationMiddleware';
import { rateLimiter } from './middleware/rateLimiter';

router.post('/resource',
  rateLimiter,
  authenticate,
  validateBody(resourceSchema),
  async (req, res) => {
    try {
      // Verify ownership
      const resource = await Resource.findById(req.params.id);
      if (resource.userId.toString() !== req.userId) {
        return res.status(403).json({ error: 'Access denied' });
      }

      // Business logic
      const result = await processResource(resource);

      // Success response
      res.json({ success: true, data: result });
    } catch (err) {
      logger.error('Resource processing failed', err);
      res.status(500).json({ error: 'Operation failed' });
    }
  }
);
```

---

## Additional Resources

- **OWASP Top 10:** https://owasp.org/www-project-top-ten/
- **OWASP Cheat Sheets:** https://cheatsheetseries.owasp.org/
- **Node.js Security Best Practices:** https://nodejs.org/en/docs/guides/security/
- **Express Security:** https://expressjs.com/en/advanced/best-practice-security.html

---

**Document Version:** 1.0
**Last Updated:** November 17, 2025
**Maintainer:** Security Team
**Review Schedule:** Quarterly
