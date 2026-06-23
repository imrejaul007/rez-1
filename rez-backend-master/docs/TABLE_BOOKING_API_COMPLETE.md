# Table Booking API - Implementation Complete

## Overview
Complete backend API for restaurant table bookings has been successfully implemented in the user-backend directory.

## Files Created

### 1. TableBooking Model
**Path:** `src/models/TableBooking.ts`

**Features:**
- Auto-generated booking number (format: TB-TIMESTAMP-RANDOM)
- Fields: bookingNumber, storeId, userId, bookingDate, bookingTime, partySize, customerName, customerPhone, customerEmail, specialRequests, status
- Status enum: pending, confirmed, completed, cancelled
- Timestamps: createdAt, updatedAt
- Virtual field: formattedDateTime (formatted booking date/time display)
- Indexes on: storeId, userId, bookingDate, status, bookingNumber

**Instance Methods:**
- `updateStatus(newStatus)` - Update booking status

**Static Methods:**
- `findByBookingNumber(bookingNumber)` - Find booking by number
- `findStoreBookings(storeId, date?)` - Get store's bookings (optionally filtered by date)
- `findUserBookings(userId)` - Get user's bookings

**Validation:**
- Time format: HH:MM (24-hour)
- Phone number: Valid format
- Email: Valid format (optional)
- Party size: 1-50
- Customer name: Max 100 characters
- Special requests: Max 500 characters

### 2. TableBooking Controller
**Path:** `src/controllers/tableBookingController.ts`

**Functions:**
- `createTableBooking(req, res)` - Create new table booking
  - Validates store exists
  - Validates booking date is not in past
  - Validates party size (1-50)
  - Auto-generates booking number
  - Returns populated booking with store and user details

- `getUserTableBookings(req, res)` - Get user's bookings
  - Supports filtering by status
  - Pagination support (page, limit)
  - Sorted by booking date (descending)

- `getTableBooking(req, res)` - Get booking by ID
  - User can only view their own bookings
  - Populated with store and user details

- `getStoreTableBookings(req, res)` - Get store's bookings (for store owners)
  - Supports filtering by date and status
  - Pagination support
  - Sorted by booking date and time (ascending)

- `cancelTableBooking(req, res)` - Cancel booking
  - User can only cancel their own bookings
  - Cannot cancel already cancelled or completed bookings
  - Updates status to 'cancelled'

- `checkAvailability(req, res)` - Check available time slots for a date
  - Public endpoint (no authentication required)
  - Returns time slots from 9 AM to 10 PM
  - Shows remaining capacity per time slot
  - Assumes max capacity of 100 people per slot

**Error Handling:**
- All functions use try-catch with detailed logging
- Returns appropriate HTTP status codes
- Uses sendSuccess, sendCreated, sendError, sendNotFound, sendBadRequest from utils/response

### 3. TableBooking Routes
**Path:** `src/routes/tableBookingRoutes.ts`

**Public Routes:**
- `GET /api/table-bookings/availability/:storeId` - Check availability (query: date)

**Protected Routes (require authentication):**
- `POST /api/table-bookings` - Create booking
- `GET /api/table-bookings/user` - Get user's bookings (query: status, page, limit)
- `GET /api/table-bookings/:bookingId` - Get booking details
- `GET /api/table-bookings/store/:storeId` - Get store bookings (query: date, status, page, limit)
- `PUT /api/table-bookings/:bookingId/cancel` - Cancel booking

### 4. Server Configuration
**Path:** `src/server.ts`

**Changes Made:**
1. Imported tableBookingRoutes
2. Registered routes at `/api/table-bookings`
3. Added console log: "✅ Table booking routes registered at /api/table-bookings"
4. Updated health check endpoint to include tableBookings
5. Updated totalEndpoints count: 145 → 151
6. Updated modules count: 15 → 16

## API Endpoints Summary

### Base URL: `/api/table-bookings`

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/` | Required | Create new booking |
| GET | `/user` | Required | Get user's bookings |
| GET | `/:bookingId` | Required | Get booking details |
| GET | `/store/:storeId` | Required | Get store bookings |
| PUT | `/:bookingId/cancel` | Required | Cancel booking |
| GET | `/availability/:storeId` | Public | Check availability |

## Request/Response Examples

### Create Booking
```http
POST /api/table-bookings
Authorization: Bearer <token>
Content-Type: application/json

