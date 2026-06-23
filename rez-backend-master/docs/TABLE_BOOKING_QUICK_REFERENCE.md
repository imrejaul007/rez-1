# Table Booking API - Quick Reference

## API Endpoints

### Base URL: `http://localhost:5001/api/table-bookings`

### 1. Create Booking
```
POST /api/table-bookings
Authorization: Bearer <token>

Body:
{
  "storeId": "store_id_here",
  "bookingDate": "2025-11-15",
  "bookingTime": "19:00",
  "partySize": 4,
  "customerName": "John Doe",
  "customerPhone": "+919876543210",
  "customerEmail": "john@example.com",
  "specialRequests": "Window seat"
}
```

### 2. Get User's Bookings
```
GET /api/table-bookings/user?status=pending&page=1&limit=10
Authorization: Bearer <token>
```

### 3. Get Booking Details
```
GET /api/table-bookings/:bookingId
Authorization: Bearer <token>
```

### 4. Get Store Bookings
```
GET /api/table-bookings/store/:storeId?date=2025-11-15&status=confirmed
Authorization: Bearer <token>
```

### 5. Cancel Booking
```
PUT /api/table-bookings/:bookingId/cancel
Authorization: Bearer <token>

Body:
{
  "reason": "Change of plans"
}
```

### 6. Check Availability (Public)
```
GET /api/table-bookings/availability/:storeId?date=2025-11-15
No authentication required
```

## Status Values
- `pending` - Booking created, awaiting confirmation
- `confirmed` - Booking confirmed by restaurant
- `completed` - Customer showed up and completed booking
- `cancelled` - Booking cancelled

## Booking Number Format
`TB-TIMESTAMP-RANDOM`
Example: `TB-1699876543210-1234`

## Validation Rules
- Party size: 1-50 people
- Booking time: HH:MM format (24-hour)
- Phone: Valid format (e.g., +919876543210)
- Email: Valid email (optional)
- Booking date: Cannot be in the past
- Special requests: Max 500 characters
- Customer name: Max 100 characters

## Time Slots
Available time slots: 9:00 AM to 10:00 PM (hourly)
Default max capacity: 100 people per slot

## Error Codes
- `200` - Success
- `201` - Created
- `400` - Bad Request (validation error)
- `401` - Unauthorized (no token)
- `404` - Not Found (store/booking not found)
- `500` - Server Error

## Common Error Messages
- "All required fields must be provided"
- "Store not found"
- "Booking date cannot be in the past"
- "Party size must be between 1 and 50"
- "Booking not found"
- "Booking is already cancelled"
- "Cannot cancel a completed booking"

## Testing with cURL

### Create Booking
```bash
curl -X POST http://localhost:5001/api/table-bookings \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "storeId": "64f7a8b9c1234567890abcde",
    "bookingDate": "2025-11-15",
    "bookingTime": "19:00",
    "partySize": 4,
    "customerName": "John Doe",
    "customerPhone": "+919876543210",
    "customerEmail": "john@example.com"
  }'
```

### Check Availability
```bash
curl http://localhost:5001/api/table-bookings/availability/64f7a8b9c1234567890abcde?date=2025-11-15
```

### Get User Bookings
```bash
curl http://localhost:5001/api/table-bookings/user?page=1&limit=10 \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Cancel Booking
```bash
curl -X PUT http://localhost:5001/api/table-bookings/BOOKING_ID/cancel \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"reason": "Change of plans"}'
```

## Model Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| bookingNumber | String | Auto | Unique booking identifier |
| storeId | ObjectId | Yes | Restaurant/store ID |
| userId | ObjectId | Auto | User making the booking |
| bookingDate | Date | Yes | Date of reservation |
| bookingTime | String | Yes | Time in HH:MM format |
| partySize | Number | Yes | Number of people (1-50) |
| customerName | String | Yes | Customer name |
| customerPhone | String | Yes | Customer phone |
| customerEmail | String | No | Customer email |
| specialRequests | String | No | Additional requests |
| status | Enum | Auto | Booking status |
| createdAt | Date | Auto | Creation timestamp |
| updatedAt | Date | Auto | Last update timestamp |

## Integration Notes

### Frontend Integration
1. Fetch stores from `/api/stores`
2. Check availability for selected date
3. Create booking with user details
4. Display booking confirmation with booking number
5. Show user's bookings in account section
6. Allow cancellation before booking date

### Store Owner Dashboard
1. Fetch store bookings for today: `GET /api/table-bookings/store/:storeId?date=TODAY`
2. Update booking status via custom endpoint (to be implemented)
3. View all upcoming bookings
4. View booking history

## Files Location
- Model: `src/models/TableBooking.ts`
- Controller: `src/controllers/tableBookingController.ts`
- Routes: `src/routes/tableBookingRoutes.ts`
- Server Config: `src/server.ts` (line 90, 430-431)

## Health Check
Verify API is running:
```bash
curl http://localhost:5001/health
```

Should include `tableBookings: "/api/table-bookings"` in the response.

---

**Quick Start:** All files created and routes registered. Ready for testing!