{
  "storeId": "64f7a8b9c1234567890abcde",
  "bookingDate": "2025-11-15",
  "bookingTime": "19:00",
  "partySize": 4,
  "customerName": "John Doe",
  "customerPhone": "+919876543210",
  "customerEmail": "john@example.com",
  "specialRequests": "Window seat preferred"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Table booking created successfully",
  "data": {
    "_id": "64f7a8b9c1234567890abcdf",
    "bookingNumber": "TB-1699876543210-1234",
    "storeId": {
      "_id": "64f7a8b9c1234567890abcde",
      "name": "The Great Restaurant",
      "logo": "https://example.com/logo.png",
      "location": {...},
      "contact": {...}
    },
    "userId": {
      "_id": "64f7a8b9c1234567890abce0",
      "profile": {
        "firstName": "John",
        "lastName": "Doe"
      },
      "phoneNumber": "+919876543210",
      "email": "john@example.com"
    },
    "bookingDate": "2025-11-15T00:00:00.000Z",
    "bookingTime": "19:00",
    "partySize": 4,
    "customerName": "John Doe",
    "customerPhone": "+919876543210",
    "customerEmail": "john@example.com",
    "specialRequests": "Window seat preferred",
    "status": "pending",
    "createdAt": "2025-11-13T10:30:00.000Z",
    "updatedAt": "2025-11-13T10:30:00.000Z"
  }
}
```

### Get User's Bookings
```http
GET /api/table-bookings/user?status=pending&page=1&limit=10
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "message": "Bookings retrieved successfully",
  "data": {
    "bookings": [...],
    "pagination": {
      "page": 1,
      "limit": 10,
      "total": 25,
      "totalPages": 3,
      "hasNext": true,
      "hasPrev": false
    }
  }
}
```

### Check Availability
```http
GET /api/table-bookings/availability/64f7a8b9c1234567890abcde?date=2025-11-15
```

**Response:**
```json
{
  "success": true,
  "message": "Availability checked successfully",
  "data": {
    "date": "2025-11-15T00:00:00.000Z",
    "storeId": "64f7a8b9c1234567890abcde",
    "storeName": "The Great Restaurant",
    "timeSlots": [
      {
        "time": "09:00",
        "available": true,
        "remainingCapacity": 100,
        "bookingsCount": 0
      },
      {
        "time": "19:00",
        "available": true,
        "remainingCapacity": 84,
        "bookingsCount": 4
      },
      ...
    ],
    "totalBookings": 12
  }
}
```

### Cancel Booking
```http
PUT /api/table-bookings/64f7a8b9c1234567890abcdf/cancel
Authorization: Bearer <token>
Content-Type: application/json

{
  "reason": "Change of plans"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Booking cancelled successfully",
  "data": {
    "_id": "64f7a8b9c1234567890abcdf",
    "bookingNumber": "TB-1699876543210-1234",
    "status": "cancelled",
    ...
  }
}
```

## Database Schema

```typescript
{
  bookingNumber: String (unique, auto-generated),
  storeId: ObjectId (ref: 'Store', indexed),
  userId: ObjectId (ref: 'User', indexed),
  bookingDate: Date (indexed),
  bookingTime: String (HH:MM format),
  partySize: Number (1-50),
  customerName: String (max 100 chars),
  customerPhone: String (validated),
  customerEmail: String (optional, validated),
  specialRequests: String (max 500 chars),
  status: Enum ['pending', 'confirmed', 'completed', 'cancelled'] (indexed),
  createdAt: Date (auto),
  updatedAt: Date (auto)
}
```

## Code Patterns Used

1. **Mongoose Models** - TypeScript interfaces and schemas
2. **Response Helpers** - sendSuccess, sendError, sendCreated, sendNotFound, sendBadRequest
3. **Authentication** - authenticate middleware from middleware/auth
4. **Error Handling** - Try-catch blocks with detailed logging
5. **Validation** - Schema-level validation and runtime checks
6. **Population** - Mongoose populate for related data
7. **Pagination** - Standard pagination with page, limit, total, hasNext, hasPrev
8. **Logging** - Console logs with emoji prefixes for debugging

## Testing Checklist

- [ ] Create booking with valid data
- [ ] Create booking with invalid store ID
- [ ] Create booking with past date
- [ ] Create booking with invalid party size
- [ ] Get user's bookings with pagination
- [ ] Get user's bookings filtered by status
- [ ] Get booking by ID
- [ ] Get booking by ID (unauthorized user)
- [ ] Get store bookings with date filter
- [ ] Get store bookings with status filter
- [ ] Cancel pending booking
- [ ] Cancel confirmed booking
- [ ] Cancel already cancelled booking
- [ ] Cancel completed booking
- [ ] Check availability for future date
- [ ] Check availability for date with existing bookings

## Next Steps

1. **Testing**: Test all endpoints with Postman or similar tool
2. **Frontend Integration**: Update frontend to use these endpoints
3. **Notifications**: Add email/SMS notifications for booking confirmations
4. **Store Owner Features**: Add store owner dashboard for managing bookings
5. **Calendar View**: Implement calendar view for bookings
6. **Capacity Management**: Add store-specific capacity configuration
7. **Time Slot Management**: Add custom time slots per store
8. **Booking Confirmation**: Add auto-confirmation or manual confirmation flow
9. **Reminder System**: Add booking reminders before scheduled time
10. **Analytics**: Add booking analytics for stores

## Dependencies

- mongoose (MongoDB ODM)
- express (Web framework)
- TypeScript
- Authentication middleware
- Response utility functions

## Status: ✅ COMPLETE

All files have been created and routes have been successfully registered in server.ts.

---

**Implementation Date:** November 13, 2025
**Developer:** Claude Code Assistant
**Backend Path:** `C:\Users\Mukul raj\Downloads\rez-new\rez-app\user-backend`
